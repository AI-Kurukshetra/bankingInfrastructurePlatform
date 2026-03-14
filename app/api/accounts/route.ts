import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("bank_accounts")
      .select(
        "id, onboarding_application_id, organization_id, owner_user_id, account_name, account_number, status, currency, available_balance, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch accounts."
      },
      { status: 500 }
    );
  }
}

