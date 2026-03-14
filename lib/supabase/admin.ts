import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the service-role key.
 * Bypasses Row Level Security — only call this in server-side API routes
 * and scripts that need privileged database access.
 *
 * Never import this in client components or expose the service-role key
 * to the browser.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY required for admin client."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
