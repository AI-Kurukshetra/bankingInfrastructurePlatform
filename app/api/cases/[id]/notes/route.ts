import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { addMonitoringCaseNote } from "@/lib/monitoring/service";

type Context = {
  params: Promise<{ id: string }>;
};

type NotePayload = {
  note?: string;
};

export async function POST(request: Request, context: Context) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  let body: NotePayload;
  try {
    body = (await request.json()) as NotePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.note?.trim()) {
    return NextResponse.json({ error: "note is required." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const detail = await addMonitoringCaseNote({
      caseId: id,
      actorUserId: auth.profile.id,
      note: body.note
    });
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add note." },
      { status: 500 }
    );
  }
}
