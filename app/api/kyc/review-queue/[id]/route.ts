import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { reviewVerificationDecision } from "@/lib/kyc/service";

type Params = {
  params: {
    id: string;
  };
};

type DecisionPayload = {
  decision?: "approved" | "rejected" | "more_info_needed";
  notes?: string;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(["admin", "analyst"]);
  if (!auth.ok) return auth.response;

  let body: DecisionPayload;
  try {
    body = (await request.json()) as DecisionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.decision || !["approved", "rejected", "more_info_needed"].includes(body.decision)) {
    return NextResponse.json({ error: "A valid decision is required." }, { status: 400 });
  }

  try {
    const updated = await reviewVerificationDecision({
      applicationId: params.id,
      actorUserId: auth.profile.id,
      decision: body.decision,
      notes: body.notes?.trim() || null
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save review decision."
      },
      { status: 500 }
    );
  }
}
