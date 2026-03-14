import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET() {
  try {
    const { url } = getSupabaseEnv();
    const projectRef = new URL(url).hostname.split(".")[0] ?? "unknown";

    return NextResponse.json({
      ok: true,
      configured: true,
      projectRef
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          error instanceof Error
            ? error.message
            : "Supabase environment is not configured."
      },
      { status: 500 }
    );
  }
}
