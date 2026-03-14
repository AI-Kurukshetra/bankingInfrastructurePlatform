import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAchTransfer, createInternalTransfer } from "@/lib/payments/service";

type CreatePaymentPayload = {
  rail?: "ach" | "internal";
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount?: number;
  currency?: string;
  memo?: string | null;
  counterpartyName?: string;
  routingNumber?: string;
  accountNumber?: string;
};

function fallbackIdempotencyKey(userId: string, rail: string) {
  return `pay:${rail}:${userId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("transfers")
      .select(
        "id, rail, source_account_id, destination_account_id, amount, currency, status, memo, created_by, provider, provider_status, failure_reason, return_reason, destination_external_name, destination_external_account_mask, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transfers: (data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch payment history."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: CreatePaymentPayload;
  try {
    body = (await request.json()) as CreatePaymentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rail = body.rail?.trim() as "ach" | "internal" | undefined;
  const sourceAccountId = body.sourceAccountId?.trim();
  if (!rail || !["ach", "internal"].includes(rail)) {
    return NextResponse.json({ error: "A valid rail is required." }, { status: 400 });
  }

  if (!sourceAccountId) {
    return NextResponse.json({ error: "sourceAccountId is required." }, { status: 400 });
  }

  const rawIdempotencyKey = request.headers.get("x-idempotency-key")?.trim();
  const idempotencyKey =
    rawIdempotencyKey && rawIdempotencyKey.length > 5
      ? rawIdempotencyKey
      : fallbackIdempotencyKey(auth.profile.id, rail);

  try {
    if (rail === "ach") {
      const result = await createAchTransfer({
        sourceAccountId,
        amount: Number(body.amount),
        currency: body.currency,
        memo: body.memo,
        counterpartyName: body.counterpartyName ?? "",
        routingNumber: body.routingNumber ?? "",
        accountNumber: body.accountNumber ?? "",
        actorUserId: auth.profile.id,
        actorRole: auth.profile.role,
        idempotencyKey
      });

      return NextResponse.json({
        transfer: result.transfer,
        replayed: result.replayed,
        idempotencyKey
      });
    }

    const destinationAccountId = body.destinationAccountId?.trim();
    if (!destinationAccountId) {
      return NextResponse.json(
        { error: "destinationAccountId is required for internal transfers." },
        { status: 400 }
      );
    }

    const result = await createInternalTransfer({
      sourceAccountId,
      destinationAccountId,
      amount: Number(body.amount),
      currency: body.currency,
      memo: body.memo,
      actorUserId: auth.profile.id,
      actorRole: auth.profile.role,
      idempotencyKey
    });

    return NextResponse.json({
      transfer: result.transfer,
      replayed: result.replayed,
      idempotencyKey
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create transfer."
      },
      { status: 500 }
    );
  }
}
