import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { addSupportNote } from "@/lib/admin/service";

export async function POST(request: Request) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  let body: { entityType?: string; entityId?: string; note?: string };
  try {
    body = (await request.json()) as { entityType?: string; entityId?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.entityType?.trim() || !body.entityId?.trim() || !body.note?.trim()) {
    return NextResponse.json({ error: "entityType, entityId, and note are required." }, { status: 400 });
  }

  try {
    const notes = await addSupportNote({
      entityType: body.entityType.trim(),
      entityId: body.entityId.trim(),
      note: body.note,
      actorUserId: auth.profile.id
    });
    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save support note." },
      { status: 500 }
    );
  }
}
