import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SyncteraMockAccountsAdapter } from "@/lib/accounts/adapters";
import type { AccountStatus } from "@/lib/accounts/types";

const adapter = new SyncteraMockAccountsAdapter();

type OnboardingForProvision = {
  id: string;
  applicant_user_id: string;
  organization_id: string | null;
  type: "consumer" | "business";
  status: string;
};

type BankAccountRecord = {
  id: string;
  onboarding_application_id: string | null;
  owner_user_id: string | null;
  organization_id: string | null;
  account_name: string;
  account_number: string;
  status: AccountStatus;
  currency: string;
  available_balance: number;
  synctera_account_id: string | null;
  created_at: string;
  updated_at: string;
};

function nextStatusForAction(action: "freeze" | "unfreeze" | "close") {
  if (action === "freeze") return "frozen" as const;
  if (action === "unfreeze") return "active" as const;
  return "closed" as const;
}

function canTransition(currentStatus: AccountStatus, action: "freeze" | "unfreeze" | "close") {
  if (action === "freeze") return currentStatus === "active";
  if (action === "unfreeze") return currentStatus === "frozen";
  if (action === "close") return currentStatus !== "closed";
  return false;
}

async function insertLifecycleEvent(params: {
  accountId: string;
  eventType: string;
  previousStatus: AccountStatus | null;
  nextStatus: AccountStatus | null;
  actorUserId: string;
  details?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("account_lifecycle_events")
    .insert({
      account_id: params.accountId,
      event_type: params.eventType,
      previous_status: params.previousStatus,
      next_status: params.nextStatus,
      actor_user_id: params.actorUserId,
      source: "accounts_service",
      details: params.details ?? {}
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to write account lifecycle event.");
  }

  return data.id as string;
}

async function insertBalanceSnapshot(params: {
  accountId: string;
  availableBalance: number;
  currency: string;
  actorUserId: string;
  sourceEventId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("account_balance_snapshots").insert({
    account_id: params.accountId,
    available_balance: params.availableBalance,
    currency: params.currency,
    source_event_id: params.sourceEventId ?? null,
    captured_by_user_id: params.actorUserId
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function provisionAccountFromApprovedApplication(params: {
  onboardingApplicationId: string;
  actorUserId: string;
  idempotencyKey: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { onboardingApplicationId, actorUserId, idempotencyKey } = params;

  const { data: existingRequest } = await supabase
    .from("account_provisioning_requests")
    .select("id, status, account_id")
    .eq("onboarding_application_id", onboardingApplicationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingRequest?.account_id) {
    const { data: account } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("id", existingRequest.account_id)
      .single();

    return { account, replayed: true };
  }

  const { data: existingAccount } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("onboarding_application_id", onboardingApplicationId)
    .maybeSingle();

  if (existingAccount) {
    await supabase
      .from("account_provisioning_requests")
      .upsert(
        {
          onboarding_application_id: onboardingApplicationId,
          idempotency_key: idempotencyKey,
          requested_by: actorUserId,
          status: "completed",
          account_id: existingAccount.id,
          provider: "synctera_mock",
          provider_response: { source: "existing_account" }
        },
        { onConflict: "onboarding_application_id,idempotency_key" }
      );

    return { account: existingAccount, replayed: true };
  }

  const { data: application, error: appError } = await supabase
    .from("onboarding_applications")
    .select("id, applicant_user_id, organization_id, type, status")
    .eq("id", onboardingApplicationId)
    .single();

  if (appError || !application) {
    throw new Error(appError?.message ?? "Onboarding application not found.");
  }

  const appRow = application as OnboardingForProvision;
  if (appRow.status !== "approved") {
    throw new Error("Only approved applications can be converted into accounts.");
  }

  const providerRequest = {
    onboardingApplicationId,
    ownerUserId: appRow.applicant_user_id,
    organizationId: appRow.organization_id,
    type: appRow.type
  };

  const { data: requestRow, error: requestError } = await supabase
    .from("account_provisioning_requests")
    .upsert(
      {
        onboarding_application_id: onboardingApplicationId,
        idempotency_key: idempotencyKey,
        requested_by: actorUserId,
        status: "processing",
        provider: "synctera_mock",
        provider_request: providerRequest
      },
      { onConflict: "onboarding_application_id,idempotency_key" }
    )
    .select("id")
    .single();

  if (requestError || !requestRow) {
    throw new Error(requestError?.message ?? "Unable to create provisioning request.");
  }

  try {
    const providerResult = await adapter.createAccount({
      onboardingApplicationId,
      ownerUserId: appRow.applicant_user_id,
      organizationId: appRow.organization_id,
      accountName:
        appRow.type === "business" ? "Business Operating Account" : "Personal Checking",
      currency: "USD"
    });

    const { data: createdAccount, error: createError } = await supabase
      .from("bank_accounts")
      .insert({
        onboarding_application_id: onboardingApplicationId,
        organization_id: appRow.organization_id,
        owner_user_id: appRow.applicant_user_id,
        account_name:
          appRow.type === "business" ? "Business Operating Account" : "Personal Checking",
        account_number: providerResult.accountNumber,
        status: providerResult.status,
        currency: "USD",
        available_balance: providerResult.availableBalance,
        synctera_account_id: providerResult.syncteraAccountId
      })
      .select("*")
      .single();

    if (createError || !createdAccount) {
      throw new Error(createError?.message ?? "Unable to create bank account record.");
    }

    const lifecycleEventId = await insertLifecycleEvent({
      accountId: createdAccount.id,
      eventType: "account.created",
      previousStatus: null,
      nextStatus: createdAccount.status,
      actorUserId,
      details: {
        provider: providerResult.provider,
        syncteraAccountId: providerResult.syncteraAccountId,
        onboardingApplicationId
      }
    });

    await insertBalanceSnapshot({
      accountId: createdAccount.id,
      availableBalance: Number(createdAccount.available_balance),
      currency: createdAccount.currency,
      actorUserId,
      sourceEventId: lifecycleEventId
    });

    await supabase
      .from("account_provisioning_requests")
      .update({
        status: "completed",
        account_id: createdAccount.id,
        provider_response: providerResult.rawResponse
      })
      .eq("id", requestRow.id);

    return { account: createdAccount as BankAccountRecord, replayed: false };
  } catch (error) {
    await supabase
      .from("account_provisioning_requests")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Provisioning failed"
      })
      .eq("id", requestRow.id);

    throw error;
  }
}

export async function getLatestBalanceSnapshot(accountId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("account_balance_snapshots")
    .select("id, available_balance, currency, captured_at")
    .eq("account_id", accountId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getAccountLifecycleEvents(accountId: string, limit = 20) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("account_lifecycle_events")
    .select("id, event_type, previous_status, next_status, source, details, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function syncAccountFromProvider(params: {
  accountId: string;
  actorUserId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: account, error } = await supabase
    .from("bank_accounts")
    .select("id, status, available_balance, currency, synctera_account_id")
    .eq("id", params.accountId)
    .single();

  if (error || !account) {
    throw new Error(error?.message ?? "Account not found.");
  }

  if (!account.synctera_account_id) {
    throw new Error("Account does not have provider reference for sync.");
  }

  const providerDetails = await adapter.getAccountDetails(account.synctera_account_id);

  const { data: updated, error: updateError } = await supabase
    .from("bank_accounts")
    .update({
      status: providerDetails.status,
      available_balance: providerDetails.availableBalance,
      currency: providerDetails.currency
    })
    .eq("id", params.accountId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Unable to sync account details.");
  }

  const lifecycleEventId = await insertLifecycleEvent({
    accountId: params.accountId,
    eventType: "account.synced",
    previousStatus: account.status,
    nextStatus: providerDetails.status,
    actorUserId: params.actorUserId,
    details: providerDetails.rawResponse
  });

  await insertBalanceSnapshot({
    accountId: params.accountId,
    availableBalance: providerDetails.availableBalance,
    currency: providerDetails.currency,
    actorUserId: params.actorUserId,
    sourceEventId: lifecycleEventId
  });

  return updated;
}

export async function updateAccountStatus(params: {
  accountId: string;
  action: "freeze" | "unfreeze" | "close";
  actorUserId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: account, error } = await supabase
    .from("bank_accounts")
    .select("id, status, available_balance, currency, synctera_account_id")
    .eq("id", params.accountId)
    .single();

  if (error || !account) {
    throw new Error(error?.message ?? "Account not found.");
  }

  const currentStatus = account.status as AccountStatus;
  if (!canTransition(currentStatus, params.action)) {
    throw new Error(`Cannot ${params.action} account from status ${currentStatus}.`);
  }

  const nextStatus = nextStatusForAction(params.action);

  let providerResponse: Record<string, unknown> = {
    adapter: "none",
    action: params.action
  };

  if (account.synctera_account_id) {
    const provider = await adapter.updateAccountStatus(
      account.synctera_account_id,
      currentStatus,
      nextStatus
    );
    providerResponse = provider.rawResponse;
  }

  const { data: updated, error: updateError } = await supabase
    .from("bank_accounts")
    .update({ status: nextStatus })
    .eq("id", params.accountId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Unable to update account status.");
  }

  const lifecycleEventId = await insertLifecycleEvent({
    accountId: params.accountId,
    eventType: `account.${params.action}`,
    previousStatus: currentStatus,
    nextStatus,
    actorUserId: params.actorUserId,
    details: providerResponse
  });

  await insertBalanceSnapshot({
    accountId: params.accountId,
    availableBalance: Number(updated.available_balance),
    currency: updated.currency,
    actorUserId: params.actorUserId,
    sourceEventId: lifecycleEventId
  });

  return updated;
}

