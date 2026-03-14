-- Example queries for fetching users by role.

-- All users for a single role.
select
  id,
  name,
  email,
  role,
  status,
  created_at
from public.users
where role = 'consumer'
order by created_at desc;

-- All active staff users.
select
  id,
  name,
  email,
  role
from public.users
where role in ('admin', 'compliance_analyst')
  and status = 'active'
order by role, name;

-- Consumers with their KYC profile data.
select
  u.id,
  u.name,
  u.email,
  u.status,
  cp.date_of_birth,
  cp.address,
  cp.kyc_status
from public.users as u
join public.consumer_profiles as cp
  on cp.user_id = u.id
where u.role = 'consumer';

-- Businesses with their KYB profile data.
select
  u.id,
  u.name,
  u.email,
  bp.company_name,
  bp.business_type,
  bp.registration_number,
  bp.kyb_status
from public.users as u
join public.business_profiles as bp
  on bp.user_id = u.id
where u.role = 'business';

-- Developer partners with sandbox access details.
select
  u.id,
  u.name,
  u.email,
  dp.organization_name,
  dp.api_key,
  dp.sandbox_enabled
from public.users as u
join public.developer_profiles as dp
  on dp.user_id = u.id
where u.role = 'developer_partner';
