import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { reconcileTransferStatus } from "@/lib/payments/service";

type Params = {
  params: {
    id: string;
  };
};

type ReconcilePayload = {
  nextStatus?: "processing" | "settled" | "returned" | "failed";
  providerEventId?: string | null;
  providerStatus?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(["admin", "analyst"]);
  if (!auth.ok) return auth.response;

  let body: ReconcilePayload;
  try {
    body = (await request.json()) as ReconcilePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.nextStatus || !["processing", "settled", "returned", "failed"].includes(body.nextStatus)) {
    return NextResponse.json({ error: "A valid nextStatus is required." }, { status: 400 });
  }

  try {
    const result = await reconcileTransferStatus({
      transferId: params.id,
      nextStatus: body.nextStatus,
      actorUserId: auth.profile.id,
      source: "payments_api",
      providerEventId: body.providerEventId?.trim() || null,
      providerStatus: body.providerStatus?.trim() || null,
      failureReason: body.nextStatus === "failed" ? body.reason?.trim() || null : null,
      returnReason: body.nextStatus === "returned" ? body.reason?.trim() || null : null,
      payload: body.payload ?? {}
    });

    return NextResponse.json({ transfer: result.transfer, replayed: result.replayed });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to reconcile transfer status."
      },
      { status: 500 }
    );
  }
}
