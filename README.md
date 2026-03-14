# FinStack MVP

Core docs and project tracking live in `doc/`.

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Configure environment:
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_SUPABASE_URL`
   - Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Set `NEXT_PUBLIC_APP_URL` (used by forgot-password redirect)
   - Set `SUPABASE_SERVICE_ROLE_KEY` (required for `db:seed`)
3. Run app:
   - `pnpm dev`

## Authentication

- Middleware-protected routes:
  - `/dashboard`
  - `/account/reset-password`
- Auth pages:
  - `/login`
  - `/forgot-password`
  - `/reset-password` (password reset link destination)
  - `/account/reset-password` (signed-in account security)
- Auth API endpoints:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/session`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/update-password`

## Database

- Supabase migration file:
  - `supabase/migrations/20260314124500_initial_auth_and_core.sql`
- Core tables:
  - `profiles`, `organizations`, `organization_memberships`, `bank_accounts`, `cards`, `transfers`, `alerts`, `cases`, `audit_logs`

## Seed Data

1. Apply migration in your Supabase project.
2. Run:
   - `pnpm db:seed`
3. Seed script creates demo users and sample operational data.

## Validation

- `pnpm typecheck`
- `pnpm lint`
