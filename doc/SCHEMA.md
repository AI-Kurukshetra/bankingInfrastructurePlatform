# Schema Notes

## 2026-03-14 12:42

### Migration
- `supabase/migrations/20260314124500_initial_auth_and_core.sql`

### Enums
- `app_role`: `customer`, `analyst`, `admin`, `developer`
- `account_status`: `active`, `frozen`, `closed`
- `transfer_status`: `pending`, `processing`, `settled`, `failed`
- `card_status`: `active`, `frozen`, `terminated`
- `alert_severity`: `low`, `medium`, `high`
- `case_status`: `open`, `investigating`, `resolved`, `closed`

### Tables
- `profiles` (`id` -> `auth.users.id`, email, role, timestamps)
- `organizations` (created_by -> `auth.users.id`)
- `organization_memberships` (composite PK `organization_id,user_id`)
- `bank_accounts` (owner/organization references, balance, status)
- `cards` (account reference, last4, spending limit, status)
- `transfers` (source/destination accounts, amount, status, creator)
- `alerts` (linked to accounts/transfers, severity, status)
- `cases` (linked to alerts, assignee, status)
- `audit_logs` (actor, action, entity metadata)

### Functions and Triggers
- `current_user_role()` helper function for RLS decisions
- `set_updated_at()` trigger function on mutable tables
- `handle_new_user()` trigger function to upsert `profiles` from `auth.users`
- Trigger `on_auth_user_created` on `auth.users`

### Row Level Security
RLS is enabled for all public tables above with role-aware policies:
- User self-access for profile/account/transfer level data
- Analyst/admin access for operations tables (alerts, cases, audit logs)
- Membership-based access for organization-scoped records

### Seeding
- Script: `scripts/seed-supabase.mjs`
- Requires: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Seeds demo users, organization, memberships, accounts, card, transfer, alert, case, and audit log.
