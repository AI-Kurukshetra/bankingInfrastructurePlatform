import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { generateApiKey } from "@/lib/auth/api-keys";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateApiKeyPayload = {
  name?: string;
  expiresAt?: string | null;
};

/** GET /api/auth/api-keys — list non-revoked keys for the caller's organization */
export async function GET() {
  const auth = await requireRole(["admin", "developer"]);
  if (!auth.ok) return auth.response;

  const supabase = createSupabaseServerClient();

  // Resolve the caller's organization
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization found for this user." }, { status: 404 });
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, status, last_used_at, expires_at, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys });
}

/** POST /api/auth/api-keys — create a new API key */
export async function POST(request: Request) {
  const auth = await requireRole(["admin", "developer"]);
  if (!auth.ok) return auth.response;

  let body: CreateApiKeyPayload;
  try {
    body = (await request.json()) as CreateApiKeyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Key name is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization found for this user." }, { status: 404 });
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const { data: newKey, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id: membership.organization_id,
      created_by: auth.profile.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      status: "active",
      expires_at: body.expiresAt ?? null
    })
    .select("id, name, key_prefix, status, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // rawKey is returned only once — the caller must store it securely.
  return NextResponse.json({ key: newKey, rawKey }, { status: 201 });
}
