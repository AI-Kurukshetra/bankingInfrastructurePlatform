import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import {
  getApplicationForVerification,
  getLatestVerificationCheck,
  startVerificationCheck
} from "@/lib/kyc/service";

type Params = {
  params: {
    id: string;
  };
};

function newIdempotencyKey(applicationId: string) {
  return `${applicationId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const applicationId = params.id;
  if (!applicationId) {
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
  }

  try {
    const application = await getApplicationForVerification(applicationId);
    const isOwner = application.applicant_user_id === auth.profile.id;
    const isStaff = ["admin", "analyst"].includes(auth.profile.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rawIdempotency = request.headers.get("x-idempotency-key")?.trim();
    const idempotencyKey = rawIdempotency && rawIdempotency.length > 5
      ? rawIdempotency
      : newIdempotencyKey(applicationId);

    const result = await startVerificationCheck({
      applicationId,
      actorUserId: auth.profile.id,
      idempotencyKey
    });

    return NextResponse.json({
      check: result.check,
      replayed: result.replayed,
      idempotencyKey
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start verification."
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const applicationId = params.id;
  if (!applicationId) {
    return NextResponse.json({ error: "Application ID is required." }, { status: 400 });
  }

  try {
    const application = await getApplicationForVerification(applicationId);
    const isOwner = application.applicant_user_id === auth.profile.id;
    const isStaff = ["admin", "analyst"].includes(auth.profile.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const latestCheck = await getLatestVerificationCheck(applicationId);

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        type: application.type
      },
      verification: latestCheck
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load verification status."
      },
      { status: 500 }
    );
  }
}
