import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { getCardLifecycleEvents, getCardTransactionFeed } from "@/lib/cards/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = {
  params: {
    id: string;
  };
};

function normalizeBankAccountRelation(value: unknown) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServerClient();
    const { data: card, error } = await supabase
      .from("cards")
      .select(
        "id, account_id, last4, status, spending_limit_cents, provider_card_id, form_factor, nickname, cardholder_name, network, spending_controls, issued_at, activated_at, frozen_at, terminated_at, created_at, updated_at, bank_accounts(id, account_name, account_number, currency, status)"
      )
      .eq("id", params.id)
      .single();

    if (error || !card) {
      return NextResponse.json({ error: error?.message ?? "Card not found." }, { status: 404 });
    }

    const [lifecycleEvents, transactionFeed] = await Promise.all([
      getCardLifecycleEvents(params.id),
      getCardTransactionFeed(params.id)
    ]);

    return NextResponse.json({
      card: {
        ...card,
        spending_limit_cents:
          card.spending_limit_cents === null || card.spending_limit_cents === undefined
            ? null
            : Number(card.spending_limit_cents),
        bank_accounts: normalizeBankAccountRelation(card.bank_accounts)
      },
      lifecycleEvents,
      transactionFeed
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch card detail." },
      { status: 500 }
    );
  }
}
