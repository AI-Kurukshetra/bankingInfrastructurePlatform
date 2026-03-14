-- Demo seed data for public.users and role-specific profile tables.
-- Safe to re-run because inserts use deterministic UUIDs and upserts.

begin;

create extension if not exists pgcrypto;

insert into public.users (
  id,
  name,
  email,
  password_hash,
  role,
  phone,
  status,
  created_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Demo Consumer',
    'consumer@example.com',
    crypt('Consumer#12345', gen_salt('bf')),
    'consumer',
    '+14155550101',
    'active',
    timestamp '2026-03-14 09:00:00'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Demo Business Owner',
    'business@example.com',
    crypt('Business#12345', gen_salt('bf')),
    'business',
    '+14155550102',
    'active',
    timestamp '2026-03-14 09:05:00'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Compliance Officer',
    'compliance@example.com',
    crypt('Compliance#12345', gen_salt('bf')),
    'compliance_analyst',
    '+14155550103',
    'active',
    timestamp '2026-03-14 09:10:00'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Platform Admin',
    'admin@example.com',
    crypt('Admin#12345', gen_salt('bf')),
    'admin',
    '+14155550104',
    'active',
    timestamp '2026-03-14 09:15:00'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'API Developer',
    'developer@example.com',
    crypt('Developer#12345', gen_salt('bf')),
    'developer_partner',
    '+14155550105',
    'active',
    timestamp '2026-03-14 09:20:00'
  )
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  role = excluded.role,
  phone = excluded.phone,
  status = excluded.status,
  created_at = excluded.created_at;

insert into public.consumer_profiles (
  id,
  user_id,
  date_of_birth,
  address,
  kyc_status,
  created_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  date '1992-04-18',
  '245 Market Street, San Francisco, CA 94105',
  'approved',
  timestamp '2026-03-14 10:00:00'
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  date_of_birth = excluded.date_of_birth,
  address = excluded.address,
  kyc_status = excluded.kyc_status,
  created_at = excluded.created_at;

insert into public.business_profiles (
  id,
  user_id,
  company_name,
  business_type,
  registration_number,
  kyb_status,
  created_at
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Demo Business LLC',
  'fintech_services',
  'REG-2026-0001',
  'pending',
  timestamp '2026-03-14 10:05:00'
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  company_name = excluded.company_name,
  business_type = excluded.business_type,
  registration_number = excluded.registration_number,
  kyb_status = excluded.kyb_status,
  created_at = excluded.created_at;

insert into public.developer_profiles (
  id,
  user_id,
  organization_name,
  api_key,
  sandbox_enabled,
  created_at
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '55555555-5555-4555-8555-555555555555',
  'API Developer Labs',
  'dev_partner_demo_key_2026',
  true,
  timestamp '2026-03-14 10:10:00'
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  organization_name = excluded.organization_name,
  api_key = excluded.api_key,
  sandbox_enabled = excluded.sandbox_enabled,
  created_at = excluded.created_at;

commit;
