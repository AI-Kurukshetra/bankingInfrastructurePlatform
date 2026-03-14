import type { AppRole } from "@/lib/auth/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SyncteraMockPaymentsAdapter } from "@/lib/payments/adapters";
import {
  evaluateAccountTransactionMonitoring,
  evaluateTransferMonitoring
} from "@/lib/monitoring/service";
import type { TransferRail, TransferStatus } from "@/lib/payments/types";

const adapter = new SyncteraMockPaymentsAdapter();

const transferSelect =
  "id, rail, source_account_id, destination_account_id, amount, currency, status, memo, created_by, provider, provider_transfer_id, provider_status, failure_reason, return_reason, destination_external_name, destination_external_routing, destination_external_account_mask, ledger_applied_at, reversal_applied_at, metadata, created_at, updated_at";

type BankAccountRecord = {
  id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  account_name: string;
  account_number: string;
  status: "active" | "frozen" | "closed";
  currency: string;
  available_balance: number;
};

type TransferRecord = {
  id: string;
  rail: TransferRail;
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  currency: string;
  status: TransferStatus;
  memo: string | null;
  created_by: string | null;
  provider: string;
  provider_transfer_id: string | null;
  provider_status: string | null;
  failure_reason: string | null;
  return_reason: string | null;
  destination_external_name: string | null;
  destination_external_routing: string | null;
  destination_external_account_mask: string | null;
  ledger_applied_at: string | null;
  reversal_applied_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type TransferEventRecord = {
  id: string;
  transfer_id: string;
  event_type: string;
  previous_status: TransferStatus | null;
  next_status: TransferStatus | null;
  source: string;
  provider_event_id: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

function normalizeAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function hydrateTransfer(record: Record<string, unknown>) {
  return {
    ...record,
    amount: Number(record.amount),
    metadata: (record.metadata as Record<string, unknown> | null) ?? {}
  } as TransferRecord;
}

function assertPositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  return normalizeAmount(value);
}

function normalizeCurrency(currency: string | undefined) {
  const normalized = (currency ?? "USD").trim().toUpperCase();
  if (normalized !== "USD") {
    throw new Error("Only USD transfers are supported in the current module.");
  }

  return normalized;
}

function maskExternalAccount(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length < 4) {
    throw new Error("Account number must include at least 4 digits.");
  }

  return digits.slice(-4);
}

function validateRoutingNumber(routingNumber: string) {
  const digits = routingNumber.replace(/\D/g, "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Routing number must be 9 digits.");
  }

  return digits;
}

function canTransition(current: TransferStatus, next: TransferStatus) {
  const transitions: Record<TransferStatus, TransferStatus[]> = {
    pending: ["processing", "settled", "failed"],
    processing: ["settled", "returned", "failed"],
    settled: ["returned"],
    returned: [],
    failed: []
  };

  return transitions[current].includes(next);
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
  } as BankAccountRecord;

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

async function getExistingTransferByIdempotency(createdBy: string, idempotencyKey: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .select(transferSelect)
    .eq("created_by", createdBy)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? hydrateTransfer(data as Record<string, unknown>) : null;
}

async function getTransferRecord(transferId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .select(transferSelect)
    .eq("id", transferId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Transfer not found.");
  }

  return hydrateTransfer(data as Record<string, unknown>);
}

async function getTransferEventByProviderId(providerEventId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfer_events")
    .select(
      "id, transfer_id, event_type, previous_status, next_status, source, provider_event_id, actor_user_id, payload, created_at"
    )
    .eq("provider_event_id", providerEventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as TransferEventRecord | null) ?? null;
}

async function insertTransferEvent(params: {
  transferId: string;
  eventType: string;
  previousStatus: TransferStatus | null;
  nextStatus: TransferStatus | null;
  source: string;
  actorUserId?: string | null;
  providerEventId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfer_events")
    .insert({
      transfer_id: params.transferId,
      event_type: params.eventType,
      previous_status: params.previousStatus,
      next_status: params.nextStatus,
      source: params.source,
      actor_user_id: params.actorUserId ?? null,
      provider_event_id: params.providerEventId ?? null,
      payload: params.payload ?? {}
    })
    .select(
      "id, transfer_id, event_type, previous_status, next_status, source, provider_event_id, actor_user_id, payload, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to write transfer event.");
  }

  return data as TransferEventRecord;
}

async function snapshotBalance(accountId: string, availableBalance: number, currency: string, actorUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("account_balance_snapshots").insert({
    account_id: accountId,
    available_balance: availableBalance,
    currency,
    captured_by_user_id: actorUserId
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function updateAccountBalance(params: {
  accountId: string;
  delta: number;
  currency: string;
  requireSufficientFunds?: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const amount = normalizeAmount(Math.abs(params.delta));

  const { data: current, error: currentError } = await supabase
    .from("bank_accounts")
    .select("id, available_balance, currency")
    .eq("id", params.accountId)
    .eq("currency", params.currency)
    .single();

  if (currentError || !current) {
    throw new Error(currentError?.message ?? "Unable to load account balance.");
  }

  const currentBalance = Number(current.available_balance);
  const nextBalance =
    params.delta < 0
      ? normalizeAmount(currentBalance - amount)
      : normalizeAmount(currentBalance + amount);

  if (params.delta < 0 && params.requireSufficientFunds !== false && nextBalance < 0) {
    throw new Error("Insufficient funds to complete transfer reconciliation.");
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .update({ available_balance: nextBalance })
    .eq("id", params.accountId)
    .eq("currency", params.currency)
    .select("id, available_balance, currency")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update account balance.");
  }

  return {
    id: data.id as string,
    availableBalance: Number(data.available_balance),
    currency: data.currency as string
  };
}

async function insertTransaction(params: {
  accountId: string;
  transferId: string;
  type: "debit" | "credit" | "reversal";
  amount: number;
  currency: string;
  runningBalance: number;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      account_id: params.accountId,
      transfer_id: params.transferId,
      type: params.type,
      amount: normalizeAmount(params.amount),
      currency: params.currency,
      running_balance: normalizeAmount(params.runningBalance),
      description: params.description,
      metadata: params.metadata ?? {},
      posted_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to write transaction record.");
  }

  if (params.type === "debit" && params.metadata?.direction === "outbound") {
    await evaluateAccountTransactionMonitoring({
      transactionId: data.id as string,
      eventType: "transaction.created"
    });
  }

  return data.id as string;
}

async function applySettlement(transfer: TransferRecord, actorUserId: string) {
  if (transfer.ledger_applied_at) {
    return;
  }

  if (!transfer.source_account_id) {
    throw new Error("Transfer is missing a source account.");
  }

  const source = await updateAccountBalance({
    accountId: transfer.source_account_id,
    delta: -transfer.amount,
    currency: transfer.currency,
    requireSufficientFunds: true
  });

  await insertTransaction({
    accountId: transfer.source_account_id,
    transferId: transfer.id,
    type: "debit",
    amount: -transfer.amount,
    currency: transfer.currency,
    runningBalance: source.availableBalance,
    description:
      transfer.rail === "internal"
        ? `Internal transfer to ${transfer.destination_account_id ?? "destination account"}`
        : `ACH transfer to ${transfer.destination_external_name ?? "external account"}`,
    metadata: {
      rail: transfer.rail,
      direction: "outbound"
    }
  });
  await snapshotBalance(source.id, source.availableBalance, source.currency, actorUserId);

  if (transfer.destination_account_id) {
    const destination = await updateAccountBalance({
      accountId: transfer.destination_account_id,
      delta: transfer.amount,
      currency: transfer.currency,
      requireSufficientFunds: false
    });

    await insertTransaction({
      accountId: transfer.destination_account_id,
      transferId: transfer.id,
      type: "credit",
      amount: transfer.amount,
      currency: transfer.currency,
      runningBalance: destination.availableBalance,
      description: `Internal transfer from ${transfer.source_account_id}`,
      metadata: {
        rail: transfer.rail,
        direction: "inbound"
      }
    });
    await snapshotBalance(
      destination.id,
      destination.availableBalance,
      destination.currency,
      actorUserId
    );
  }
}

async function applyReturn(transfer: TransferRecord, actorUserId: string) {
  if (!transfer.ledger_applied_at || transfer.reversal_applied_at) {
    return;
  }

  if (!transfer.source_account_id) {
    throw new Error("Transfer is missing a source account.");
  }

  const source = await updateAccountBalance({
    accountId: transfer.source_account_id,
    delta: transfer.amount,
    currency: transfer.currency,
    requireSufficientFunds: false
  });

  await insertTransaction({
    accountId: transfer.source_account_id,
    transferId: transfer.id,
    type: "reversal",
    amount: transfer.amount,
    currency: transfer.currency,
    runningBalance: source.availableBalance,
    description:
      transfer.rail === "internal"
        ? "Internal transfer return"
        : `ACH return from ${transfer.destination_external_name ?? "external account"}`,
    metadata: {
      rail: transfer.rail,
      direction: "return"
    }
  });
  await snapshotBalance(source.id, source.availableBalance, source.currency, actorUserId);

  if (transfer.destination_account_id) {
    const destination = await updateAccountBalance({
      accountId: transfer.destination_account_id,
      delta: -transfer.amount,
      currency: transfer.currency,
      requireSufficientFunds: true
    });

    await insertTransaction({
      accountId: transfer.destination_account_id,
      transferId: transfer.id,
      type: "reversal",
      amount: -transfer.amount,
      currency: transfer.currency,
      runningBalance: destination.availableBalance,
      description: "Internal transfer reversal",
      metadata: {
        rail: transfer.rail,
        direction: "return"
      }
    });
    await snapshotBalance(
      destination.id,
      destination.availableBalance,
      destination.currency,
      actorUserId
    );
  }
}

export async function createAchTransfer(params: {
  sourceAccountId: string;
  amount: number;
  currency?: string;
  memo?: string | null;
  counterpartyName: string;
  routingNumber: string;
  accountNumber: string;
  actorUserId: string;
  actorRole: AppRole;
  idempotencyKey: string;
}) {
  const amount = assertPositiveAmount(params.amount);
  const currency = normalizeCurrency(params.currency);
  const sourceAccount = await getAccessibleAccount({
    accountId: params.sourceAccountId,
    actorUserId: params.actorUserId,
    actorRole: params.actorRole
  });

  if (sourceAccount.status !== "active") {
    throw new Error("Source account must be active to initiate an ACH transfer.");
  }

  if (sourceAccount.currency !== currency) {
    throw new Error("Transfer currency must match the source account currency.");
  }

  if (sourceAccount.available_balance < amount) {
    throw new Error("Insufficient available balance for the ACH transfer.");
  }

  const existing = await getExistingTransferByIdempotency(
    params.actorUserId,
    params.idempotencyKey
  );
  if (existing) {
    return { transfer: existing, replayed: true };
  }

  const routingNumber = validateRoutingNumber(params.routingNumber);
  const externalAccountMask = maskExternalAccount(params.accountNumber);
  const counterpartyName = params.counterpartyName.trim();
  if (!counterpartyName) {
    throw new Error("Counterparty name is required.");
  }

  const provider = await adapter.createAchTransfer({
    sourceAccountId: params.sourceAccountId,
    amount,
    currency,
    memo: params.memo?.trim() || null,
    counterpartyName,
    routingNumber,
    accountMask: externalAccountMask
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      rail: "ach",
      source_account_id: params.sourceAccountId,
      amount,
      currency,
      status: provider.status,
      memo: params.memo?.trim() || null,
      created_by: params.actorUserId,
      idempotency_key: params.idempotencyKey,
      provider: provider.provider,
      provider_transfer_id: provider.providerTransferId,
      provider_status: provider.status,
      destination_external_name: counterpartyName,
      destination_external_routing: routingNumber,
      destination_external_account_mask: externalAccountMask,
      metadata: {
        rail: "ach",
        providerRequest: {
          counterpartyName,
          routingNumber,
          accountMask: externalAccountMask
        },
        providerResponse: provider.rawResponse
      },
      processing_at: provider.status === "processing" ? new Date().toISOString() : null
    })
    .select(transferSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create ACH transfer.");
  }

  await insertTransferEvent({
    transferId: data.id as string,
    eventType: "transfer.created",
    previousStatus: null,
    nextStatus: provider.status,
    source: "payments_service",
    actorUserId: params.actorUserId,
    payload: provider.rawResponse
  });

  await evaluateTransferMonitoring({
    transferId: data.id as string,
    eventType: "transfer.created"
  });

  return {
    transfer: hydrateTransfer(data as Record<string, unknown>),
    replayed: false
  };
}

export async function createInternalTransfer(params: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency?: string;
  memo?: string | null;
  actorUserId: string;
  actorRole: AppRole;
  idempotencyKey: string;
}) {
  const amount = assertPositiveAmount(params.amount);
  const currency = normalizeCurrency(params.currency);

  if (params.sourceAccountId === params.destinationAccountId) {
    throw new Error("Source and destination accounts must be different.");
  }

  const [sourceAccount, destinationAccount] = await Promise.all([
    getAccessibleAccount({
      accountId: params.sourceAccountId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole
    }),
    getAccessibleAccount({
      accountId: params.destinationAccountId,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole
    })
  ]);

  if (sourceAccount.status !== "active" || destinationAccount.status !== "active") {
    throw new Error("Both accounts must be active for an internal transfer.");
  }

  if (sourceAccount.currency !== currency || destinationAccount.currency !== currency) {
    throw new Error("Transfer currency must match both account currencies.");
  }

  if (sourceAccount.available_balance < amount) {
    throw new Error("Insufficient available balance for the internal transfer.");
  }

  const existing = await getExistingTransferByIdempotency(
    params.actorUserId,
    params.idempotencyKey
  );
  if (existing) {
    return { transfer: existing, replayed: true };
  }

  const provider = await adapter.createInternalTransfer({
    sourceAccountId: params.sourceAccountId,
    destinationAccountId: params.destinationAccountId,
    amount,
    currency,
    memo: params.memo?.trim() || null
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      rail: "internal",
      source_account_id: params.sourceAccountId,
      destination_account_id: params.destinationAccountId,
      amount,
      currency,
      status: provider.status,
      memo: params.memo?.trim() || null,
      created_by: params.actorUserId,
      idempotency_key: params.idempotencyKey,
      provider: provider.provider,
      provider_transfer_id: provider.providerTransferId,
      provider_status: provider.status,
      metadata: {
        rail: "internal",
        providerResponse: provider.rawResponse
      },
      processing_at: new Date().toISOString()
    })
    .select(transferSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create internal transfer.");
  }

  await insertTransferEvent({
    transferId: data.id as string,
    eventType: "transfer.created",
    previousStatus: null,
    nextStatus: provider.status,
    source: "payments_service",
    actorUserId: params.actorUserId,
    payload: provider.rawResponse
  });

  await evaluateTransferMonitoring({
    transferId: data.id as string,
    eventType: "transfer.created"
  });

  const settled = await reconcileTransferStatus({
    transferId: data.id as string,
    nextStatus: "settled",
    actorUserId: params.actorUserId,
    source: "payments_service",
    payload: {
      autoSettled: true,
      providerTransferId: provider.providerTransferId
    }
  });

  return { transfer: settled.transfer, replayed: false };
}

export async function reconcileTransferStatus(params: {
  transferId: string;
  nextStatus: TransferStatus;
  actorUserId: string;
  source: string;
  providerEventId?: string | null;
  providerStatus?: string | null;
  failureReason?: string | null;
  returnReason?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const transfer = await getTransferRecord(params.transferId);

  if (params.providerEventId) {
    const existingEvent = await getTransferEventByProviderId(params.providerEventId);
    if (existingEvent) {
      return { transfer, replayed: true };
    }
  } else if (transfer.status === params.nextStatus) {
    return { transfer, replayed: true };
  }

  if (transfer.status !== params.nextStatus && !canTransition(transfer.status, params.nextStatus)) {
    throw new Error(`Cannot move transfer from ${transfer.status} to ${params.nextStatus}.`);
  }

  if (params.nextStatus === "settled") {
    await applySettlement(transfer, params.actorUserId);
  }

  if (params.nextStatus === "returned") {
    await applyReturn(transfer, params.actorUserId);
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: params.nextStatus,
    provider_status: params.providerStatus ?? params.nextStatus,
    metadata: {
      ...transfer.metadata,
      reconciliation: {
        ...(transfer.metadata.reconciliation as Record<string, unknown> | undefined),
        source: params.source,
        previousStatus: transfer.status,
        nextStatus: params.nextStatus,
        reconciledAt: nowIso,
        payload: params.payload ?? null
      }
    }
  };

  if (params.nextStatus === "processing") {
    patch.processing_at = nowIso;
  }

  if (params.nextStatus === "settled") {
    patch.settled_at = nowIso;
    patch.ledger_applied_at = transfer.ledger_applied_at ?? nowIso;
  }

  if (params.nextStatus === "returned") {
    patch.returned_at = nowIso;
    patch.return_reason = params.returnReason ?? transfer.return_reason;
    patch.reversal_applied_at = transfer.reversal_applied_at ?? (transfer.ledger_applied_at ? nowIso : null);
  }

  if (params.nextStatus === "failed") {
    patch.failed_at = nowIso;
    patch.failure_reason = params.failureReason ?? transfer.failure_reason;
  }

  const { data, error } = await supabase
    .from("transfers")
    .update(patch)
    .eq("id", params.transferId)
    .select(transferSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update transfer status.");
  }

  await insertTransferEvent({
    transferId: params.transferId,
    eventType: `transfer.${params.nextStatus}`,
    previousStatus: transfer.status,
    nextStatus: params.nextStatus,
    source: params.source,
    actorUserId: params.actorUserId,
    providerEventId: params.providerEventId ?? null,
    payload: params.payload
  });

  await evaluateTransferMonitoring({
    transferId: params.transferId,
    eventType: `transfer.${params.nextStatus}`
  });

  return {
    transfer: hydrateTransfer(data as Record<string, unknown>),
    replayed: false
  };
}

export async function getTransferEvents(transferId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfer_events")
    .select(
      "id, transfer_id, event_type, previous_status, next_status, source, provider_event_id, actor_user_id, payload, created_at"
    )
    .eq("transfer_id", transferId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TransferEventRecord[];
}





