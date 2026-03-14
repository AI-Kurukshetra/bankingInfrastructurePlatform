-- Role-based access control user directory for Banking Infrastructure Platform.
-- This is intentionally isolated from Supabase auth.users and existing profiles.

create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null,
  phone text,
  status text not null,
  created_at timestamp without time zone not null default now(),
  constraint users_role_check check (
    role in (
      'consumer',
      'business',
      'compliance_analyst',
      'admin',
      'developer_partner'
    )
  ),
  constraint users_status_check check (
    status in ('active', 'pending', 'suspended')
  )
);

create unique index if not exists users_email_uidx
  on public.users (email);

create index if not exists users_role_idx
  on public.users (role);

create table if not exists public.consumer_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  date_of_birth date,
  address text,
  kyc_status text not null,
  created_at timestamp without time zone not null default now(),
  constraint consumer_profiles_kyc_status_check check (
    kyc_status in ('pending', 'approved', 'rejected')
  )
);

create unique index if not exists consumer_profiles_user_id_uidx
  on public.consumer_profiles (user_id);

create table if not exists public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  company_name text,
  business_type text,
  registration_number text,
  kyb_status text not null,
  created_at timestamp without time zone not null default now(),
  constraint business_profiles_kyb_status_check check (
    kyb_status in ('pending', 'approved', 'rejected')
  )
);

create unique index if not exists business_profiles_user_id_uidx
  on public.business_profiles (user_id);

create table if not exists public.developer_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  organization_name text,
  api_key text,
  sandbox_enabled boolean not null default true,
  created_at timestamp without time zone not null default now()
);

create unique index if not exists developer_profiles_user_id_uidx
  on public.developer_profiles (user_id);
