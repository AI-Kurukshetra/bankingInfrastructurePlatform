# FinStack Database Schema

## Migrations

| File | Description |
|------|-------------|
| `20260314124500_initial_auth_and_core.sql` | Core tables, enums, RLS, auth trigger |
| `20260314210000_extended_schema.sql` | Onboarding, transactions, webhooks, API keys, documents, audit log enhancements |

---

## Enums

| Enum | Values |
|------|--------|
| `app_role` | `customer`, `analyst`, `admin`, `developer` |
| `account_status` | `active`, `frozen`, `closed` |
| `transfer_status` | `pending`, `processing`, `settled`, `failed` |
| `card_status` | `active`, `frozen`, `terminated` |
| `alert_severity` | `low`, `medium`, `high` |
| `case_status` | `open`, `investigating`, `resolved`, `closed` |
| `onboarding_type` | `consumer`, `business` |
| `onboarding_status` | `draft`, `submitted`, `in_review`, `approved`, `rejected`, `more_info_needed` |
| `transaction_type` | `debit`, `credit`, `fee`, `reversal`, `adjustment` |
| `webhook_status` | `pending`, `processing`, `processed`, `failed`, `dead_letter` |
| `api_key_status` | `active`, `revoked` |
| `document_type` | `government_id`, `passport`, `drivers_license`, `articles_of_incorporation`, `ein_letter`, `bank_statement`, `proof_of_address`, `other` |
| `document_status` | `uploaded`, `under_review`, `accepted`, `rejected` |

---

## Tables

### `profiles`
Mirrors `auth.users`. Auto-created via `handle_new_user()` trigger on signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | References `auth.users.id` |
| `email` | `text` unique | |
| `full_name` | `text` | |
| `role` | `app_role` | Default `customer` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `organizations`
A company or team that groups users and owns bank accounts / API keys.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `created_by` | `uuid` | References `auth.users.id` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `organization_memberships`
Links users to organizations with a role.

| Column | Type | Notes |
|--------|------|-------|
| `organization_id` | `uuid` | References `organizations.id` |
| `user_id` | `uuid` | References `auth.users.id` |
| `role` | `app_role` | Default `customer` |
| `created_at` | `timestamptz` | |

**Primary key:** `(organization_id, user_id)`

---

### `onboarding_applications`
KYC (consumer) or KYB (business) application submitted by a user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `applicant_user_id` | `uuid` | References `auth.users.id` |
| `organization_id` | `uuid` | Optional, for business applications |
| `type` | `onboarding_type` | `consumer` or `business` |
| `status` | `onboarding_status` | Default `draft` |
| `synctera_person_id` | `text` | Synctera person resource ID |
| `synctera_business_id` | `text` | Synctera business resource ID |
| `synctera_kyc_result` | `jsonb` | Raw KYC/KYB response |
| `form_data` | `jsonb` | Applicant-submitted fields |
| `reviewed_by` | `uuid` | Analyst/admin who reviewed |
| `reviewed_at` | `timestamptz` | |
| `review_notes` | `text` | Internal notes |
| `submitted_at` | `timestamptz` | Set when status → submitted |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

**Indexes:** `applicant_user_id`, `status`

---

### `bank_accounts`
A Synctera-backed bank account owned by a user or organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | Optional |
| `owner_user_id` | `uuid` | Optional individual owner |
| `account_name` | `text` | |
| `account_number` | `text` unique | |
| `status` | `account_status` | Default `active` |
| `currency` | `text` | Default `USD` |
| `available_balance` | `numeric(14,2)` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `cards`
A virtual or physical debit card linked to a bank account.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `account_id` | `uuid` | References `bank_accounts.id` |
| `last4` | `text` | Last 4 digits |
| `status` | `card_status` | Default `active` |
| `spending_limit_cents` | `integer` | Optional per-card limit |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `transfers`
An ACH or internal money movement between two accounts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `source_account_id` | `uuid` | References `bank_accounts.id` |
| `destination_account_id` | `uuid` | References `bank_accounts.id` |
| `amount` | `numeric(14,2)` | |
| `currency` | `text` | Default `USD` |
| `status` | `transfer_status` | Default `pending` |
| `memo` | `text` | Optional |
| `created_by` | `uuid` | References `auth.users.id` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `transactions`
Individual ledger entries on a bank account. Created by card activity, ACH events, fees, and reversals.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `account_id` | `uuid` | References `bank_accounts.id` |
| `card_id` | `uuid` | Optional, for card-originated transactions |
| `transfer_id` | `uuid` | Optional, for ACH-originated transactions |
| `type` | `transaction_type` | |
| `amount` | `numeric(14,2)` | Positive for credits, negative for debits |
| `currency` | `text` | Default `USD` |
| `running_balance` | `numeric(14,2)` | Balance after this transaction |
| `description` | `text` | |
| `merchant_name` | `text` | For card transactions |
| `merchant_category_code` | `text` | MCC code |
| `synctera_transaction_id` | `text` unique | External dedup key |
| `metadata` | `jsonb` | Provider-specific data |
| `posted_at` | `timestamptz` | When the transaction settled |
| `created_at` | `timestamptz` | |

**Indexes:** `account_id`, `posted_at DESC`

---

### `alerts`
A compliance or fraud signal raised against an account or transfer.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `account_id` | `uuid` | Optional |
| `transfer_id` | `uuid` | Optional |
| `severity` | `alert_severity` | |
| `title` | `text` | |
| `description` | `text` | |
| `status` | `case_status` | Default `open` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `cases`
An investigation case created from one or more alerts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `alert_id` | `uuid` | References `alerts.id` |
| `assignee_user_id` | `uuid` | Analyst assigned to the case |
| `status` | `case_status` | Default `open` |
| `resolution_notes` | `text` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `webhook_events`
Inbound events from Synctera. Designed for idempotent, retry-safe processing.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `event_id` | `text` unique | Provider event ID — deduplication key |
| `provider` | `text` | Default `synctera` |
| `event_type` | `text` | e.g. `payment.updated`, `account.created` |
| `status` | `webhook_status` | Default `pending` |
| `retry_count` | `integer` | Default `0` |
| `max_retries` | `integer` | Default `3` |
| `raw_payload` | `jsonb` | Full provider payload |
| `last_error` | `text` | Last processing error message |
| `last_error_at` | `timestamptz` | |
| `received_at` | `timestamptz` | When the webhook arrived |
| `processed_at` | `timestamptz` | When processing succeeded |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

**Indexes:** `status`, `event_type`

---

### `api_keys`
Hashed API keys for partner/developer access scoped to an organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | References `organizations.id` |
| `created_by` | `uuid` | References `auth.users.id` |
| `name` | `text` | Human-readable label |
| `key_hash` | `text` unique | Hashed key — never store the raw key |
| `key_prefix` | `text` | Short display prefix, e.g. `fsk_live_abc1` |
| `status` | `api_key_status` | Default `active` |
| `last_used_at` | `timestamptz` | Updated on each authenticated request |
| `expires_at` | `timestamptz` | Optional expiry |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

**Indexes:** `organization_id`

---

### `documents`
Metadata for identity and business verification files. Actual bytes are in Supabase storage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `onboarding_application_id` | `uuid` | Optional link to onboarding application |
| `uploaded_by` | `uuid` | References `auth.users.id` |
| `type` | `document_type` | |
| `status` | `document_status` | Default `uploaded` |
| `storage_bucket` | `text` | `identity-documents` or `business-documents` |
| `storage_path` | `text` | Path within the bucket |
| `file_name` | `text` | Original filename |
| `file_size_bytes` | `integer` | |
| `mime_type` | `text` | |
| `reviewed_by` | `uuid` | Staff reviewer |
| `reviewed_at` | `timestamptz` | |
| `rejection_reason` | `text` | Set when status → rejected |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

**Indexes:** `onboarding_application_id`, `uploaded_by`

---

### `audit_logs`
Immutable record of every state-changing action performed by any actor.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `actor_user_id` | `uuid` | Who performed the action |
| `action` | `text` | e.g. `account.freeze`, `transfer.create` |
| `entity_type` | `text` | Table name of the affected record |
| `entity_id` | `uuid` | ID of the affected record |
| `request_id` | `text` | Trace ID from the originating HTTP request |
| `before_state` | `jsonb` | Snapshot of the record before the change |
| `after_state` | `jsonb` | Snapshot of the record after the change |
| `metadata` | `jsonb` | Additional context (IP, user agent, etc.) |
| `created_at` | `timestamptz` | |

**Indexes:** `request_id` (partial, where not null)

---

## Entity Relationships

```
auth.users
  └── profiles (1:1)
  └── organization_memberships (1:N)
  └── onboarding_applications (1:N, as applicant)
  └── documents (1:N, as uploader)
  └── api_keys (1:N, as creator)

organizations
  └── organization_memberships (1:N)
  └── bank_accounts (1:N)
  └── onboarding_applications (1:N)
  └── api_keys (1:N)

onboarding_applications
  └── documents (1:N)

bank_accounts
  └── cards (1:N)
  └── transfers (1:N, as source or destination)
  └── transactions (1:N)
  └── alerts (1:N)

transfers
  └── transactions (1:N)

alerts
  └── cases (1:N)

cards
  └── transactions (1:N)
```

---

## Row Level Security Summary

| Table | Customer | Analyst | Admin | Developer |
|-------|----------|---------|-------|-----------|
| `profiles` | Own row only | Read all | Read + write all | — |
| `organizations` | Member orgs only | Read all | Read + write all | — |
| `organization_memberships` | Own memberships | Read all | Manage all | — |
| `onboarding_applications` | Own applications | Read + update all | Read + update all | — |
| `bank_accounts` | Own + org accounts | Read all | Manage all | — |
| `cards` | Own account cards | Read all | Manage all | — |
| `transfers` | Own account transfers | Read all | Manage all | — |
| `transactions` | Own account txns | Read all | Manage all | — |
| `alerts` | — | Read + manage | Read + manage | — |
| `cases` | — | Own assigned + manage | Manage all | — |
| `webhook_events` | — | — | Read all | — |
| `api_keys` | — | — | Read + revoke all | Create + read own org |
| `documents` | Own uploads | Read all | Read + review all | — |
| `audit_logs` | — | Read all | Read all | — |

> All insert/update operations on system-managed tables (`webhook_events`, `transactions`) are performed via the service-role key in server-side API routes, bypassing RLS.

---

## Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `current_user_role()` | `app_role` | Returns the role of the currently authenticated user from `profiles` |
| `set_updated_at()` | `trigger` | Sets `updated_at = now()` on every UPDATE |
| `handle_new_user()` | `trigger` | Upserts a `profiles` row when a new `auth.users` row is created |

---

## Seeding

- Script: `scripts/seed-supabase.mjs`
- Requires: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Seeds: demo users, organization, memberships, bank accounts, card, transfer, alert, case, and audit log entry
- Safe to re-run (uses upsert)
