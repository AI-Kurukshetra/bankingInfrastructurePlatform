# Decisions

## 2026-03-14 10:57
- Kept the repository root `PRD.md` as the canonical source for product requirements and created `doc/PRD.md` as a lightweight mirror stub.
  Rationale: the repo already stores the full PRD at the root, and the immediate task was to generate an engineering task plan without duplicating a large source document unnecessarily.
## 2026-03-14 11:03
- Consolidated all root markdown documents into /doc and removed them from the repository root.
  Rationale: the repository currently uses markdown files only for project documentation, and the user requested a single documentation location under /doc.

## 2026-03-14 11:11
- Configured GitHub MCP via the remote HTTP server endpoint in project files instead of embedding credentials.
  Rationale: this keeps secrets out of the repository while letting compatible clients authenticate separately at runtime.

## 2026-03-14 11:19
- Bound GitHub MCP authentication to the existing GITHUB_PERSONAL_ACCESS_TOKEN environment variable in workspace config instead of committing a token.
  Rationale: this authenticates the MCP server for clients that inherit the environment while keeping secrets out of version control.
## 2026-03-14 11:24
- Used Git Credential Manager to configure GitHub HTTPS authentication instead of embedding credentials into repository config.
  Rationale: this keeps credentials in the OS credential store and avoids writing secrets into git remotes, files, or tracked project configuration.
## 2026-03-14 11:40
- Added README.md, .gitignore, and LICENSE to the root repository layout

## 2026-03-14 12:23
- Standardized Supabase integration on @supabase/ssr helpers for both browser and server contexts, exposing shared factory functions under lib/supabase.  
  Rationale: this keeps authentication and cookie handling consistent across server routes and future server components while minimizing repeated setup code.

## 2026-03-14 12:31
- Adopted lucide-react as the initial free icon pack for UI icons and replaced custom inline SVG in login branding.  
  Rationale: reduces custom SVG maintenance and keeps icon usage consistent and reusable across components.

## 2026-03-14 12:42
- Implemented Supabase session protection through Next.js middleware and server-side user checks for /dashboard.  
  Rationale: centralizes auth enforcement and keeps protected routes inaccessible without valid session cookies.
- Seed strategy uses Supabase Admin API via service-role key in a local script instead of raw SQL-only seeds.  
  Rationale: allows creating/maintaining auth users and relational demo records together in one repeatable workflow.

## 2026-03-14 12:49
- Implemented password recovery initiation via server route (/api/auth/forgot-password) with redirect URL derived from request origin or NEXT_PUBLIC_APP_URL.  
  Rationale: keeps reset-email initiation on server and avoids hardcoding environment-specific URLs in client code.
- Kept password update as authenticated account action at /account/reset-password using /api/auth/update-password.  
  Rationale: supports explicit account security management and aligns with protected-route authorization already enforced by middleware.

## 2026-03-14 12:52
- Implemented remember-me as email persistence (not password persistence) in localStorage on successful login.  
  Rationale: preserves user convenience while avoiding insecure storage of password credentials in the browser.

## 2026-03-14 12:56
- Separated reset-link destination (/reset-password) from authenticated account settings reset (/account/reset-password).  
  Rationale: email recovery links must work for users without an active session, while account settings reset remains protected for signed-in users.

## 2026-03-14 13:00
- Standardized password visibility controls to icon-based toggles (Eye/EyeOff) across auth forms.  
  Rationale: provides clearer and more compact password visibility affordance than text toggles, while keeping behavior consistent.
