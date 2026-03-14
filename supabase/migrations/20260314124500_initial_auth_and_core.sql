-- Supabase initial schema for authentication, operations, and demo workflows
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('customer', 'analyst', 'admin', 'developer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'frozen', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_status as enum ('pending', 'processing', 'settled', 'failed');
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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  owner_user_id uuid references auth.users (id) on delete set null,
  account_name text not null,
  account_number text not null unique,
  status public.account_status not null default 'active',
  currency text not null default 'USD',
  available_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_accounts (id) on delete cascade,
  last4 text not null,
  status public.card_status not null default 'active',
  spending_limit_cents integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  source_account_id uuid references public.bank_accounts (id) on delete set null,
  destination_account_id uuid references public.bank_accounts (id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  status public.transfer_status not null default 'pending',
  memo text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.bank_accounts (id) on delete set null,
  transfer_id uuid references public.transfers (id) on delete set null,
  severity public.alert_severity not null,
  title text not null,
  description text,
  status public.case_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete cascade,
  assignee_user_id uuid references auth.users (id) on delete set null,
  status public.case_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
before update on public.bank_accounts
for each row execute function public.set_updated_at();

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

drop trigger if exists transfers_set_updated_at on public.transfers;
create trigger transfers_set_updated_at
before update on public.transfers
for each row execute function public.set_updated_at();

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.cards enable row level security;
alter table public.transfers enable row level security;
alter table public.alerts enable row level security;
alter table public.cases enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select
using (id = auth.uid() or public.current_user_role() in ('admin', 'analyst'));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert
with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update
using (id = auth.uid() or public.current_user_role() = 'admin')
with check (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
for select
using (
  public.current_user_role() in ('admin', 'analyst')
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations
for insert
with check (created_by = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
for update
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists org_memberships_select on public.organization_memberships;
create policy org_memberships_select on public.organization_memberships
for select
using (
  user_id = auth.uid()
  or public.current_user_role() in ('admin', 'analyst')
  or exists (
    select 1
    from public.organization_memberships as my_membership
    where my_membership.organization_id = organization_id
      and my_membership.user_id = auth.uid()
  )
);

drop policy if exists org_memberships_manage on public.organization_memberships;
create policy org_memberships_manage on public.organization_memberships
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists bank_accounts_select on public.bank_accounts;
create policy bank_accounts_select on public.bank_accounts
for select
using (
  owner_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'analyst')
  or (
    organization_id is not null
    and exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = bank_accounts.organization_id
        and memberships.user_id = auth.uid()
    )
  )
);

drop policy if exists bank_accounts_manage on public.bank_accounts;
create policy bank_accounts_manage on public.bank_accounts
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
for select
using (
  public.current_user_role() in ('admin', 'analyst')
  or exists (
    select 1
    from public.bank_accounts accounts
    where accounts.id = cards.account_id
      and accounts.owner_user_id = auth.uid()
  )
);

drop policy if exists cards_manage on public.cards;
create policy cards_manage on public.cards
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists transfers_select on public.transfers;
create policy transfers_select on public.transfers
for select
using (
  created_by = auth.uid()
  or public.current_user_role() in ('admin', 'analyst')
  or exists (
    select 1
    from public.bank_accounts source_accounts
    where source_accounts.id = transfers.source_account_id
      and source_accounts.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.bank_accounts destination_accounts
    where destination_accounts.id = transfers.destination_account_id
      and destination_accounts.owner_user_id = auth.uid()
  )
);

drop policy if exists transfers_manage on public.transfers;
create policy transfers_manage on public.transfers
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
for select
using (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists alerts_manage on public.alerts;
create policy alerts_manage on public.alerts
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
for select
using (
  public.current_user_role() in ('admin', 'analyst')
  or assignee_user_id = auth.uid()
);

drop policy if exists cases_manage on public.cases;
create policy cases_manage on public.cases
for all
using (public.current_user_role() in ('admin', 'analyst'))
with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select
using (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
for insert
with check (
  actor_user_id = auth.uid()
  or public.current_user_role() in ('admin', 'analyst')
);
