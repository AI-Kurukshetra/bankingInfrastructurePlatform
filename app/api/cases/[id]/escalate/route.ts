import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { escalateMonitoringCase } from "@/lib/monitoring/service";

type Context = {
  params: Promise<{ id: string }>;
};

type EscalatePayload = {
  note?: string | null;
};

export async function POST(request: Request, context: Context) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  let body: EscalatePayload = {};
  try {
    body = (await request.json()) as EscalatePayload;
  } catch {
    body = {};
  }

  try {
    const { id } = await context.params;
    const detail = await escalateMonitoringCase({
      caseId: id,
      actorUserId: auth.profile.id,
      note: body.note
    });
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to escalate case." },
      { status: 500 }
    );
  }
}
