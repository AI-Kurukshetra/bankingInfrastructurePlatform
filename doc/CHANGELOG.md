# Changelog

## 2026-03-14 10:57
- Added root `TASK.md` with phased hackathon MVP implementation tasks derived from `PRD.md`
- Created required `/doc` tracking files defined by `AGENTS.md`

## 2026-03-14 11:03
- Moved `AGENTS.md`, `PRD.md`, and `TASK.md` from the repository root into `/doc`
- Replaced the previous lightweight `/doc/PRD.md` stub with the full product requirements document

## 2026-03-14 11:11
- Added `.codex/config.toml` with a project-local GitHub MCP server entry
- Added `.vscode/mcp.json` so workspace-aware tools can attach to the GitHub MCP server

## 2026-03-14 11:19
- Updated `.vscode/mcp.json` to authenticate the GitHub MCP server with an Authorization header sourced from `GITHUB_PERSONAL_ACCESS_TOKEN`

## 2026-03-14 11:24
- Validated the provided GitHub token against GitHub
- Configured Git Credential Manager with the GitHub account for Git-over-HTTPS authentication
## 2026-03-14 11:40
- Added README.md to summarize the platform vision and workflow
- Added .gitignore for node/Next.js artifacts and environment files
- Added MIT LICENSE for the hackathon MVP


## 2026-03-14 12:07
- Bootstrapped minimal Next.js App Router + Tailwind configuration
- Added /login page with Synctera-inspired floating-label input styling


## 2026-03-14 12:10
- Added .eslintrc.json to allow running next lint without interactive setup
- Updated package.json packageManager to pnpm@10.28.2


## 2026-03-14 12:23
- Added @supabase/ssr and @supabase/supabase-js dependencies
- Added lib/supabase helpers for environment, browser client, and server client
- Added API routes: POST /api/auth/login and GET /api/supabase/health
- Integrated login form submit with Supabase-backed auth endpoint and status feedback
- Added .env.example entries for Supabase URL and anon key


## 2026-03-14 12:31
- Added lucide-react dependency
- Replaced LoginCard inline SVG logo with lucide-react Landmark icon


## 2026-03-14 12:42
- Added middleware-based Supabase session refresh and protected route handling (/dashboard + login redirect)
- Added auth API routes: POST /api/auth/signup, POST /api/auth/logout, GET /api/auth/session
- Upgraded login UI to support both sign-in and sign-up flows with redirect handling
- Added supabase/migrations/20260314124500_initial_auth_and_core.sql with core tables, triggers, and RLS policies
- Added scripts/seed-supabase.mjs and pnpm db:seed command for demo users and sample operational data
- Updated README and .env.example for new auth and seeding requirements


## 2026-03-14 12:49
- Added POST /api/auth/forgot-password to start reset flow via Supabase email
- Added POST /api/auth/update-password for authenticated password updates
- Added /forgot-password page and /account/reset-password page
- Added reusable ForgotPasswordCard and ResetPasswordCard components
- Linked login screen forgot-password action and dashboard reset-password action
- Expanded middleware protection to include /account routes
- Added NEXT_PUBLIC_APP_URL to .env.example for reset redirect URL


## 2026-03-14 12:52
- Added Remember me checkbox to login mode in LoginCard
- Implemented remembered email persistence with localStorage and auto-fill on revisit


## 2026-03-14 12:56
- Updated forgot-password redirect target from /account/reset-password to /reset-password
- Added /reset-password page for email recovery links
- Added ResetPasswordFromLinkCard with New Password + Confirm Password validation and token/session handling
- Updated README auth section for reset-link destination flow


## 2026-03-14 13:00
- Updated LoginCard password visibility toggle to use lucide-react Eye/EyeOff icons
- Added Eye/EyeOff show/hide toggles for both password fields in ResetPasswordCard
- Added Eye/EyeOff show/hide toggles for both password fields in ResetPasswordFromLinkCard
