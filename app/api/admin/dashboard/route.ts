import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getAdminDashboardData } from "@/lib/admin/service";

export async function GET() {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  try {
    const data = await getAdminDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load admin dashboard." },
      { status: 500 }
    );
  }
}
