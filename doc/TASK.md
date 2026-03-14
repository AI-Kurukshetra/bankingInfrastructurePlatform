# Banking Infrastructure Platform MVP Task Plan

## Phase 1: Foundation

### 1. Project Setup
- [ ] Initialize Next.js 15 app with TypeScript strict mode and `pnpm`
- [ ] Configure path aliases, ESLint, Prettier, and shared tsconfig rules
- [ ] Add Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query, and `nuqs`
- [ ] Set up `.env.example` with Supabase, Synctera, notification, and logging variables
- [ ] Create base app structure for `(auth)`, `(dashboard)`, `api`, `components`, `lib`, `hooks`, `types`, `supabase`, `tests`, and `doc`
- [ ] Add shared utility modules for API errors, trace IDs, idempotency keys, and date/currency formatting

### 2. Infrastructure Setup
- [ ] Provision Supabase project for database, auth, storage, and row-level security
- [ ] Configure Vercel project with staging and demo environments
- [ ] Set up secret management for Supabase, Synctera, email/SMS, and observability providers
- [ ] Create environment-based config loader for server and client-safe variables
- [ ] Add CI workflow to run `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- [ ] Set up storage buckets for identity and business verification documents

### 3. Database Schema
- [ ] Design MVP entity map for users, organizations, onboarding applications, accounts, cards, transfers, transactions, alerts, cases, webhooks, API keys, audit logs, and documents
- [ ] Create initial Supabase migrations for core tables and enums
- [ ] Add row-level security policies for customer, analyst, admin, and developer roles
- [ ] Define audit log schema with actor, action, request ID, and before/after state fields
- [ ] Define webhook event schema with idempotency, processing status, retry count, and error fields
- [ ] Document schema, relationships, and RLS rules in `/doc/SCHEMA.md`

### 4. Authentication & Authorization
- [ ] Backend: Configure Supabase Auth for customer and admin login flows
- [ ] Backend: Implement session-aware Supabase server/client helpers and middleware refresh logic
- [ ] Backend: Define RBAC model for customer, analyst, admin, and developer roles
- [ ] Backend: Add API key issuance, storage, hashing, and rotation flow for partner access
- [ ] Frontend: Build sign-in, sign-up, password reset, and session expiration screens
- [ ] Frontend: Protect dashboard routes and show unauthorized/error states
- [ ] Integration: Enforce rate limiting and request authentication on public API routes

## Phase 2: Onboarding And Compliance

### 5. User Onboarding Module
- [ ] Backend: Create onboarding application APIs for draft creation, save progress, submit, and status lookup
- [ ] Backend: Add applicant profile models for consumer and business onboarding
- [ ] Backend: Implement document metadata and storage reference handling
- [ ] Frontend: Build consumer onboarding wizard for profile, contact, consent, identity, and document steps
- [ ] Frontend: Build business onboarding wizard for business profile, tax info, owners, and document steps
- [ ] Frontend: Add draft resume, validation errors, loading states, and status timeline views
- [ ] Integration: Wire document upload flow to Supabase storage with secure access controls

### 6. KYC / KYB Integration
- [ ] Backend: Create KYC/KYB orchestration service with Synctera-compatible request/response adapters
- [ ] Backend: Persist verification results, evidence references, sanctions checks, and review notes
- [ ] Backend: Implement manual review states, resubmission support, and retry-safe processing
- [ ] Frontend: Show verification progress, approval/rejection states, and user-safe failure messaging
- [ ] Frontend: Build analyst review queue for flagged consumer and business applications
- [ ] Integration: Connect Synctera sandbox KYC/KYB endpoints or mock adapters behind the same service boundary
- [ ] Integration: Add OFAC/PEP/watchlist screening hooks and normalized result handling

## Phase 3: Accounts, Payments, And Cards

### 7. Account Management Module
- [ ] Backend: Implement approved-application to account-creation workflow with idempotency protection
- [ ] Backend: Create account APIs for details, balances, status, and transaction listing
- [ ] Backend: Persist account lifecycle events and ledger-view snapshots for UI reads
- [ ] Frontend: Build account summary page with balances, account metadata, and recent activity
- [ ] Frontend: Add admin controls for freeze, unfreeze, and close-account actions with confirmations
- [ ] Integration: Connect Synctera account creation and account detail endpoints to internal services

### 8. Payments & Transfers Module
- [ ] Backend: Implement ACH transfer creation with validation, idempotency keys, and status tracking
- [ ] Backend: Implement internal transfer workflow between platform accounts
- [ ] Backend: Create transfer reconciliation logic for pending, processing, settled, returned, and failed states
- [ ] Frontend: Build transfer initiation forms for ACH and internal transfers
- [ ] Frontend: Build payment status, history, and error-state views for customers and admins
- [ ] Integration: Connect Synctera payment APIs and normalize provider status updates
- [ ] Integration: Add retry-safe handling for duplicate submission and webhook replay scenarios

### 9. Cards Module
- [ ] Backend: Implement virtual debit card issuance workflow for approved accounts
- [ ] Backend: Create card APIs for activation, freeze/unfreeze, termination, and control updates
- [ ] Backend: Persist card lifecycle events and card transaction feed records
- [ ] Frontend: Build card management screen with status, controls, and transaction feed
- [ ] Frontend: Add spending control forms for limits and merchant-category restrictions where supported
- [ ] Integration: Connect Synctera card issuance and card-control endpoints through an internal adapter
- [ ] Integration: Prepare physical card support as a non-MVP extension point without blocking virtual-card delivery

## Phase 4: Monitoring, Operations, And Internal Tooling

### 10. Transaction Monitoring
- [ ] Backend: Define configurable MVP monitoring rules for velocity, amount thresholds, and anomalies
- [ ] Backend: Build alert generation pipeline from account, payment, and card transaction events
- [ ] Backend: Create case management APIs for assignment, notes, disposition, and escalation
- [ ] Frontend: Build analyst alert queue with filterable severity, status, and assignee views
- [ ] Frontend: Build case detail screen with evidence timeline, notes, and disposition actions
- [ ] Integration: Trigger monitoring evaluation from webhook events and internal transaction writes

### 11. Admin Dashboard
- [ ] Backend: Build admin aggregation endpoints for onboarding, payments, cards, alerts, cases, and webhook health
- [ ] Backend: Add export endpoints for demo-ready reports and audit review data
- [ ] Frontend: Build internal dashboard shell with role-aware navigation and queue summary cards
- [ ] Frontend: Build review screens for onboarding decisions, payment issues, card operations, and alert cases
- [ ] Frontend: Add event timelines, actor history, and support notes for operational workflows
- [ ] Frontend: Add confirmation prompts and success/error feedback for privileged actions

## Phase 5: Platform APIs, Events, And Communication

### 12. API Development
- [ ] Backend: Define versioned REST contracts for `/auth`, `/users`, `/organizations`, `/onboarding`, `/accounts`, `/cards`, `/payments`, `/transfers`, `/transactions`, `/monitoring`, `/cases`, `/documents`, `/reports`, and `/admin`
- [ ] Backend: Standardize request validation, response envelopes, and error schema with trace IDs
- [ ] Backend: Add idempotency middleware for account creation and payment creation endpoints
- [ ] Backend: Generate OpenAPI or reference documentation for partner-facing endpoints
- [ ] Frontend: Build lightweight developer portal page for sandbox usage, sample payloads, and auth guidance

### 13. Webhook Processing
- [ ] Backend: Implement inbound Synctera webhook endpoint with signature verification and replay protection
- [ ] Backend: Persist raw webhook payloads, processing attempts, and final outcomes
- [ ] Backend: Build idempotent webhook job processor for payments, accounts, cards, and transaction events
- [ ] Backend: Add retry workflow, dead-letter handling, and admin-visible failure states
- [ ] Frontend: Show webhook processing health and failed-event retry actions in the admin dashboard
- [ ] Integration: Map Synctera event types to internal domain events and reconciliation handlers

### 14. Notifications System
- [ ] Backend: Define notification templates for onboarding decisions, account creation, transfer updates, and card events
- [ ] Backend: Build notification service with channel abstraction for email and SMS
- [ ] Backend: Persist notification delivery attempts and failure reasons
- [ ] Frontend: Add in-app notification center or status banners for key customer events
- [ ] Integration: Connect transactional email/SMS provider or mock provider for demo mode

## Phase 6: Hardening, Validation, And Demo Readiness

### 15. Security Implementation
- [ ] Backend: Enforce Zod validation on all write paths and partner-facing APIs
- [ ] Backend: Mask sensitive values in logs, audit views, and operator screens
- [ ] Backend: Require MFA for admin access and privileged operations
- [ ] Backend: Encrypt sensitive document references and minimize stored cardholder data exposure
- [ ] Frontend: Add secure UX patterns for privileged actions, session expiry, and document access
- [ ] Integration: Add endpoint-level rate limiting and abuse protections for public APIs and webhooks

### 16. Observability & Logging
- [ ] Backend: Add structured logging with request IDs, actor IDs, and correlation IDs
- [ ] Backend: Instrument metrics for API latency, webhook success rate, onboarding drop-off, transfer failures, and alert volume
- [ ] Backend: Add tracing around Synctera calls, webhook processing, and background jobs
- [ ] Frontend: Add client error capture for critical flows in onboarding, transfers, and admin actions
- [ ] Integration: Connect logs, metrics, and traces to the chosen monitoring platform

### 17. Testing
- [ ] Backend: Write unit tests for validation schemas, auth helpers, API handlers, monitoring rules, and webhook processors
- [ ] Backend: Add integration tests for onboarding submission, account creation, transfer initiation, and card issuance flows
- [ ] Frontend: Add component and form tests for onboarding, transfer, card-control, and admin review screens
- [ ] End-to-end: Add Playwright coverage for consumer onboarding, business onboarding, transfer flow, card control flow, and alert review flow
- [ ] End-to-end: Add webhook replay and retry test scenarios using sandbox or mock events
- [ ] QA: Create demo seed data and happy-path test checklist for hackathon rehearsal

### 18. Deployment
- [ ] Set up staging and demo deployment environments with environment-specific configuration
- [ ] Configure Supabase migrations and seed execution in deployment workflow
- [ ] Add release checklist for config validation, secrets, webhooks, and smoke tests
- [ ] Validate production-like routing, TLS, and callback URLs for auth and webhooks
- [ ] Run final pre-demo checks for lint, typecheck, tests, and deployment health

### 19. Hackathon Demo Preparation
- [ ] Script the end-to-end demo covering onboarding, approval, account creation, transfer, card issuance, monitoring alert, and admin review
- [ ] Prepare demo personas for consumer applicant, business applicant, analyst, and admin operator
- [ ] Seed deterministic sample data for balances, transfers, cards, alerts, and audit events
- [ ] Build mock/fallback flows for any Synctera sandbox gaps without changing public API boundaries
- [ ] Create operator cheat sheet for manual retries, webhook replay, and exception handling during the demo
- [ ] Capture screenshots or backup walkthrough assets in case live integrations degrade during judging
