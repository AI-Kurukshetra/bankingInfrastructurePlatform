import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getApplicationForVerification, resubmitForVerification } from "@/lib/kyc/service";

type Params = {
  params: {
    id: string;
  };
};

function newIdempotencyKey(applicationId: string) {
  return `resubmit:${applicationId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const applicationId = params.id;
  if (!applicationId) {
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
  }

  try {
    const application = await getApplicationForVerification(applicationId);
    if (application.applicant_user_id !== auth.profile.id) {
      return NextResponse.json({ error: "Only the applicant can resubmit." }, { status: 403 });
    }

    const result = await resubmitForVerification({
      applicationId,
      actorUserId: auth.profile.id,
      idempotencyKey: newIdempotencyKey(applicationId)
    });

    return NextResponse.json({ check: result.check, replayed: result.replayed });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resubmit verification."
      },
      { status: 500 }
    );
  }
}
