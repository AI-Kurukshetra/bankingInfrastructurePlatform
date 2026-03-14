-- Phase 3 account management module: provisioning requests, lifecycle events,
-- and balance snapshots for UI-friendly reads.

create type public.account_provisioning_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

alter table public.bank_accounts
  add column if not exists onboarding_application_id uuid references public.onboarding_applications (id) on delete set null,
  add column if not exists synctera_account_id text;

create unique index if not exists bank_accounts_onboarding_application_unique
  on public.bank_accounts (onboarding_application_id)
  where onboarding_application_id is not null;

create unique index if not exists bank_accounts_synctera_account_unique
  on public.bank_accounts (synctera_account_id)
  where synctera_account_id is not null;

create table if not exists public.account_provisioning_requests (
  id                        uuid primary key default gen_random_uuid(),
  onboarding_application_id uuid not null references public.onboarding_applications (id) on delete cascade,
  idempotency_key           text not null,
  requested_by              uuid not null references auth.users (id) on delete restrict,
  status                    public.account_provisioning_status not null default 'pending',
  account_id                uuid references public.bank_accounts (id) on delete set null,
  provider                  text not null default 'synctera_mock',
  provider_request          jsonb not null default '{}'::jsonb,
  provider_response         jsonb not null default '{}'::jsonb,
  error_message             text,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now()),
  unique (onboarding_application_id, idempotency_key)
);

create table if not exists public.account_lifecycle_events (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.bank_accounts (id) on delete cascade,
  event_type        text not null,
  previous_status   public.account_status,
  next_status       public.account_status,
  actor_user_id     uuid references auth.users (id) on delete set null,
  source            text not null default 'internal',
  details           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default timezone('utc', now())
);

create table if not exists public.account_balance_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.bank_accounts (id) on delete cascade,
  available_balance       numeric(14,2) not null,
  currency                text not null default 'USD',
  source_event_id         uuid references public.account_lifecycle_events (id) on delete set null,
  captured_by_user_id     uuid references auth.users (id) on delete set null,
  captured_at             timestamptz not null default timezone('utc', now())
);

create index if not exists account_provisioning_requests_onboarding_idx
  on public.account_provisioning_requests (onboarding_application_id, created_at desc);

create index if not exists account_provisioning_requests_status_idx
  on public.account_provisioning_requests (status);

create index if not exists account_lifecycle_events_account_idx
  on public.account_lifecycle_events (account_id, created_at desc);

create index if not exists account_balance_snapshots_account_idx
  on public.account_balance_snapshots (account_id, captured_at desc);

create trigger account_provisioning_requests_set_updated_at
  before update on public.account_provisioning_requests
  for each row execute function public.set_updated_at();

alter table public.account_provisioning_requests enable row level security;
alter table public.account_lifecycle_events enable row level security;
alter table public.account_balance_snapshots enable row level security;

create policy account_provisioning_requests_select on public.account_provisioning_requests
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or requested_by = auth.uid()
  );

create policy account_provisioning_requests_insert on public.account_provisioning_requests
  for insert
  with check (
    requested_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );

create policy account_provisioning_requests_update on public.account_provisioning_requests
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

create policy account_lifecycle_events_select on public.account_lifecycle_events
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts accounts
      where accounts.id = account_lifecycle_events.account_id
        and accounts.owner_user_id = auth.uid()
    )
  );

create policy account_lifecycle_events_insert on public.account_lifecycle_events
  for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

create policy account_balance_snapshots_select on public.account_balance_snapshots
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts accounts
      where accounts.id = account_balance_snapshots.account_id
        and accounts.owner_user_id = auth.uid()
    )
  );

create policy account_balance_snapshots_insert on public.account_balance_snapshots
  for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

