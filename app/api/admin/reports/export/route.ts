import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { exportAdminReport } from "@/lib/admin/service";

export async function GET(request: Request) {
  const auth = await requireRole(["admin", "analyst", "developer"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") as "overview" | "audit" | null) ?? "overview";
  const format = (searchParams.get("format") as "json" | "csv" | null) ?? "json";

  try {
    const report = await exportAdminReport(kind, format);
    return new NextResponse(report.body, {
      status: 200,
      headers: {
        "content-type": report.contentType,
        "content-disposition": `attachment; filename=finstack-${kind}-report.${format}`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export report." },
      { status: 500 }
    );
  }
}
