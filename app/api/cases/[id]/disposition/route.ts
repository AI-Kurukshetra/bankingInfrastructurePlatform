import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { updateMonitoringCaseDisposition } from "@/lib/monitoring/service";

type Context = {
  params: Promise<{ id: string }>;
};

type DispositionPayload = {
  status?: "open" | "investigating" | "resolved" | "closed";
  disposition?: "pending_review" | "monitor" | "false_positive" | "customer_outreach" | "escalated" | "suspicious_activity";
  priority?: "low" | "medium" | "high";
  resolutionNotes?: string | null;
};

export async function POST(request: Request, context: Context) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  let body: DispositionPayload;
  try {
    body = (await request.json()) as DispositionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.status || !body.disposition || !body.priority) {
    return NextResponse.json(
      { error: "status, disposition, and priority are required." },
      { status: 400 }
    );
  }

  try {
    const { id } = await context.params;
    const detail = await updateMonitoringCaseDisposition({
      caseId: id,
      actorUserId: auth.profile.id,
      status: body.status,
      disposition: body.disposition,
      priority: body.priority,
      resolutionNotes: body.resolutionNotes
    });
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update disposition." },
      { status: 500 }
    );
  }
}
