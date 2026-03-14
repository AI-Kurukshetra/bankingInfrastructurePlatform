# FinStack Database Schema

## Migrations

| File | Description |
|------|-------------|
| `20260314124500_initial_auth_and_core.sql` | Core tables, enums, RLS, auth trigger |
| `20260314210000_extended_schema.sql` | Onboarding, transactions, webhooks, API keys, documents, audit log enhancements |
| `20260314230000_kyc_kyb_verification.sql` | Verification checks, retry-safe KYC/KYB state, sanctions results, and analyst review metadata |
| `20260315000000_account_management_module.sql` | Account provisioning requests, lifecycle events, and balance snapshots |
| `20260315010000_payments_and_transfers_module.sql` | ACH/internal transfer rails, reconciliation events, idempotency, and return/failure status support |
| `20260315020000_cards_module.sql` | Virtual card issuance requests, lifecycle events, control metadata, and card transaction feed persistence |
| `20260315030000_transaction_monitoring.sql` | Monitoring rules, alert enrichment, case workflow state, case notes, and case timeline events |

---

## Enums

| Enum | Values |
|------|--------|
| `app_role` | `customer`, `analyst`, `admin`, `developer` |
| `account_status` | `active`, `frozen`, `closed` |
| `transfer_status` | `pending`, `processing`, `settled`, `returned`, `failed` |
| `card_status` | `inactive`, `active`, `frozen`, `terminated` |
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
| `status` | `card_status` | `inactive`, `active`, `frozen`, `terminated` |
| `provider_card_id` | `text` | External provider reference |
| `form_factor` | `card_form_factor` | `virtual` or `physical` |
| `nickname` | `text` | Optional display label |
| `cardholder_name` | `text` | Printed/virtual cardholder name |
| `network` | `text` | Default `visa` |
| `spending_limit_cents` | `integer` | Optional per-card limit |
| `spending_controls` | `jsonb` | MCC and channel restrictions |
| `issued_at` | `timestamptz` | Issuance timestamp |
| `activated_at` | `timestamptz` | Set on activation |
| `frozen_at` | `timestamptz` | Set when frozen |
| `terminated_at` | `timestamptz` | Set on termination |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated |

---

### `transfers`
An ACH payout or internal money movement between accounts, with idempotent submission and reconciliation tracking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `source_account_id` | `uuid` | References `bank_accounts.id` |
| `destination_account_id` | `uuid` | References `bank_accounts.id` |
| `amount` | `numeric(14,2)` | |
| `currency` | `text` | Default `USD` |
| `rail` | `transfer_rail` | `ach` or `internal` |
| `status` | `transfer_status` | Default `pending` |
| `idempotency_key` | `text` | Unique per `created_by` when set |
| `provider` | `text` | Provider/adapter identifier |
| `provider_transfer_id` | `text` | External dedup key |
| `provider_status` | `text` | Provider-native status mirror |
| `memo` | `text` | Optional |
| `destination_external_name` | `text` | ACH counterparty display name |
| `destination_external_routing` | `text` | ACH routing number |
| `destination_external_account_mask` | `text` | Masked external account suffix |
| `failure_reason` | `text` | Set when status -> `failed` |
| `return_reason` | `text` | Set when status -> `returned` |
| `metadata` | `jsonb` | Provider/reconciliation payloads |
| `ledger_applied_at` | `timestamptz` | Settlement posted to ledger |
| `reversal_applied_at` | `timestamptz` | Return reversal posted to ledger |
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

---

## KYC/KYB Extension (20260314230000_kyc_kyb_verification.sql)

### New enum
- `verification_status`: `pending`, `processing`, `approved`, `rejected`, `manual_review`, `failed`

### New table: `verification_checks`
Stores each verification attempt tied to an onboarding application with idempotency and analyst review context.

Key columns:
- `onboarding_application_id` (FK to `onboarding_applications`)
- `idempotency_key` (unique per application for retry-safe processing)
- `provider`, `attempt_number`, `status`, `decision_reason`
- `sanctions_checks` (normalized OFAC/PEP/watchlist results)
- `evidence_references` (document paths used in checks)
- `provider_request`, `provider_response`, `error_message`
- `requested_by`, `reviewed_by`, `review_notes`, timestamps

### RLS summary
- Customer: can view checks for their own application.
- Analyst/Admin: can view all checks and update review outcomes.
- Insert allowed for authenticated requester on own actions (or staff).

---

## Account Management Extension (20260315000000_account_management_module.sql)

### New enum
- `account_provisioning_status`: `pending`, `processing`, `completed`, `failed`

### bank_accounts additions
- `onboarding_application_id` (nullable FK, unique when set)
- `synctera_account_id` (nullable provider reference, unique when set)

### New table: `account_provisioning_requests`
Tracks idempotent approved-application to account-creation attempts.

Key fields:
- `onboarding_application_id`, `idempotency_key` (composite unique)
- `requested_by`, `status`, `account_id`
- `provider`, `provider_request`, `provider_response`, `error_message`

### New table: `account_lifecycle_events`
Operational timeline for account status and sync events.

Key fields:
- `account_id`, `event_type`
- `previous_status`, `next_status`
- `actor_user_id`, `source`, `details`, `created_at`

### New table: `account_balance_snapshots`
Ledger-view snapshots for account summary UI reads.

Key fields:
- `account_id`, `available_balance`, `currency`
- `source_event_id`, `captured_by_user_id`, `captured_at`

### RLS summary
- Customers can read lifecycle events/snapshots only for owned accounts.
- Analyst/Admin can read all and write provisioning, lifecycle events, and snapshots.
- Provisioning requests are readable by requester and staff.

---

## Payments & Transfers Extension (20260315010000_payments_and_transfers_module.sql)

### New enum
- `transfer_rail`: `ach`, `internal`

### transfers additions
- Adds `rail`, `idempotency_key`, provider refs/status, ACH counterparty fields, failure/return reasons, reconciliation metadata, and ledger/reversal timestamps.

### New table: `transfer_events`
Replay-safe transfer status timeline used for manual reconciliation and provider webhook deduplication.

Key fields:
- `transfer_id`, `event_type`, `previous_status`, `next_status`
- `source`, `provider_event_id`, `actor_user_id`, `payload`, `created_at`

### RLS summary
- Customers can read transfer events for transfers they created or for transfers touching their accessible accounts.
- Analyst/Admin can read all transfer events.
- Insert is restricted to staff or service-role backed server workflows.


---

## Cards Extension (20260315020000_cards_module.sql)

### New enums
- `card_form_factor`: `virtual`, `physical`
- `card_issuance_status`: `pending`, `processing`, `completed`, `failed`
- `card_transaction_status`: `authorized`, `posted`, `declined`, `reversed`

### cards additions
- Adds provider card reference, form-factor support, nickname/cardholder metadata, spending controls, and lifecycle timestamps.

### New table: `card_issuance_requests`
Tracks replay-safe card issuance attempts by account and idempotency key.

Key fields:
- `account_id`, `idempotency_key`, `requested_by`, `form_factor`
- `status`, `card_id`, `provider_request`, `provider_response`, `error_message`

### New table: `card_lifecycle_events`
Operational timeline for issuance, activation, freeze/unfreeze, termination, and control changes.

Key fields:
- `card_id`, `account_id`, `event_type`
- `previous_status`, `next_status`, `actor_user_id`, `source`, `details`

### New table: `card_transaction_feed`
Customer-visible card transaction activity feed, separate from the bank-account ledger rows.

Key fields:
- `card_id`, `account_id`, `status`, `amount`, `currency`
- `merchant_name`, `merchant_category_code`, `network_reference`
- `metadata`, `authorized_at`, `posted_at`, `created_at`

### RLS summary
- Customers can read cards, lifecycle events, and card feed rows tied to their accessible accounts, including organization membership accounts.
- Analyst/Admin can read all and write issuance requests, lifecycle events, and feed records.
- Physical card support is modeled through `form_factor` without blocking virtual-card issuance paths.



---

## Transaction Monitoring Extension (20260315030000_transaction_monitoring.sql)

### New enums
- `monitoring_source_type`: `payment_transfer`, `account_transaction`, `card_transaction`
- `case_priority`: `low`, `medium`, `high`
- `case_disposition`: `pending_review`, `monitor`, `false_positive`, `customer_outreach`, `escalated`, `suspicious_activity`

### New table: `monitoring_rules`
Configurable MVP rule registry that allows the same monitoring pipeline to evaluate transfer, account-transaction, and card-transaction events.

Key fields:
- `rule_code`, `name`, `severity`, `source_types`, `is_active`
- `config`, `created_by_user_id`, `created_at`, `updated_at`

### alerts additions
- Adds `rule_code`, `source_type`, `source_record_id`, `transaction_id`, `card_id`, `dedup_key`, `payload`, `escalated_at`, and `last_evaluated_at`.
- `dedup_key` is unique when present so duplicate webhook replays and repeat internal writes do not open duplicate cases.

### cases additions
- Adds `priority`, `disposition`, `escalated_at`, `closed_at`, and `last_activity_at`.
- Keeps analyst workflow state separate from the raw alert payload.

### New table: `case_notes`
Internal-only analyst notes attached to a monitoring case.

Key fields:
- `case_id`, `author_user_id`, `note`, `visibility`, `created_at`

### New table: `case_events`
Case timeline entries for assignment, disposition changes, escalation, and note activity.

Key fields:
- `case_id`, `event_type`, `title`, `details`, `actor_user_id`, `created_at`

### Seeded MVP rules
- `transfer_amount_threshold`: flags large transfers above configured amount threshold.
- `account_transfer_velocity`: flags accounts with repeated outbound ledger debits inside a rolling window.
- `card_spend_anomaly`: flags high-ticket, high-risk MCC, and decline-pattern card feed activity.

### RLS summary
- Monitoring rules are visible to staff and manageable by admin/developer roles.
- Case notes and case events are visible to analyst/admin/developer roles only.
- Alert and case base-table policies remain staff-only with assignee access preserved on cases.

---

## Admin Dashboard Operational Views

No additional migration was required for the admin dashboard module.

The admin APIs aggregate existing operational data from:
- `onboarding_applications` and `verification_checks`
- `transfers`, `transfer_events`, and `transactions`
- `cards`, `card_issuance_requests`, `card_lifecycle_events`, and `card_transaction_feed`
- `alerts`, `cases`, `case_events`, and `case_notes`
- `webhook_events` and `audit_logs`

Support notes for admin review workflows are persisted as structured `audit_logs` entries with action `support_note.created`.

## User Role Directory Extension (20260315040000_user_roles_rbac.sql)

### New tables
- `users`: standalone RBAC user directory with allowed roles `consumer`, `business`, `compliance_analyst`, `admin`, `developer_partner` and allowed statuses `active`, `pending`, `suspended`
- `consumer_profiles`: one-to-one profile table with `date_of_birth`, `address`, and `kyc_status` (`pending`, `approved`, `rejected`)
- `business_profiles`: one-to-one profile table with `company_name`, `business_type`, `registration_number`, and `kyb_status` (`pending`, `approved`, `rejected`)
- `developer_profiles`: one-to-one profile table with `organization_name`, `api_key`, and `sandbox_enabled`

### Indexes
- `users.email` unique index
- `users.role` index
- unique indexes on `consumer_profiles.user_id`, `business_profiles.user_id`, and `developer_profiles.user_id`

### Seed assets
- SQL seed file: `supabase/seed_user_roles.sql`
- Supabase seed script: `scripts/seed-user-roles.mjs`
- Example role queries: `supabase/examples/user_role_queries.sql`
