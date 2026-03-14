import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** DELETE /api/auth/api-keys/[id] — revoke an API key (admin only) */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Key ID is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Verify the key belongs to the admin's organization before revoking
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization found for this user." }, { status: 404 });
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
