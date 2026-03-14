import type { AppRole } from "@/lib/auth/rbac";
import { SyncteraMockCardsAdapter } from "@/lib/cards/adapters";
import type { CardControls, CardStatus } from "@/lib/cards/types";
import { evaluateCardTransactionMonitoring } from "@/lib/monitoring/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const adapter = new SyncteraMockCardsAdapter();

const cardSelect =
  "id, account_id, last4, status, spending_limit_cents, provider_card_id, form_factor, nickname, cardholder_name, network, spending_controls, issued_at, activated_at, frozen_at, terminated_at, created_at, updated_at";

type AccountRecord = {
  id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  account_name: string;
  account_number: string;
  status: "active" | "frozen" | "closed";
  currency: string;
  available_balance: number;
};

type CardRecord = {
  id: string;
  account_id: string;
  last4: string;
  status: CardStatus;
  spending_limit_cents: number | null;
  provider_card_id: string | null;
  form_factor: "virtual" | "physical";
  nickname: string | null;
  cardholder_name: string | null;
  network: string;
  spending_controls: Record<string, unknown>;
  issued_at: string;
  activated_at: string | null;
  frozen_at: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
};

type CardFeedRecord = {
  id: string;
  card_id: string;
  account_id: string;
  status: string;
  amount: number;
  currency: string;
  merchant_name: string | null;
  merchant_category_code: string | null;
  network_reference: string | null;
  metadata: Record<string, unknown>;
  authorized_at: string | null;
  posted_at: string | null;
  created_at: string;
};

function hydrateCard(record: Record<string, unknown>) {
  return {
    ...record,
    spending_limit_cents:
      record.spending_limit_cents === null || record.spending_limit_cents === undefined
        ? null
        : Number(record.spending_limit_cents),
    spending_controls: (record.spending_controls as Record<string, unknown> | null) ?? {}
  } as CardRecord;
}

function hydrateFeed(record: Record<string, unknown>) {
  return {
    ...record,
    amount: Number(record.amount),
    metadata: (record.metadata as Record<string, unknown> | null) ?? {}
  } as CardFeedRecord;
}

function normalizeLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined || Number.isNaN(limit)) {
    return null;
  }

  const rounded = Math.round(limit);
  if (rounded < 0) {
    throw new Error("spendingLimitCents cannot be negative.");
  }

  return rounded;
}

function normalizeMccList(values: string[] | undefined) {
  if (!values) return [];
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function normalizeControls(input: CardControls | undefined) {
  if (!input) return {} satisfies CardControls;

  return {
    spendingLimitCents: normalizeLimit(input.spendingLimitCents),
    allowedMccs: normalizeMccList(input.allowedMccs),
    blockedMccs: normalizeMccList(input.blockedMccs),
    ecommerceEnabled:
      typeof input.ecommerceEnabled === "boolean" ? input.ecommerceEnabled : undefined,
    atmEnabled: typeof input.atmEnabled === "boolean" ? input.atmEnabled : undefined
  } satisfies CardControls;
}

async function isOrganizationMember(organizationId: string, userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function getAccessibleAccount(params: {
  accountId: string;
  actorUserId: string;
  actorRole: AppRole;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(
      "id, organization_id, owner_user_id, account_name, account_number, status, currency, available_balance"
    )
    .eq("id", params.accountId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Account not found.");
  }

  const account = {
    ...data,
    available_balance: Number(data.available_balance)
  } as AccountRecord;

  if (["admin", "analyst"].includes(params.actorRole)) {
    return account;
  }

  if (account.owner_user_id === params.actorUserId) {
    return account;
  }

  if (account.organization_id) {
    const isMember = await isOrganizationMember(account.organization_id, params.actorUserId);
    if (isMember) {
      return account;
    }
  }

  throw new Error("You do not have access to the requested account.");
}

async function getAccessibleCard(params: {
  cardId: string;
  actorUserId: string;
  actorRole: AppRole;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cards")
    .select(`${cardSelect}, bank_accounts(id, organization_id, owner_user_id, account_name, account_number, status, currency, available_balance)`)
    .eq("id", params.cardId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Card not found.");
  }

  const account = data.bank_accounts as unknown as AccountRecord;

  if (["admin", "analyst"].includes(params.actorRole)) {
    return { card: hydrateCard(data as unknown as Record<string, unknown>), account };
  }

  if (account.owner_user_id === params.actorUserId) {
    return { card: hydrateCard(data as unknown as Record<string, unknown>), account };
  }

  if (account.organization_id) {
    const isMember = await isOrganizationMember(account.organization_id, params.actorUserId);
    if (isMember) {
      return { card: hydrateCard(data as unknown as Record<string, unknown>), account };
    }
  }

  throw new Error("You do not have access to the requested card.");
}

function nextStatusForAction(action: "activate" | "freeze" | "unfreeze" | "terminate") {
  if (action === "activate") return "active" as const;
  if (action === "freeze") return "frozen" as const;
  if (action === "unfreeze") return "active" as const;
  return "terminated" as const;
}

function canTransition(currentStatus: CardStatus, action: "activate" | "freeze" | "unfreeze" | "terminate") {
  if (action === "activate") return currentStatus === "inactive";
  if (action === "freeze") return currentStatus === "active";
  if (action === "unfreeze") return currentStatus === "frozen";
  if (action === "terminate") return currentStatus !== "terminated";
  return false;
}

async function insertLifecycleEvent(params: {
  cardId: string;
  accountId: string;
  eventType: string;
  previousStatus: CardStatus | null;
  nextStatus: CardStatus | null;
  actorUserId: string;
  details?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("card_lifecycle_events").insert({
    card_id: params.cardId,
    account_id: params.accountId,
    event_type: params.eventType,
    previous_status: params.previousStatus,
    next_status: params.nextStatus,
    actor_user_id: params.actorUserId,
    source: "cards_service",
    details: params.details ?? {}
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function recordCardFeedEvent(params: {
  cardId: string;
  accountId: string;
  status: "authorized" | "posted" | "declined" | "reversed";
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategoryCode: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("card_transaction_feed")
    .insert({
      card_id: params.cardId,
      account_id: params.accountId,
      status: params.status,
      amount: params.amount,
      currency: params.currency,
      merchant_name: params.merchantName,
      merchant_category_code: params.merchantCategoryCode,
      network_reference: `demo_${params.cardId.slice(0, 8)}_${Date.now().toString(36)}`,
      metadata: params.metadata ?? {},
      authorized_at: new Date().toISOString(),
      posted_at: params.status === "posted" ? new Date().toISOString() : null
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to write card feed event.");
  }

  await evaluateCardTransactionMonitoring({
    feedId: data.id as string,
    eventType: "card.feed_recorded"
  });

  return data.id as string;
}

export async function issueVirtualCard(params: {
  accountId: string;
  actorUserId: string;
  actorRole: AppRole;
  idempotencyKey: string;
  nickname?: string | null;
  cardholderName?: string | null;
  controls?: CardControls;
}) {
  const supabase = createSupabaseAdminClient();
  const account = await getAccessibleAccount({
    accountId: params.accountId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole
  });

  if (account.status !== "active") {
    throw new Error("Cards can only be issued for active accounts.");
  }

  const { data: existingRequest, error: existingError } = await supabase
    .from("card_issuance_requests")
    .select("id, status, card_id")
    .eq("account_id", params.accountId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingRequest?.card_id) {
    const { data: existingCard, error: existingCardError } = await supabase
      .from("cards")
      .select(cardSelect)
      .eq("id", existingRequest.card_id)
      .single();

    if (existingCardError || !existingCard) {
      throw new Error(existingCardError?.message ?? "Existing card not found.");
    }

    return { card: hydrateCard(existingCard as unknown as Record<string, unknown>), replayed: true };
  }

  const controls = normalizeControls(params.controls);
  const providerRequest = {
    accountId: params.accountId,
    nickname: params.nickname?.trim() || null,
    cardholderName: params.cardholderName?.trim() || null,
    controls,
    formFactor: "virtual"
  };

  const { data: requestRow, error: requestError } = await supabase
    .from("card_issuance_requests")
    .upsert(
      {
        account_id: params.accountId,
        idempotency_key: params.idempotencyKey,
        requested_by: params.actorUserId,
        form_factor: "virtual",
        status: "processing",
        provider: "synctera_mock",
        provider_request: providerRequest
      },
      { onConflict: "account_id,idempotency_key" }
    )
    .select("id")
    .single();

  if (requestError || !requestRow) {
    throw new Error(requestError?.message ?? "Unable to create issuance request.");
  }

  try {
    const providerResult = await adapter.issueCard({
      accountId: account.id,
      accountNumberLast4: account.account_number.slice(-4),
      cardholderName:
        params.cardholderName?.trim() || account.account_name || "FinStack Cardholder",
      nickname: params.nickname?.trim() || null,
      formFactor: "virtual",
      controls
    });

    const { data: cardRow, error: cardError } = await supabase
      .from("cards")
      .insert({
        account_id: account.id,
        last4: providerResult.last4,
        status: providerResult.status,
        spending_limit_cents: normalizeLimit(controls.spendingLimitCents),
        provider_card_id: providerResult.providerCardId,
        form_factor: "virtual",
        nickname: params.nickname?.trim() || null,
        cardholder_name:
          params.cardholderName?.trim() || account.account_name || "FinStack Cardholder",
        network: providerResult.network,
        spending_controls: controls,
        activated_at: null,
        frozen_at: null,
        terminated_at: null
      })
      .select(cardSelect)
      .single();

    if (cardError || !cardRow) {
      throw new Error(cardError?.message ?? "Unable to create card record.");
    }

    await insertLifecycleEvent({
      cardId: cardRow.id as string,
      accountId: account.id,
      eventType: "card.issued",
      previousStatus: null,
      nextStatus: providerResult.status,
      actorUserId: params.actorUserId,
      details: providerResult.rawResponse
    });

    await supabase
      .from("card_issuance_requests")
      .update({
        status: "completed",
        card_id: cardRow.id,
        provider_response: providerResult.rawResponse
      })
      .eq("id", requestRow.id);

    return { card: hydrateCard(cardRow as unknown as Record<string, unknown>), replayed: false };
  } catch (error) {
    await supabase
      .from("card_issuance_requests")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Card issuance failed"
      })
      .eq("id", requestRow.id);

    throw error;
  }
}

export async function updateCardStatus(params: {
  cardId: string;
  action: "activate" | "freeze" | "unfreeze" | "terminate";
  actorUserId: string;
  actorRole: AppRole;
}) {
  const supabase = createSupabaseAdminClient();
  const { card, account } = await getAccessibleCard({
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole
  });

  if (!canTransition(card.status, params.action)) {
    throw new Error(`Cannot ${params.action} card from status ${card.status}.`);
  }

  const nextStatus = nextStatusForAction(params.action);
  let providerResponse: Record<string, unknown> = { adapter: "none", action: params.action };

  if (card.provider_card_id) {
    const provider = await adapter.updateCardStatus(card.provider_card_id, card.status, nextStatus);
    providerResponse = provider.rawResponse;
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { status: nextStatus };
  if (params.action === "activate") patch.activated_at = nowIso;
  if (params.action === "freeze") patch.frozen_at = nowIso;
  if (params.action === "unfreeze") patch.frozen_at = null;
  if (params.action === "terminate") patch.terminated_at = nowIso;

  const { data: updated, error } = await supabase
    .from("cards")
    .update(patch)
    .eq("id", params.cardId)
    .select(cardSelect)
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? "Unable to update card status.");
  }

  await insertLifecycleEvent({
    cardId: params.cardId,
    accountId: account.id,
    eventType: `card.${params.action}`,
    previousStatus: card.status,
    nextStatus,
    actorUserId: params.actorUserId,
    details: providerResponse
  });

  if (params.action === "activate") {
    await recordCardFeedEvent({
      cardId: params.cardId,
      accountId: account.id,
      status: "authorized",
      amount: 0,
      currency: account.currency,
      merchantName: "FinStack Card Activation",
      merchantCategoryCode: "6012",
      metadata: { activation: true }
    });
  }

  return hydrateCard(updated as unknown as Record<string, unknown>);
}

export async function updateCardControls(params: {
  cardId: string;
  controls: CardControls;
  actorUserId: string;
  actorRole: AppRole;
}) {
  const supabase = createSupabaseAdminClient();
  const { card, account } = await getAccessibleCard({
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole
  });

  if (card.status === "terminated") {
    throw new Error("Cannot update controls on a terminated card.");
  }

  const nextControls = normalizeControls({
    ...((card.spending_controls as CardControls | undefined) ?? {}),
    ...params.controls
  });

  let providerResponse: Record<string, unknown> = { adapter: "none", action: "update_controls" };
  if (card.provider_card_id) {
    const provider = await adapter.updateControls(card.provider_card_id, nextControls);
    providerResponse = provider.rawResponse;
  }

  const { data: updated, error } = await supabase
    .from("cards")
    .update({
      spending_limit_cents: normalizeLimit(nextControls.spendingLimitCents),
      spending_controls: nextControls
    })
    .eq("id", params.cardId)
    .select(cardSelect)
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? "Unable to update card controls.");
  }

  await insertLifecycleEvent({
    cardId: params.cardId,
    accountId: account.id,
    eventType: "card.controls_updated",
    previousStatus: card.status,
    nextStatus: card.status,
    actorUserId: params.actorUserId,
    details: providerResponse
  });

  return hydrateCard(updated as unknown as Record<string, unknown>);
}

export async function getCardLifecycleEvents(cardId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("card_lifecycle_events")
    .select("id, event_type, previous_status, next_status, source, details, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getCardTransactionFeed(cardId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("card_transaction_feed")
    .select(
      "id, card_id, account_id, status, amount, currency, merchant_name, merchant_category_code, network_reference, metadata, authorized_at, posted_at, created_at"
    )
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => hydrateFeed(item as unknown as Record<string, unknown>));
}


