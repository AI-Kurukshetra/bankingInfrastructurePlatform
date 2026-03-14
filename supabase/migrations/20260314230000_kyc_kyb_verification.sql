-- Phase 2 KYC/KYB verification workflow table and policies.

do $$ begin
  create type public.verification_status as enum (
    'pending',
    'processing',
    'approved',
    'rejected',
    'manual_review',
    'failed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.verification_checks (
  id                          uuid primary key default gen_random_uuid(),
  onboarding_application_id   uuid not null references public.onboarding_applications (id) on delete cascade,
  idempotency_key             text not null,
  provider                    text not null default 'synctera_mock',
  attempt_number              integer not null default 1,
  status                      public.verification_status not null default 'pending',
  decision_reason             text,
  sanctions_checks            jsonb not null default '[]'::jsonb,
  evidence_references         jsonb not null default '[]'::jsonb,
  provider_request            jsonb not null default '{}'::jsonb,
  provider_response           jsonb not null default '{}'::jsonb,
  error_message               text,
  requested_by                uuid not null references auth.users (id) on delete restrict,
  reviewed_by                 uuid references auth.users (id) on delete set null,
  review_notes                text,
  created_at                  timestamptz not null default timezone('utc', now()),
  updated_at                  timestamptz not null default timezone('utc', now()),
  unique (onboarding_application_id, idempotency_key)
);

create index if not exists verification_checks_onboarding_idx
  on public.verification_checks (onboarding_application_id, created_at desc);

create index if not exists verification_checks_status_idx
  on public.verification_checks (status);

drop trigger if exists verification_checks_set_updated_at on public.verification_checks;
create trigger verification_checks_set_updated_at
  before update on public.verification_checks
  for each row execute function public.set_updated_at();

alter table public.verification_checks enable row level security;

drop policy if exists verification_checks_select on public.verification_checks;
create policy verification_checks_select on public.verification_checks
  for select
  using (
    public.current_user_role() in ('admin', 'analyst')
    or exists (
      select 1
      from public.onboarding_applications applications
      where applications.id = verification_checks.onboarding_application_id
        and applications.applicant_user_id = auth.uid()
    )
  );

drop policy if exists verification_checks_insert on public.verification_checks;
create policy verification_checks_insert on public.verification_checks
  for insert
  with check (
    requested_by = auth.uid()
    or public.current_user_role() in ('admin', 'analyst')
  );

drop policy if exists verification_checks_update_staff on public.verification_checks;
create policy verification_checks_update_staff on public.verification_checks
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));
