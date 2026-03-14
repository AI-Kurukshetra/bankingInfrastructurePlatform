import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "customer" | "analyst" | "admin" | "developer";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
};

type AuthOk = { ok: true; profile: UserProfile };
type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

/**
 * Returns the profile row for the currently authenticated user,
 * or null if unauthenticated.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .single();

    return (profile as UserProfile) ?? null;
  } catch {
    return null;
  }
}

/**
 * Use in API route handlers to gate on authentication.
 * Returns the profile on success, or a ready-to-return 401 NextResponse.
 *
 * @example
 * const auth = await requireAuth();
 * if (!auth.ok) return auth.response;
 * // auth.profile is available here
 */
export async function requireAuth(): Promise<AuthResult> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    };
  }

  return { ok: true, profile };
}

/**
 * Use in API route handlers to gate on role.
 * Returns the profile on success, or a ready-to-return 401/403 NextResponse.
 *
 * @example
 * const auth = await requireRole(["admin", "analyst"]);
 * if (!auth.ok) return auth.response;
 */
export async function requireRole(allowedRoles: AppRole[]): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (!allowedRoles.includes(result.profile.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 })
    };
  }

  return result;
}

/** Boolean helper for conditional rendering in server components. */
export function hasRole(role: AppRole, allowed: AppRole[]): boolean {
  return allowed.includes(role);
}
