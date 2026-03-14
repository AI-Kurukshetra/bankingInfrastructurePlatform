-- Phase 3 cards module: virtual card issuance, controls, lifecycle events,
-- and card transaction feed records.

alter type public.card_status add value if not exists 'inactive';

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'card_form_factor'
  ) then
    create type public.card_form_factor as enum ('virtual', 'physical');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'card_issuance_status'
  ) then
    create type public.card_issuance_status as enum ('pending', 'processing', 'completed', 'failed');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'card_transaction_status'
  ) then
    create type public.card_transaction_status as enum ('authorized', 'posted', 'declined', 'reversed');
  end if;
end $$;

alter table public.cards
  add column if not exists provider_card_id text,
  add column if not exists form_factor public.card_form_factor not null default 'virtual',
  add column if not exists nickname text,
  add column if not exists cardholder_name text,
  add column if not exists network text not null default 'visa',
  add column if not exists spending_controls jsonb not null default '{}'::jsonb,
  add column if not exists issued_at timestamptz not null default timezone('utc', now()),
  add column if not exists activated_at timestamptz,
  add column if not exists frozen_at timestamptz,
  add column if not exists terminated_at timestamptz;

create unique index if not exists cards_provider_card_id_unique
  on public.cards (provider_card_id)
  where provider_card_id is not null;

create table if not exists public.card_issuance_requests (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.bank_accounts (id) on delete cascade,
  idempotency_key   text not null,
  requested_by      uuid not null references auth.users (id) on delete restrict,
  form_factor       public.card_form_factor not null default 'virtual',
  status            public.card_issuance_status not null default 'pending',
  card_id           uuid references public.cards (id) on delete set null,
  provider          text not null default 'synctera_mock',
  provider_request  jsonb not null default '{}'::jsonb,
  provider_response jsonb not null default '{}'::jsonb,
  error_message     text,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  unique (account_id, idempotency_key)
);

create table if not exists public.card_lifecycle_events (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references public.cards (id) on delete cascade,
  account_id       uuid not null references public.bank_accounts (id) on delete cascade,
  event_type       text not null,
  previous_status  public.card_status,
  next_status      public.card_status,
  actor_user_id    uuid references auth.users (id) on delete set null,
  source           text not null default 'internal',
  details          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default timezone('utc', now())
);

create table if not exists public.card_transaction_feed (
  id                      uuid primary key default gen_random_uuid(),
  card_id                 uuid not null references public.cards (id) on delete cascade,
  account_id              uuid not null references public.bank_accounts (id) on delete cascade,
  status                  public.card_transaction_status not null,
  amount                  numeric(14,2) not null,
  currency                text not null default 'USD',
  merchant_name           text,
  merchant_category_code  text,
  network_reference       text,
  metadata                jsonb not null default '{}'::jsonb,
  authorized_at           timestamptz,
  posted_at               timestamptz,
  created_at              timestamptz not null default timezone('utc', now())
);

create index if not exists card_issuance_requests_account_idx
  on public.card_issuance_requests (account_id, created_at desc);

create index if not exists card_issuance_requests_status_idx
  on public.card_issuance_requests (status);

create index if not exists card_lifecycle_events_card_idx
  on public.card_lifecycle_events (card_id, created_at desc);

create index if not exists card_transaction_feed_card_idx
  on public.card_transaction_feed (card_id, created_at desc);

create trigger card_issuance_requests_set_updated_at
  before update on public.card_issuance_requests
  for each row execute function public.set_updated_at();

alter table public.card_issuance_requests enable row level security;
alter table public.card_lifecycle_events enable row level security;
alter table public.card_transaction_feed enable row level security;

drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1
      from public.bank_accounts accounts
      where accounts.id = cards.account_id
        and (
          accounts.owner_user_id = auth.uid()
          or (
            accounts.organization_id is not null
            and exists (
              select 1
              from public.organization_memberships memberships
              where memberships.organization_id = accounts.organization_id
                and memberships.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy card_issuance_requests_select on public.card_issuance_requests
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or requested_by = auth.uid()
  );

create policy card_issuance_requests_insert on public.card_issuance_requests
  for insert
  with check (
    requested_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );

create policy card_issuance_requests_update on public.card_issuance_requests
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

create policy card_lifecycle_events_select on public.card_lifecycle_events
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1
      from public.bank_accounts accounts
      where accounts.id = card_lifecycle_events.account_id
        and (
          accounts.owner_user_id = auth.uid()
          or (
            accounts.organization_id is not null
            and exists (
              select 1
              from public.organization_memberships memberships
              where memberships.organization_id = accounts.organization_id
                and memberships.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy card_lifecycle_events_insert on public.card_lifecycle_events
  for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

create policy card_transaction_feed_select on public.card_transaction_feed
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1
      from public.bank_accounts accounts
      where accounts.id = card_transaction_feed.account_id
        and (
          accounts.owner_user_id = auth.uid()
          or (
            accounts.organization_id is not null
            and exists (
              select 1
              from public.organization_memberships memberships
              where memberships.organization_id = accounts.organization_id
                and memberships.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy card_transaction_feed_insert on public.card_transaction_feed
  for insert
  with check (public.current_user_role() in ('admin', 'analyst'));
