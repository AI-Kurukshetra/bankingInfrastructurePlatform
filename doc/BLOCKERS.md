# Blockers

No active blockers.
[2026-03-14] BLOCKER - codex
Problem:   Cannot run the new user-role migration or seed against the live Supabase project because `SUPABASE_SERVICE_ROLE_KEY` and direct Postgres connection credentials are not available in the workspace environment.
Attempted: Checked `.env.local`, process environment, existing Supabase seed tooling, and CLI availability; only the public URL and anon key are configured.
Needs:     A valid `SUPABASE_SERVICE_ROLE_KEY` or Postgres connection string, plus approval to use networked execution if required.
