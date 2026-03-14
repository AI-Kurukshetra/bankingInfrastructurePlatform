-- Extended schema: onboarding applications, transactions, webhook events,
-- API keys, documents, and audit log enhancements.
-- Depends on: 20260314124500_initial_auth_and_core.sql

-- ── New enums ──────────────────────────────────────────────────────────────────

create type public.onboarding_type as enum ('consumer', 'business');

create type public.onboarding_status as enum (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'more_info_needed'
);

create type public.transaction_type as enum (
  'debit',
  'credit',
  'fee',
  'reversal',
  'adjustment'
);

create type public.webhook_status as enum (
  'pending',
  'processing',
  'processed',
  'failed',
  'dead_letter'
);

create type public.api_key_status as enum ('active', 'revoked');

create type public.document_type as enum (
  'government_id',
  'passport',
  'drivers_license',
  'articles_of_incorporation',
  'ein_letter',
  'bank_statement',
  'proof_of_address',
  'other'
);

create type public.document_status as enum (
  'uploaded',
  'under_review',
  'accepted',
  'rejected'
);

-- ── onboarding_applications ────────────────────────────────────────────────────

create table public.onboarding_applications (
  id                    uuid        primary key default gen_random_uuid(),
  applicant_user_id     uuid        not null references auth.users (id) on delete cascade,
  organization_id       uuid        references public.organizations (id) on delete set null,
  type                  public.onboarding_type   not null,
  status                public.onboarding_status not null default 'draft',
  -- Synctera KYC/KYB provider references
  synctera_person_id    text,
  synctera_business_id  text,
  synctera_kyc_result   jsonb,
  -- Applicant form data (consumer profile or business profile fields)
  form_data             jsonb       not null default '{}',
  -- Review workflow
  reviewed_by           uuid        references auth.users (id) on delete set null,
  reviewed_at           timestamptz,
  review_notes          text,
  submitted_at          timestamptz,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now())
);

-- ── transactions ──────────────────────────────────────────────────────────────
-- Individual ledger entries on an account (card purchases, ACH credits, fees, etc.)
-- Transfers create transactions; cards create transactions independently.

create table public.transactions (
  id                       uuid        primary key default gen_random_uuid(),
  account_id               uuid        not null references public.bank_accounts (id) on delete cascade,
  card_id                  uuid        references public.cards (id) on delete set null,
  transfer_id              uuid        references public.transfers (id) on delete set null,
  type                     public.transaction_type not null,
  amount                   numeric(14,2) not null,
  currency                 text        not null default 'USD',
  running_balance          numeric(14,2),
  description              text,
  merchant_name            text,
  merchant_category_code   text,
  -- External reference from Synctera; unique to prevent duplicate ingestion
  synctera_transaction_id  text        unique,
  metadata                 jsonb       not null default '{}',
  posted_at                timestamptz,
  created_at               timestamptz not null default timezone('utc', now())
);

-- ── webhook_events ─────────────────────────────────────────────────────────────
-- Inbound events from Synctera (and future providers).
-- event_id is the provider's own event identifier — used for idempotency.

create table public.webhook_events (
  id            uuid        primary key default gen_random_uuid(),
  event_id      text        not null unique,    -- provider event ID for deduplication
  provider      text        not null default 'synctera',
  event_type    text        not null,
  status        public.webhook_status not null default 'pending',
  retry_count   integer     not null default 0,
  max_retries   integer     not null default 3,
  raw_payload   jsonb       not null,
  last_error    text,
  last_error_at timestamptz,
  received_at   timestamptz not null default timezone('utc', now()),
  processed_at  timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

-- ── api_keys ──────────────────────────────────────────────────────────────────
-- Partner / developer API keys. Only the hash is stored; the full key is
-- shown to the user exactly once at creation time.

create table public.api_keys (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations (id) on delete cascade,
  created_by      uuid        not null references auth.users (id) on delete restrict,
  name            text        not null,
  key_hash        text        not null unique,   -- bcrypt or sha256 hash
  key_prefix      text        not null,          -- e.g. "fsk_live_abc1" shown in listings
  status          public.api_key_status not null default 'active',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

-- ── documents ─────────────────────────────────────────────────────────────────
-- Metadata for identity and business verification documents.
-- Actual file bytes are in Supabase storage buckets.

create table public.documents (
  id                          uuid        primary key default gen_random_uuid(),
  onboarding_application_id   uuid        references public.onboarding_applications (id) on delete cascade,
  uploaded_by                 uuid        not null references auth.users (id) on delete restrict,
  type                        public.document_type   not null,
  status                      public.document_status not null default 'uploaded',
  storage_bucket              text        not null,  -- 'identity-documents' | 'business-documents'
  storage_path                text        not null,  -- path within bucket
  file_name                   text        not null,
  file_size_bytes             integer,
  mime_type                   text,
  reviewed_by                 uuid        references auth.users (id) on delete set null,
  reviewed_at                 timestamptz,
  rejection_reason            text,
  created_at                  timestamptz not null default timezone('utc', now()),
  updated_at                  timestamptz not null default timezone('utc', now())
);

-- ── Audit log enhancements ────────────────────────────────────────────────────
-- Add request_id for tracing, and before/after state for change history.

alter table public.audit_logs
  add column if not exists request_id   text,
  add column if not exists before_state jsonb,
  add column if not exists after_state  jsonb;

-- Index request_id for trace-based lookups
create index if not exists audit_logs_request_id_idx on public.audit_logs (request_id)
  where request_id is not null;

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index onboarding_applications_applicant_idx
  on public.onboarding_applications (applicant_user_id);

create index onboarding_applications_status_idx
  on public.onboarding_applications (status);

create index transactions_account_idx
  on public.transactions (account_id);

create index transactions_posted_at_idx
  on public.transactions (posted_at desc);

create index webhook_events_status_idx
  on public.webhook_events (status);

create index webhook_events_event_type_idx
  on public.webhook_events (event_type);

create index api_keys_organization_idx
  on public.api_keys (organization_id);

create index documents_onboarding_idx
  on public.documents (onboarding_application_id)
  where onboarding_application_id is not null;

create index documents_uploaded_by_idx
  on public.documents (uploaded_by);

-- ── updated_at triggers ───────────────────────────────────────────────────────

create trigger onboarding_applications_set_updated_at
  before update on public.onboarding_applications
  for each row execute function public.set_updated_at();

create trigger webhook_events_set_updated_at
  before update on public.webhook_events
  for each row execute function public.set_updated_at();

create trigger api_keys_set_updated_at
  before update on public.api_keys
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.onboarding_applications enable row level security;
alter table public.transactions             enable row level security;
alter table public.webhook_events           enable row level security;
alter table public.api_keys                 enable row level security;
alter table public.documents                enable row level security;

-- onboarding_applications
-- Applicants read/draft their own applications; staff read all
create policy onboarding_select on public.onboarding_applications
  for select
  using (
    applicant_user_id = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );

create policy onboarding_insert on public.onboarding_applications
  for insert
  with check (
    applicant_user_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- Only staff can update status/review fields; the applicant cannot change status
create policy onboarding_update on public.onboarding_applications
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- transactions
-- Account owners read their own transactions; staff read all
create policy transactions_select on public.transactions
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1 from public.bank_accounts accounts
      where accounts.id = transactions.account_id
        and accounts.owner_user_id = auth.uid()
    )
  );

-- Transactions are system-written only; no direct customer insert/update
create policy transactions_manage on public.transactions
  for all
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

-- webhook_events
-- Admin-only visibility; insert/update handled via service role key in API routes
create policy webhook_events_select on public.webhook_events
  for select
  using (public.current_user_role() = 'admin');

-- api_keys
-- Members of the owning organization can see keys (prefix only); admin sees all
create policy api_keys_select on public.api_keys
  for select
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.organization_memberships m
      where m.organization_id = api_keys.organization_id
        and m.user_id = auth.uid()
    )
  );

-- Developers and admins within the organization can create keys
create policy api_keys_insert on public.api_keys
  for insert
  with check (
    created_by = auth.uid()
    and (
      public.current_user_role() in ('admin', 'developer')
      or exists (
        select 1 from public.organization_memberships m
        where m.organization_id = api_keys.organization_id
          and m.user_id = auth.uid()
          and m.role in ('admin', 'developer')
      )
    )
  );

-- Only admin can revoke (update status)
create policy api_keys_update on public.api_keys
  for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- documents
-- Uploaders read their own documents; staff read all
create policy documents_select on public.documents
  for select
  using (
    uploaded_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );

create policy documents_insert on public.documents
  for insert
  with check (uploaded_by = auth.uid());

-- Only staff can update review status
create policy documents_update on public.documents
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));
