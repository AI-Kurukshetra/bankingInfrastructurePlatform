-- =============================================================================
-- Banking Infrastructure Platform — Full Schema
-- Run this in Supabase SQL Editor to create all tables, enums, functions,
-- triggers, RLS policies, and storage buckets from scratch.
-- Safe to run on a fresh project. All statements use IF NOT EXISTS guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('customer', 'analyst', 'admin', 'developer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'frozen', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_status as enum ('pending', 'processing', 'settled', 'failed', 'returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_rail as enum ('ach', 'internal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.card_status as enum ('active', 'frozen', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_severity as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_status as enum ('open', 'investigating', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.onboarding_type as enum ('consumer', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.onboarding_status as enum (
    'draft', 'submitted', 'in_review', 'approved', 'rejected', 'more_info_needed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum (
    'pending', 'processing', 'approved', 'rejected', 'manual_review', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum (
    'debit', 'credit', 'fee', 'reversal', 'adjustment'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_status as enum (
    'pending', 'processing', 'processed', 'failed', 'dead_letter'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.api_key_status as enum ('active', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum (
    'government_id', 'passport', 'drivers_license',
    'articles_of_incorporation', 'ein_letter',
    'bank_statement', 'proof_of_address', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum (
    'uploaded', 'under_review', 'accepted', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_provisioning_status as enum (
    'pending', 'processing', 'completed', 'failed'
  );
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 2. Shared functions
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'customer')
  )
  on conflict (id) do update
  set
    email      = excluded.email,
    full_name  = excluded.full_name,
    role       = excluded.role,
    updated_at = timezone('utc', now());
  return new;
exception when others then
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Core tables
-- ---------------------------------------------------------------------------

-- profiles ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique,
  full_name  text,
  role       public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- organizations ─────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- organization_memberships ──────────────────────────────────────────────────
create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            public.app_role not null default 'customer',
  created_at      timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

-- onboarding_applications ───────────────────────────────────────────────────
create table if not exists public.onboarding_applications (
  id                   uuid primary key default gen_random_uuid(),
  applicant_user_id    uuid not null references auth.users (id) on delete cascade,
  organization_id      uuid references public.organizations (id) on delete set null,
  type                 public.onboarding_type not null,
  status               public.onboarding_status not null default 'draft',
  synctera_person_id   text,
  synctera_business_id text,
  synctera_kyc_result  jsonb,
  form_data            jsonb not null default '{}'::jsonb,
  reviewed_by          uuid references auth.users (id) on delete set null,
  reviewed_at          timestamptz,
  review_notes         text,
  submitted_at         timestamptz,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

-- verification_checks ───────────────────────────────────────────────────────
create table if not exists public.verification_checks (
  id                        uuid primary key default gen_random_uuid(),
  onboarding_application_id uuid not null references public.onboarding_applications (id) on delete cascade,
  idempotency_key           text not null,
  provider                  text not null default 'synctera_mock',
  attempt_number            integer not null default 1,
  status                    public.verification_status not null default 'pending',
  decision_reason           text,
  sanctions_checks          jsonb not null default '[]'::jsonb,
  evidence_references       jsonb not null default '[]'::jsonb,
  provider_request          jsonb not null default '{}'::jsonb,
  provider_response         jsonb not null default '{}'::jsonb,
  error_message             text,
  requested_by              uuid not null references auth.users (id) on delete restrict,
  reviewed_by               uuid references auth.users (id) on delete set null,
  review_notes              text,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now()),
  unique (onboarding_application_id, idempotency_key)
);

-- bank_accounts ─────────────────────────────────────────────────────────────
create table if not exists public.bank_accounts (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid references public.organizations (id) on delete set null,
  owner_user_id             uuid references auth.users (id) on delete set null,
  onboarding_application_id uuid references public.onboarding_applications (id) on delete set null,
  account_name              text not null,
  account_number            text not null unique,
  status                    public.account_status not null default 'active',
  currency                  text not null default 'USD',
  available_balance         numeric(14,2) not null default 0,
  synctera_account_id       text,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now())
);

-- account_provisioning_requests ─────────────────────────────────────────────
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

-- account_lifecycle_events ──────────────────────────────────────────────────
create table if not exists public.account_lifecycle_events (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.bank_accounts (id) on delete cascade,
  event_type      text not null,
  previous_status public.account_status,
  next_status     public.account_status,
  actor_user_id   uuid references auth.users (id) on delete set null,
  source          text not null default 'internal',
  details         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default timezone('utc', now())
);

-- account_balance_snapshots ─────────────────────────────────────────────────
create table if not exists public.account_balance_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.bank_accounts (id) on delete cascade,
  available_balance   numeric(14,2) not null,
  currency            text not null default 'USD',
  source_event_id     uuid references public.account_lifecycle_events (id) on delete set null,
  captured_by_user_id uuid references auth.users (id) on delete set null,
  captured_at         timestamptz not null default timezone('utc', now())
);

-- cards ─────────────────────────────────────────────────────────────────────
create table if not exists public.cards (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.bank_accounts (id) on delete cascade,
  last4               text not null,
  status              public.card_status not null default 'active',
  spending_limit_cents integer,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

-- transfers ─────────────────────────────────────────────────────────────────
create table if not exists public.transfers (
  id                              uuid primary key default gen_random_uuid(),
  source_account_id               uuid references public.bank_accounts (id) on delete set null,
  destination_account_id          uuid references public.bank_accounts (id) on delete set null,
  rail                            public.transfer_rail not null default 'internal',
  amount                          numeric(14,2) not null,
  currency                        text not null default 'USD',
  status                          public.transfer_status not null default 'pending',
  memo                            text,
  idempotency_key                 text,
  provider                        text not null default 'internal',
  provider_transfer_id            text,
  provider_status                 text,
  failure_reason                  text,
  return_reason                   text,
  source_external_name            text,
  source_external_routing         text,
  source_external_account_mask    text,
  destination_external_name       text,
  destination_external_routing    text,
  destination_external_account_mask text,
  metadata                        jsonb not null default '{}'::jsonb,
  created_by                      uuid references auth.users (id) on delete set null,
  processing_at                   timestamptz,
  settled_at                      timestamptz,
  returned_at                     timestamptz,
  failed_at                       timestamptz,
  ledger_applied_at               timestamptz,
  reversal_applied_at             timestamptz,
  created_at                      timestamptz not null default timezone('utc', now()),
  updated_at                      timestamptz not null default timezone('utc', now())
);

-- transfer_events ───────────────────────────────────────────────────────────
create table if not exists public.transfer_events (
  id               uuid primary key default gen_random_uuid(),
  transfer_id      uuid not null references public.transfers (id) on delete cascade,
  event_type       text not null,
  previous_status  public.transfer_status,
  next_status      public.transfer_status,
  source           text not null default 'internal',
  provider_event_id text,
  actor_user_id    uuid references auth.users (id) on delete set null,
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default timezone('utc', now())
);

-- transactions ──────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  account_id              uuid not null references public.bank_accounts (id) on delete cascade,
  card_id                 uuid references public.cards (id) on delete set null,
  transfer_id             uuid references public.transfers (id) on delete set null,
  type                    public.transaction_type not null,
  amount                  numeric(14,2) not null,
  currency                text not null default 'USD',
  running_balance         numeric(14,2),
  description             text,
  merchant_name           text,
  merchant_category_code  text,
  synctera_transaction_id text unique,
  metadata                jsonb not null default '{}'::jsonb,
  posted_at               timestamptz,
  created_at              timestamptz not null default timezone('utc', now())
);

-- alerts ────────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references public.bank_accounts (id) on delete set null,
  transfer_id uuid references public.transfers (id) on delete set null,
  severity    public.alert_severity not null,
  title       text not null,
  description text,
  status      public.case_status not null default 'open',
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- cases ─────────────────────────────────────────────────────────────────────
create table if not exists public.cases (
  id               uuid primary key default gen_random_uuid(),
  alert_id         uuid not null references public.alerts (id) on delete cascade,
  assignee_user_id uuid references auth.users (id) on delete set null,
  status           public.case_status not null default 'open',
  resolution_notes text,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

-- webhook_events ────────────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,
  provider      text not null default 'synctera',
  event_type    text not null,
  status        public.webhook_status not null default 'pending',
  retry_count   integer not null default 0,
  max_retries   integer not null default 3,
  raw_payload   jsonb not null,
  last_error    text,
  last_error_at timestamptz,
  received_at   timestamptz not null default timezone('utc', now()),
  processed_at  timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

-- api_keys ──────────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by      uuid not null references auth.users (id) on delete restrict,
  name            text not null,
  key_hash        text not null unique,
  key_prefix      text not null,
  status          public.api_key_status not null default 'active',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

-- documents ─────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id                        uuid primary key default gen_random_uuid(),
  onboarding_application_id uuid references public.onboarding_applications (id) on delete cascade,
  uploaded_by               uuid not null references auth.users (id) on delete restrict,
  type                      public.document_type not null,
  status                    public.document_status not null default 'uploaded',
  storage_bucket            text not null,
  storage_path              text not null,
  file_name                 text not null,
  file_size_bytes           integer,
  mime_type                 text,
  reviewed_by               uuid references auth.users (id) on delete set null,
  reviewed_at               timestamptz,
  rejection_reason          text,
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now())
);

-- audit_logs ────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  request_id    text,
  before_state  jsonb,
  after_state   jsonb,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default timezone('utc', now())
);


-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
create unique index if not exists bank_accounts_onboarding_application_unique
  on public.bank_accounts (onboarding_application_id)
  where onboarding_application_id is not null;

create unique index if not exists bank_accounts_synctera_account_unique
  on public.bank_accounts (synctera_account_id)
  where synctera_account_id is not null;

create unique index if not exists transfers_created_by_idempotency_key_unique
  on public.transfers (created_by, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists transfers_provider_transfer_id_unique
  on public.transfers (provider_transfer_id)
  where provider_transfer_id is not null;

create unique index if not exists transfer_events_provider_event_id_unique
  on public.transfer_events (provider_event_id)
  where provider_event_id is not null;

create index if not exists onboarding_applications_applicant_idx
  on public.onboarding_applications (applicant_user_id);
create index if not exists onboarding_applications_status_idx
  on public.onboarding_applications (status);
create index if not exists verification_checks_onboarding_idx
  on public.verification_checks (onboarding_application_id, created_at desc);
create index if not exists verification_checks_status_idx
  on public.verification_checks (status);
create index if not exists account_provisioning_requests_onboarding_idx
  on public.account_provisioning_requests (onboarding_application_id, created_at desc);
create index if not exists account_provisioning_requests_status_idx
  on public.account_provisioning_requests (status);
create index if not exists account_lifecycle_events_account_idx
  on public.account_lifecycle_events (account_id, created_at desc);
create index if not exists account_balance_snapshots_account_idx
  on public.account_balance_snapshots (account_id, captured_at desc);
create index if not exists transactions_account_idx
  on public.transactions (account_id);
create index if not exists transactions_posted_at_idx
  on public.transactions (posted_at desc);
create index if not exists transfers_created_by_created_at_idx
  on public.transfers (created_by, created_at desc);
create index if not exists transfers_status_created_at_idx
  on public.transfers (status, created_at desc);
create index if not exists transfer_events_transfer_id_idx
  on public.transfer_events (transfer_id, created_at desc);
create index if not exists webhook_events_status_idx
  on public.webhook_events (status);
create index if not exists webhook_events_event_type_idx
  on public.webhook_events (event_type);
create index if not exists api_keys_organization_idx
  on public.api_keys (organization_id);
create index if not exists documents_onboarding_idx
  on public.documents (onboarding_application_id)
  where onboarding_application_id is not null;
create index if not exists documents_uploaded_by_idx
  on public.documents (uploaded_by);
create index if not exists audit_logs_request_id_idx
  on public.audit_logs (request_id)
  where request_id is not null;


-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------
-- updated_at auto-update triggers
do $$ begin
  create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger organizations_set_updated_at
    before update on public.organizations
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger bank_accounts_set_updated_at
    before update on public.bank_accounts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger account_provisioning_requests_set_updated_at
    before update on public.account_provisioning_requests
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger cards_set_updated_at
    before update on public.cards
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger transfers_set_updated_at
    before update on public.transfers
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger alerts_set_updated_at
    before update on public.alerts
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger cases_set_updated_at
    before update on public.cases
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger webhook_events_set_updated_at
    before update on public.webhook_events
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger api_keys_set_updated_at
    before update on public.api_keys
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger documents_set_updated_at
    before update on public.documents
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger onboarding_applications_set_updated_at
    before update on public.onboarding_applications
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger verification_checks_set_updated_at
    before update on public.verification_checks
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- Auto-create profile on new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 6. Row Level Security — enable on all tables
-- ---------------------------------------------------------------------------
alter table public.profiles                     enable row level security;
alter table public.organizations                enable row level security;
alter table public.organization_memberships     enable row level security;
alter table public.onboarding_applications      enable row level security;
alter table public.verification_checks          enable row level security;
alter table public.bank_accounts                enable row level security;
alter table public.account_provisioning_requests enable row level security;
alter table public.account_lifecycle_events     enable row level security;
alter table public.account_balance_snapshots    enable row level security;
alter table public.cards                        enable row level security;
alter table public.transfers                    enable row level security;
alter table public.transfer_events              enable row level security;
alter table public.transactions                 enable row level security;
alter table public.alerts                       enable row level security;
alter table public.cases                        enable row level security;
alter table public.webhook_events               enable row level security;
alter table public.api_keys                     enable row level security;
alter table public.documents                    enable row level security;
alter table public.audit_logs                   enable row level security;


-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------

-- profiles
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.current_user_role() in ('admin', 'analyst'));
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() or public.current_user_role() = 'admin');
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.current_user_role() = 'admin')
  with check (id = auth.uid() or public.current_user_role() = 'admin');

-- organizations
create policy org_select on public.organizations for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = id and m.user_id = auth.uid()
    )
  );
create policy org_insert on public.organizations for insert
  with check (created_by = auth.uid() or public.current_user_role() = 'admin');
create policy org_update on public.organizations for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- organization_memberships
create policy org_memberships_select on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.organization_memberships m2
      where m2.organization_id = organization_id and m2.user_id = auth.uid()
    )
  );
create policy org_memberships_manage on public.organization_memberships for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- onboarding_applications
create policy onboarding_select on public.onboarding_applications for select
  using (
    applicant_user_id = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );
create policy onboarding_insert on public.onboarding_applications for insert
  with check (applicant_user_id = auth.uid() or public.current_user_role() = 'admin');
create policy onboarding_update_staff on public.onboarding_applications for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));
create policy onboarding_update_applicant on public.onboarding_applications for update
  using (applicant_user_id = auth.uid())
  with check (
    applicant_user_id = auth.uid()
    and status in ('draft', 'submitted', 'more_info_needed')
    and reviewed_by is null
    and reviewed_at is null
  );

-- verification_checks
create policy verification_checks_select on public.verification_checks for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.onboarding_applications a
      where a.id = verification_checks.onboarding_application_id
        and a.applicant_user_id = auth.uid()
    )
  );
create policy verification_checks_insert on public.verification_checks for insert
  with check (
    requested_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );
create policy verification_checks_update_staff on public.verification_checks for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- bank_accounts
create policy bank_accounts_select on public.bank_accounts for select
  using (
    owner_user_id = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
    or (
      organization_id is not null
      and exists (
        select 1 from public.organization_memberships m
        where m.organization_id = bank_accounts.organization_id and m.user_id = auth.uid()
      )
    )
  );
create policy bank_accounts_manage on public.bank_accounts for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- account_provisioning_requests
create policy account_provisioning_requests_select on public.account_provisioning_requests for select
  using (public.current_user_role() in ('admin', 'analyst') or requested_by = auth.uid());
create policy account_provisioning_requests_insert on public.account_provisioning_requests for insert
  with check (requested_by = auth.uid() or public.current_user_role() in ('admin', 'analyst'));
create policy account_provisioning_requests_update on public.account_provisioning_requests for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- account_lifecycle_events
create policy account_lifecycle_events_select on public.account_lifecycle_events for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts a
      where a.id = account_lifecycle_events.account_id and a.owner_user_id = auth.uid()
    )
  );
create policy account_lifecycle_events_insert on public.account_lifecycle_events for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

-- account_balance_snapshots
create policy account_balance_snapshots_select on public.account_balance_snapshots for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts a
      where a.id = account_balance_snapshots.account_id and a.owner_user_id = auth.uid()
    )
  );
create policy account_balance_snapshots_insert on public.account_balance_snapshots for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

-- cards
create policy cards_select on public.cards for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts a
      where a.id = cards.account_id and a.owner_user_id = auth.uid()
    )
  );
create policy cards_manage on public.cards for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- transfers
create policy transfers_select on public.transfers for select
  using (
    created_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts sa
      where sa.id = transfers.source_account_id and sa.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.bank_accounts da
      where da.id = transfers.destination_account_id and da.owner_user_id = auth.uid()
    )
  );
create policy transfers_manage on public.transfers for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- transfer_events
create policy transfer_events_select on public.transfer_events for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.transfers t
      where t.id = transfer_events.transfer_id and t.created_by = auth.uid()
    )
  );
create policy transfer_events_insert on public.transfer_events for insert
  with check (public.current_user_role() in ('admin', 'analyst'));

-- transactions
create policy transactions_select on public.transactions for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts a
      where a.id = transactions.account_id and a.owner_user_id = auth.uid()
    )
  );
create policy transactions_manage on public.transactions for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- alerts
create policy alerts_select on public.alerts for select
  using (public.current_user_role() in ('admin', 'analyst'));
create policy alerts_manage on public.alerts for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- cases
create policy cases_select on public.cases for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or assignee_user_id = auth.uid()
  );
create policy cases_manage on public.cases for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- webhook_events
create policy webhook_events_select on public.webhook_events for select
  using (public.current_user_role() = 'admin');

-- api_keys
create policy api_keys_select on public.api_keys for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = api_keys.organization_id and m.user_id = auth.uid()
    )
  );
create policy api_keys_insert on public.api_keys for insert
  with check (
    created_by = auth.uid()
    and public.current_user_role() in ('admin', 'developer')
  );
create policy api_keys_update on public.api_keys for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- documents
create policy documents_select on public.documents for select
  using (
    uploaded_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );
create policy documents_insert on public.documents for insert
  with check (uploaded_by = auth.uid());
create policy documents_update on public.documents for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- audit_logs
create policy audit_logs_select on public.audit_logs for select
  using (public.current_user_role() in ('admin', 'analyst'));
create policy audit_logs_insert on public.audit_logs for insert
  with check (
    actor_user_id = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );


-- ---------------------------------------------------------------------------
-- 8. Storage buckets (idempotent)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('identity-documents', 'identity-documents', false),
  ('business-documents', 'business-documents', false)
on conflict (id) do nothing;

-- Storage policies for onboarding document uploads
drop policy if exists "onboarding_docs_insert" on storage.objects;
create policy "onboarding_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "onboarding_docs_select" on storage.objects;
create policy "onboarding_docs_select" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() in ('admin', 'analyst')
    )
  );

drop policy if exists "onboarding_docs_update" on storage.objects;
create policy "onboarding_docs_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "onboarding_docs_delete" on storage.objects;
create policy "onboarding_docs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================================
-- Done. Tables created:
--   profiles, organizations, organization_memberships,
--   onboarding_applications, verification_checks,
--   bank_accounts, account_provisioning_requests,
--   account_lifecycle_events, account_balance_snapshots,
--   cards, transfers, transfer_events, transactions,
--   alerts, cases, webhook_events, api_keys, documents, audit_logs
-- =============================================================================
