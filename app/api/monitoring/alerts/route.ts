import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { listMonitoringAlerts } from "@/lib/monitoring/service";

export async function GET(request: Request) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await listMonitoringAlerts({
      severity: (searchParams.get("severity") as "low" | "medium" | "high" | "all" | null) ?? "all",
      status: (searchParams.get("status") as "open" | "investigating" | "resolved" | "closed" | "all" | null) ?? "all",
      assigneeUserId: searchParams.get("assignee") ?? "all"
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load monitoring alerts." },
      { status: 500 }
    );
  }
}
