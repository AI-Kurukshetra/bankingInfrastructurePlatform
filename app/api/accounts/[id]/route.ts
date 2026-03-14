import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountLifecycleEvents, getLatestBalanceSnapshot } from "@/lib/accounts/service";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServerClient();
    const { data: account, error } = await supabase
      .from("bank_accounts")
      .select(
        "id, onboarding_application_id, organization_id, owner_user_id, account_name, account_number, status, currency, available_balance, synctera_account_id, created_at, updated_at"
      )
      .eq("id", params.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: error?.message ?? "Account not found." }, { status: 404 });
    }

    const [snapshot, lifecycleEvents] = await Promise.all([
      getLatestBalanceSnapshot(account.id),
      getAccountLifecycleEvents(account.id)
    ]);

    return NextResponse.json({ account, snapshot, lifecycleEvents });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch account details."
      },
      { status: 500 }
    );
  }
}

