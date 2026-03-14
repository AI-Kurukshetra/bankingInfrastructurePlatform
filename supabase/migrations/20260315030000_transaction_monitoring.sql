-- Phase 4 transaction monitoring: configurable rules, alert generation,
-- and analyst case-management timelines.

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'monitoring_source_type'
  ) then
    create type public.monitoring_source_type as enum (
      'payment_transfer',
      'account_transaction',
      'card_transaction'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'case_priority'
  ) then
    create type public.case_priority as enum ('low', 'medium', 'high');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'case_disposition'
  ) then
    create type public.case_disposition as enum (
      'pending_review',
      'monitor',
      'false_positive',
      'customer_outreach',
      'escalated',
      'suspicious_activity'
    );
  end if;
end $$;

create table if not exists public.monitoring_rules (
  id                  uuid primary key default gen_random_uuid(),
  rule_code           text not null unique,
  name                text not null,
  description         text,
  severity            public.alert_severity not null,
  source_types        public.monitoring_source_type[] not null default '{}'::public.monitoring_source_type[],
  is_active           boolean not null default true,
  config              jsonb not null default '{}'::jsonb,
  created_by_user_id  uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

alter table public.alerts
  add column if not exists rule_code text,
  add column if not exists source_type public.monitoring_source_type,
  add column if not exists source_record_id uuid,
  add column if not exists transaction_id uuid references public.transactions (id) on delete set null,
  add column if not exists card_id uuid references public.cards (id) on delete set null,
  add column if not exists dedup_key text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists escalated_at timestamptz,
  add column if not exists last_evaluated_at timestamptz;

alter table public.cases
  add column if not exists priority public.case_priority not null default 'medium',
  add column if not exists disposition public.case_disposition not null default 'pending_review',
  add column if not exists escalated_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default timezone('utc', now());

create table if not exists public.case_notes (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases (id) on delete cascade,
  author_user_id  uuid references auth.users (id) on delete set null,
  note            text not null,
  visibility      text not null default 'internal',
  created_at      timestamptz not null default timezone('utc', now())
);

create table if not exists public.case_events (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases (id) on delete cascade,
  event_type      text not null,
  title           text not null,
  details         jsonb not null default '{}'::jsonb,
  actor_user_id   uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default timezone('utc', now())
);

create unique index if not exists alerts_dedup_key_unique
  on public.alerts (dedup_key)
  where dedup_key is not null;

create index if not exists alerts_rule_code_created_at_idx
  on public.alerts (rule_code, created_at desc);

create index if not exists alerts_source_type_created_at_idx
  on public.alerts (source_type, created_at desc);

create unique index if not exists cases_alert_id_unique
  on public.cases (alert_id);

create index if not exists cases_assignee_status_idx
  on public.cases (assignee_user_id, status, updated_at desc);

create index if not exists monitoring_rules_active_idx
  on public.monitoring_rules (is_active, severity, created_at desc);

create index if not exists case_notes_case_id_created_at_idx
  on public.case_notes (case_id, created_at desc);

create index if not exists case_events_case_id_created_at_idx
  on public.case_events (case_id, created_at asc);

drop trigger if exists monitoring_rules_set_updated_at on public.monitoring_rules;
create trigger monitoring_rules_set_updated_at
before update on public.monitoring_rules
for each row execute function public.set_updated_at();

alter table public.monitoring_rules enable row level security;
alter table public.case_notes enable row level security;
alter table public.case_events enable row level security;

drop policy if exists monitoring_rules_select on public.monitoring_rules;
create policy monitoring_rules_select on public.monitoring_rules
  for select
  using (public.current_user_role() in ('admin', 'analyst', 'developer'));

drop policy if exists monitoring_rules_manage on public.monitoring_rules;
create policy monitoring_rules_manage on public.monitoring_rules
  for all
  using (public.current_user_role() in ('admin', 'developer'))
  with check (public.current_user_role() in ('admin', 'developer'));

drop policy if exists case_notes_select on public.case_notes;
create policy case_notes_select on public.case_notes
  for select
  using (public.current_user_role() in ('admin', 'analyst', 'developer'));

drop policy if exists case_notes_manage on public.case_notes;
create policy case_notes_manage on public.case_notes
  for all
  using (public.current_user_role() in ('admin', 'analyst', 'developer'))
  with check (public.current_user_role() in ('admin', 'analyst', 'developer'));

drop policy if exists case_events_select on public.case_events;
create policy case_events_select on public.case_events
  for select
  using (public.current_user_role() in ('admin', 'analyst', 'developer'));

drop policy if exists case_events_insert on public.case_events;
create policy case_events_insert on public.case_events
  for insert
  with check (public.current_user_role() in ('admin', 'analyst', 'developer'));

insert into public.monitoring_rules (
  rule_code,
  name,
  description,
  severity,
  source_types,
  config
)
values
  (
    'transfer_amount_threshold',
    'Large transfer threshold',
    'Flags transfers above the configured outbound amount threshold.',
    'high',
    array['payment_transfer']::public.monitoring_source_type[],
    jsonb_build_object('minAmount', 7500)
  ),
  (
    'account_transfer_velocity',
    'Outbound transfer velocity',
    'Flags accounts that exceed the configured count of outbound transfers inside the review window.',
    'medium',
    array['account_transaction']::public.monitoring_source_type[],
    jsonb_build_object('windowMinutes', 60, 'maxTransfers', 3, 'minAmount', 500)
  ),
  (
    'card_spend_anomaly',
    'Card spend anomaly',
    'Flags high-ticket or high-risk card activity for analyst review.',
    'high',
    array['card_transaction']::public.monitoring_source_type[],
    jsonb_build_object(
      'largeTicketAmount', 1500,
      'highRiskMccs', jsonb_build_array('4829', '5967', '6012', '7995'),
      'declineStatuses', jsonb_build_array('declined', 'reversed')
    )
  )
on conflict (rule_code) do update
set
  name = excluded.name,
  description = excluded.description,
  severity = excluded.severity,
  source_types = excluded.source_types,
  config = excluded.config,
  is_active = true,
  updated_at = timezone('utc', now());
