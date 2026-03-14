import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { getMonitoringCaseDetail } from "@/lib/monitoring/service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const detail = await getMonitoringCaseDetail(id);
    return NextResponse.json({ detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load case detail." },
      { status: 500 }
    );
  }
}
