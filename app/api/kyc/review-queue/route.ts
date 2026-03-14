import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getReviewQueue } from "@/lib/kyc/service";

export async function GET() {
  const auth = await requireRole(["admin", "analyst"]);
  if (!auth.ok) return auth.response;

  try {
    const queue = await getReviewQueue();
    return NextResponse.json({ queue });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load analyst review queue."
      },
      { status: 500 }
    );
  }
}
