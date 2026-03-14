# Progress Log

[2026-03-14 10:57] codex - Generated root TASK.md from PRD.md and bootstrapped required /doc tracking files
[2026-03-14 11:03] codex - Moved root markdown files into /doc and replaced the existing /doc/PRD.md with the full root PRD
[2026-03-14 11:11] codex - Added GitHub MCP configuration under .codex/config.toml and .vscode/mcp.json
[2026-03-14 11:19] codex - Updated .vscode/mcp.json to send the GitHub PAT from GITHUB_PERSONAL_ACCESS_TOKEN as the MCP Authorization header
[2026-03-14 11:24] codex - Validated the provided GitHub token with GitHub and configured Git Credential Manager for GitHub HTTPS authentication
[2026-03-14 11:40] codex - Created README.md, .gitignore, and MIT LICENSE to describe the MVP repo, ignore build artifacts, and licence the code

[2026-03-14 12:07] codex - Bootstrapped Next.js + Tailwind skeleton and implemented a basic /login page with floating-label inputs

[2026-03-14 12:10] codex - Installed frontend dependencies and added ESLint config so pnpm lint runs non-interactively

[2026-03-14 12:23] codex - Integrated Supabase SDK helpers, added /api/auth/login and /api/supabase/health endpoints, and wired login form submit

[2026-03-14 12:31] codex - Installed lucide-react and replaced LoginCard inline SVG with the Landmark icon component

[2026-03-14 12:42] codex - Added signup/login/logout/session auth routes, protected dashboard middleware, initial Supabase schema migration with RLS, and scripts/seed-supabase.mjs

[2026-03-14 12:49] codex - Added forgot-password API/page flow, account reset-password page/API, and linked login/dashboard security actions

[2026-03-14 12:52] codex - Added remember-me checkbox behavior to login, persisting and auto-filling remembered email via localStorage

[2026-03-14 12:56] codex - Added /reset-password link-destination flow with new password + confirm password and Supabase token/session handling

[2026-03-14 13:00] codex - Replaced text show/hide toggles with Eye/EyeOff icon buttons across login and password reset forms

[2026-03-14 13:14] codex - Initialized shadcn/ui, added dashboard primitives, applied primary #2563EB theme tokens, and rebuilt dashboard UI with shadcn components

[2026-03-14 13:52] codex - Fixed Tailwind token class build failures, added sidebar + command palette + theme toggle to dashboard, and validated successful production build

[2026-03-14 14:32] codex - Replaced root redirect with a full landing page, added reusable landing sections, created /signup and /developers pages, and validated production build
[2026-03-14 15:05] codex - Removed the client boundary from components/ui/button.tsx, restored dashboard button styling with buttonVariants, restarted the dev server, and verified both runtime and production build
[2026-03-14 15:20] codex - Added shared brand primitives, rebuilt auth pages around a common page shell/card shell, aligned dashboard and landing branding, and validated typecheck, lint, and production build

[2026-03-14 16:05] codex - Replaced the entire root landing page with a new fintech SaaS design and original content, added new section components, removed legacy landing components, and validated with typecheck/lint/build

[2026-03-14 16:18] codex - Updated LoginCard to stop preloading remembered email into auth forms and validated with typecheck/lint

[2026-03-14 16:24] codex - Implemented Phase 2 User Onboarding Module with onboarding APIs, typed consumer/business form models, /onboarding workspace UI (wizards, draft resume, validation, timeline), document metadata route, storage-backed upload flow, and migration for applicant update + storage access policies

[2026-03-14 16:36] codex - Added KYC/KYB integration: verification_checks schema migration with RLS, Synctera-compatible mock orchestration service, onboarding verification APIs (start/status/resubmit), analyst review queue APIs, applicant verification status UI, and analyst queue UI with decision actions

[2026-03-14 16:56] codex - Added Account Management Module with provisioning workflow from approved onboarding applications, Synctera-compatible accounts adapter, /api/accounts routes (details/balances/status/transactions/sync), lifecycle event + balance snapshot persistence, and /dashboard/accounts summary UI with admin freeze/unfreeze/close actions

[2026-03-14 17:25] codex - Added Payments & Transfers Module with ACH and internal transfer creation APIs, replay-safe reconciliation via transfer_events, status/history/detail views, staff reconciliation controls, and /dashboard/payments workspace UI


[2026-03-14 17:42] codex - Added Cards Module with virtual card issuance requests, card lifecycle events, card-control APIs, transaction feed persistence, /dashboard/cards management UI, and a Synctera-compatible mock card adapter with physical-card extension hooks


[2026-03-14 18:35] codex - Added Transaction Monitoring with monitoring_rules/case_notes/case_events schema extension, alert and case-management APIs, /dashboard/monitoring analyst workspace, dashboard navigation updates, and monitoring evaluation hooks in transfer/card/internal-transaction write paths

[2026-03-14 18:45] codex - Added a standalone user-role directory migration, SQL seed, Supabase seed script, and role query examples; live execution blocked pending SUPABASE_SERVICE_ROLE_KEY or direct Postgres credentials

[2026-03-14 19:10] codex - Traced browser asset 404s to stale/corrupt Next.js dev build output and duplicate dev servers; added scripts/dev-clean.ps1 and a dev:clean command to reset .next before restarting dev

[2026-03-14 19:25] codex - Fixed corrupted admin dashboard source in lib/admin/service.ts that broke the /dashboard route chunk; validated with pnpm typecheck and pnpm lint
[2026-03-14 20:05] codex - Completed the Admin Dashboard module with admin aggregation/export APIs, a role-aware /dashboard control center, queue review detail panels with timelines/support notes, and validated with pnpm typecheck, pnpm lint, and pnpm build
[2026-03-14 20:18] codex - Normalized dark-theme card rendering across shared pages by adding global dark utility overrides in app/globals.css, updating shared tab/input primitives, patching page shells with explicit dark surfaces, and validating with pnpm typecheck, pnpm lint, and pnpm build
