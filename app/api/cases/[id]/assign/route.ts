import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { assignMonitoringCase } from "@/lib/monitoring/service";

type Context = {
  params: Promise<{ id: string }>;
};

type AssignPayload = {
  assigneeUserId?: string | null;
};

export async function POST(request: Request, context: Context) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  let body: AssignPayload;
  try {
    body = (await request.json()) as AssignPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const detail = await assignMonitoringCase({
      caseId: id,
      assigneeUserId: body.assigneeUserId?.trim() || null,
      actorUserId: auth.profile.id
    });
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to assign case." },
      { status: 500 }
    );
  }
}
