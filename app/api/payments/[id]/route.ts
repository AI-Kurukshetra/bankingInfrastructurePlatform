import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getTransferEvents } from "@/lib/payments/service";
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
    const { data: transfer, error } = await supabase
      .from("transfers")
      .select(
        "id, rail, source_account_id, destination_account_id, amount, currency, status, memo, created_by, provider, provider_transfer_id, provider_status, failure_reason, return_reason, destination_external_name, destination_external_routing, destination_external_account_mask, metadata, created_at, updated_at, ledger_applied_at, reversal_applied_at"
      )
      .eq("id", params.id)
      .single();

    if (error || !transfer) {
      return NextResponse.json({ error: error?.message ?? "Transfer not found." }, { status: 404 });
    }

    const events = await getTransferEvents(params.id);

    return NextResponse.json({
      transfer: {
        ...transfer,
        amount: Number(transfer.amount)
      },
      events
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch transfer details."
      },
      { status: 500 }
    );
  }
}
