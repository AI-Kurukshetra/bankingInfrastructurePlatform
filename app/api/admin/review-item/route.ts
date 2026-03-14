import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getAdminReviewDetail } from "@/lib/admin/service";

export async function GET(request: Request) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as "onboarding" | "payment" | "card" | "case" | null;
  const id = searchParams.get("id")?.trim();

  if (!kind || !id) {
    return NextResponse.json({ error: "kind and id are required." }, { status: 400 });
  }

  try {
    const detail = await getAdminReviewDetail(kind, id);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load review detail." },
      { status: 500 }
    );
  }
}
