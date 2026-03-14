-- Phase 3 payments and transfers module: ACH transfers, internal transfers,
-- transfer reconciliation, and replay-safe status events.

alter type public.transfer_status add value if not exists 'returned';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'transfer_rail'
  ) then
    create type public.transfer_rail as enum ('ach', 'internal');
  end if;
end $$;

alter table public.transfers
  add column if not exists rail public.transfer_rail not null default 'internal',
  add column if not exists idempotency_key text,
  add column if not exists provider text not null default 'internal',
  add column if not exists provider_transfer_id text,
  add column if not exists provider_status text,
  add column if not exists failure_reason text,
  add column if not exists return_reason text,
  add column if not exists source_external_name text,
  add column if not exists source_external_routing text,
  add column if not exists source_external_account_mask text,
  add column if not exists destination_external_name text,
  add column if not exists destination_external_routing text,
  add column if not exists destination_external_account_mask text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists processing_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists ledger_applied_at timestamptz,
  add column if not exists reversal_applied_at timestamptz;

create unique index if not exists transfers_created_by_idempotency_key_unique
  on public.transfers (created_by, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists transfers_provider_transfer_id_unique
  on public.transfers (provider_transfer_id)
  where provider_transfer_id is not null;

create index if not exists transfers_created_by_created_at_idx
  on public.transfers (created_by, created_at desc);

create index if not exists transfers_status_created_at_idx
  on public.transfers (status, created_at desc);

create table if not exists public.transfer_events (
  id                 uuid primary key default gen_random_uuid(),
  transfer_id        uuid not null references public.transfers (id) on delete cascade,
  event_type         text not null,
  previous_status    public.transfer_status,
  next_status        public.transfer_status,
  source             text not null default 'internal',
  provider_event_id  text,
  actor_user_id      uuid references auth.users (id) on delete set null,
  payload            jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default timezone('utc', now())
);

create unique index if not exists transfer_events_provider_event_id_unique
  on public.transfer_events (provider_event_id)
  where provider_event_id is not null;

create index if not exists transfer_events_transfer_id_idx
  on public.transfer_events (transfer_id, created_at desc);

alter table public.transfer_events enable row level security;

create policy transfer_events_select on public.transfer_events
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1
      from public.transfers
      where transfers.id = transfer_events.transfer_id
        and (
          transfers.created_by = auth.uid()
          or exists (
            select 1
            from public.bank_accounts source_accounts
            where source_accounts.id = transfers.source_account_id
              and (
                source_accounts.owner_user_id = auth.uid()
                or (
                  source_accounts.organization_id is not null
                  and exists (
                    select 1
                    from public.organization_memberships memberships
                    where memberships.organization_id = source_accounts.organization_id
                      and memberships.user_id = auth.uid()
                  )
                )
              )
          )
          or exists (
            select 1
            from public.bank_accounts destination_accounts
            where destination_accounts.id = transfers.destination_account_id
              and (
                destination_accounts.owner_user_id = auth.uid()
                or (
                  destination_accounts.organization_id is not null
                  and exists (
                    select 1
                    from public.organization_memberships memberships
                    where memberships.organization_id = destination_accounts.organization_id
                      and memberships.user_id = auth.uid()
                  )
                )
              )
          )
        )
    )
  );

create policy transfer_events_insert on public.transfer_events
  for insert
  with check (public.current_user_role() in ('admin', 'analyst'));
