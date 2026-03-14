import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { issueVirtualCard } from "@/lib/cards/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type IssueCardPayload = {
  accountId?: string;
  nickname?: string | null;
  cardholderName?: string | null;
  spendingLimitCents?: number | null;
  allowedMccs?: string[];
  blockedMccs?: string[];
  ecommerceEnabled?: boolean;
  atmEnabled?: boolean;
};

function fallbackIdempotencyKey(userId: string, accountId: string) {
  return `card:${userId}:${accountId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeBankAccountRelation(value: unknown) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, account_id, last4, status, spending_limit_cents, provider_card_id, form_factor, nickname, cardholder_name, network, spending_controls, issued_at, activated_at, frozen_at, terminated_at, created_at, updated_at, bank_accounts(id, account_name, account_number, currency, status)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      cards: (data ?? []).map((item) => ({
        ...item,
        spending_limit_cents:
          item.spending_limit_cents === null || item.spending_limit_cents === undefined
            ? null
            : Number(item.spending_limit_cents),
        bank_accounts: normalizeBankAccountRelation(item.bank_accounts)
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch cards." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: IssueCardPayload;
  try {
    body = (await request.json()) as IssueCardPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const accountId = body.accountId?.trim();
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required." }, { status: 400 });
  }

  const rawIdempotencyKey = request.headers.get("x-idempotency-key")?.trim();
  const idempotencyKey =
    rawIdempotencyKey && rawIdempotencyKey.length > 5
      ? rawIdempotencyKey
      : fallbackIdempotencyKey(auth.profile.id, accountId);

  try {
    const result = await issueVirtualCard({
      accountId,
      actorUserId: auth.profile.id,
      actorRole: auth.profile.role,
      idempotencyKey,
      nickname: body.nickname,
      cardholderName: body.cardholderName,
      controls: {
        spendingLimitCents: body.spendingLimitCents,
        allowedMccs: body.allowedMccs,
        blockedMccs: body.blockedMccs,
        ecommerceEnabled: body.ecommerceEnabled,
        atmEnabled: body.atmEnabled
      }
    });

    return NextResponse.json({ card: result.card, replayed: result.replayed, idempotencyKey });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to issue card." },
      { status: 500 }
    );
  }
}
