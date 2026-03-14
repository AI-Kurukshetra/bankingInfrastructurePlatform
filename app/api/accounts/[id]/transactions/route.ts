import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, type, amount, currency, running_balance, description, merchant_name, merchant_category_code, posted_at, created_at"
      )
      .eq("account_id", params.id)
      .order("posted_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch account transactions."
      },
      { status: 500 }
    );
  }
}

