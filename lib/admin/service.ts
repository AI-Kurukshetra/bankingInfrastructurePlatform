import { getMonitoringCaseDetail, listMonitoringAlerts } from "@/lib/monitoring/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AdminAuditItem,
  AdminDashboardData,
  AdminQueueCardItem,
  AdminQueueCaseItem,
  AdminQueueOnboardingItem,
  AdminQueuePaymentItem,
  AdminReviewDetail,
  AdminSupportNote,
  AdminTimelineEvent
} from "@/lib/admin/types";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

type ProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
};

async function getProfilesMap(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, ProfileRecord>();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((item) => [item.id as string, item as ProfileRecord]));
}

function actorFromMap(map: Map<string, ProfileRecord>, userId: string | null | undefined) {
  if (!userId) return null;
  const actor = map.get(userId);
  if (!actor) return null;
  return actor;
}

export async function recordAdminAuditEvent(params: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
    before_state: params.beforeState ?? null,
    after_state: params.afterState ?? null
  });

  if (error) throw new Error(error.message);
}

async function getSupportNotes(entityType: string, entityId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, metadata, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("action", "support_note.created")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const actors = await getProfilesMap((data ?? []).map((item) => item.actor_user_id as string));
  return ((data ?? []) as Array<{ id: string; actor_user_id: string | null; metadata: Record<string, unknown>; created_at: string }>).map((item) => ({
    id: item.id,
    note: String(item.metadata.note ?? ""),
    actor: actorFromMap(actors, item.actor_user_id),
    created_at: item.created_at
  })) as AdminSupportNote[];
}

export async function addSupportNote(params: {
  entityType: string;
  entityId: string;
  note: string;
  actorUserId: string;
}) {
  const note = params.note.trim();
  if (!note) throw new Error("Note is required.");

  await recordAdminAuditEvent({
    actorUserId: params.actorUserId,
    action: "support_note.created",
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: { note }
  });

  return getSupportNotes(params.entityType, params.entityId);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = createSupabaseAdminClient();

  const [
    onboardingResult,
    transfersResult,
    cardsResult,
    issuanceResult,
    webhooksResult,
    auditResult,
    summaryCounts,
    monitoringResult
  ] = await Promise.all([
    supabase
      .from("onboarding_applications")
      .select(
        "id, type, status, submitted_at, updated_at, review_notes, applicant_user_id, verification_checks(id, status, attempt_number, decision_reason, created_at)"
      )
      .in("status", ["submitted", "in_review", "more_info_needed", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("transfers")
      .select(
        "id, rail, amount, currency, status, memo, failure_reason, return_reason, provider_status, created_at, bank_accounts!transfers_source_account_id_fkey(id, account_name, account_number), destination:bank_accounts!transfers_destination_account_id_fkey(id, account_name, account_number)"
      )
      .in("status", ["pending", "processing", "returned", "failed"])
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("cards")
      .select(
        "id, status, nickname, last4, network, cardholder_name, created_at, bank_accounts(id, account_name, account_number)"
      )
      .in("status", ["inactive", "frozen"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("card_issuance_requests")
      .select(
        "id, status, error_message, card_id, created_at, cards(id, nickname, last4, network, cardholder_name, status, bank_accounts(id, account_name, account_number)), account_id, bank_accounts(id, account_name, account_number)"
      )
      .in("status", ["processing", "failed"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("webhook_events")
      .select("id, event_id, event_type, status, retry_count, last_error, received_at")
      .order("received_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, actor_user_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    Promise.all([
      supabase.from("onboarding_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "in_review", "more_info_needed", "rejected"]),
      supabase.from("transfers").select("id", { count: "exact", head: true }).in("status", ["pending", "processing", "returned", "failed"]),
      supabase.from("cards").select("id", { count: "exact", head: true }).in("status", ["inactive", "frozen"]),
      supabase.from("alerts").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
      supabase.from("cases").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
      supabase.from("webhook_events").select("id", { count: "exact", head: true }).in("status", ["failed", "dead_letter"])
    ]),
    listMonitoringAlerts({ status: "all", severity: "all", assigneeUserId: "all" })
  ]);

  if (onboardingResult.error) throw new Error(onboardingResult.error.message);
  if (transfersResult.error) throw new Error(transfersResult.error.message);
  if (cardsResult.error) throw new Error(cardsResult.error.message);
  if (issuanceResult.error) throw new Error(issuanceResult.error.message);
  if (webhooksResult.error) throw new Error(webhooksResult.error.message);
  if (auditResult.error) throw new Error(auditResult.error.message);

  const applicantIds = (onboardingResult.data ?? []).map((item) => item.applicant_user_id as string);
  const auditActorIds = (auditResult.data ?? []).map((item) => item.actor_user_id as string | null).filter(Boolean) as string[];
  const caseAssignees = monitoringResult.queue.map((item) => item.case?.assignee_user_id).filter(Boolean) as string[];
  const profiles = await getProfilesMap([...applicantIds, ...auditActorIds, ...caseAssignees]);

  const onboardingQueue: AdminQueueOnboardingItem[] = ((onboardingResult.data ?? []) as Array<Record<string, unknown>>).map((item) => {
    const verificationChecks = ((item.verification_checks as Array<Record<string, unknown>> | null) ?? []).sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());
    const latest = verificationChecks[0] ?? null;
    const applicantId = item.applicant_user_id as string;
    return {
      id: item.id as string,
      type: item.type as "consumer" | "business",
      status: item.status as string,
      submitted_at: item.submitted_at as string | null,
      updated_at: item.updated_at as string,
      review_notes: item.review_notes as string | null,
      applicant: actorFromMap(profiles, applicantId),
      latestVerification: latest
        ? {
            id: latest.id as string,
            status: latest.status as string,
            attempt_number: Number(latest.attempt_number),
            decision_reason: latest.decision_reason as string | null,
            created_at: latest.created_at as string
          }
        : null
    };
  });

  const paymentIssues: AdminQueuePaymentItem[] = ((transfersResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: item.id as string,
    rail: item.rail as string,
    amount: Number(item.amount),
    currency: item.currency as string,
    status: item.status as string,
    memo: item.memo as string | null,
    failure_reason: item.failure_reason as string | null,
    return_reason: item.return_reason as string | null,
    provider_status: item.provider_status as string | null,
    created_at: item.created_at as string,
    sourceAccount: Array.isArray(item.bank_accounts)
      ? (item.bank_accounts[0] as AdminQueuePaymentItem["sourceAccount"])
      : ((item.bank_accounts as AdminQueuePaymentItem["sourceAccount"]) ?? null),
    destinationAccount: Array.isArray(item.destination)
      ? (item.destination[0] as AdminQueuePaymentItem["destinationAccount"])
      : ((item.destination as AdminQueuePaymentItem["destinationAccount"]) ?? null)
  }));

  const cardStatusItems: AdminQueueCardItem[] = ((cardsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: item.id as string,
    workflow: "card_status",
    status: item.status as string,
    nickname: item.nickname as string | null,
    last4: item.last4 as string | null,
    network: item.network as string | null,
    cardholder_name: item.cardholder_name as string | null,
    created_at: item.created_at as string,
    account: Array.isArray(item.bank_accounts)
      ? (item.bank_accounts[0] as AdminQueueCardItem["account"])
      : ((item.bank_accounts as AdminQueueCardItem["account"]) ?? null),
    issuanceRequestId: null,
    issuanceError: null
  }));

  const issuanceItems: AdminQueueCardItem[] = ((issuanceResult.data ?? []) as Array<Record<string, unknown>>).map((item) => {
    const cardValue = item.cards as Record<string, unknown> | Array<Record<string, unknown>> | null | undefined;
    const accountValue =
      item.bank_accounts as
        | Record<string, unknown>
        | Array<Record<string, unknown>>
        | null
        | undefined;
    const card = Array.isArray(cardValue) ? (cardValue[0] ?? null) : (cardValue ?? null);
    const cardAccountValue = card?.bank_accounts as
      | Record<string, unknown>
      | Array<Record<string, unknown>>
      | null
      | undefined;
    const account = Array.isArray(accountValue)
      ? (accountValue[0] ?? null)
      : (accountValue ?? (Array.isArray(cardAccountValue) ? (cardAccountValue[0] ?? null) : (cardAccountValue ?? null)));

    return {
      id: (card && (card as Record<string, unknown>).id ? (card as Record<string, unknown>).id : item.id) as string,
      workflow: "issuance_request",
      status: item.status as string,
      nickname: card ? ((card as Record<string, unknown>).nickname as string | null) : null,
      last4: card ? ((card as Record<string, unknown>).last4 as string | null) : null,
      network: card ? ((card as Record<string, unknown>).network as string | null) : null,
      cardholder_name: card ? ((card as Record<string, unknown>).cardholder_name as string | null) : null,
      created_at: item.created_at as string,
      account: (account as AdminQueueCardItem["account"]) ?? null,
      issuanceRequestId: item.id as string,
      issuanceError: item.error_message as string | null
    };
  });

  const alertCases: AdminQueueCaseItem[] = monitoringResult.queue.slice(0, 12).map((item) => ({
    id: item.id,
    case_id: item.case?.id ?? item.id,
    severity: item.severity,
    title: item.title,
    description: item.description,
    status: item.case?.status ?? item.status,
    disposition: item.case?.disposition ?? "pending_review",
    priority: item.case?.priority ?? "medium",
    assignee: item.case?.assignee ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));

  const recentAudit: AdminAuditItem[] = ((auditResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
    id: item.id as string,
    action: item.action as string,
    entity_type: item.entity_type as string,
    entity_id: (item.entity_id as string | null) ?? null,
    actor: actorFromMap(profiles, item.actor_user_id as string | null),
    metadata: (item.metadata as Record<string, unknown> | null) ?? {},
    created_at: item.created_at as string
  }));

  const recentFailures = ((webhooksResult.data ?? []) as Array<Record<string, unknown>>)
    .filter((item) => ["failed", "dead_letter"].includes(String(item.status)))
    .slice(0, 6)
    .map((item) => ({
      id: item.id as string,
      event_id: item.event_id as string,
      event_type: item.event_type as string,
      status: item.status as string,
      retry_count: Number(item.retry_count),
      last_error: item.last_error as string | null,
      received_at: item.received_at as string
    }));

  const [onboardingCount, paymentCount, cardCount, alertCount, caseCount, failedWebhookCount] = summaryCounts;
  return {
    summary: {
      onboardingPending: onboardingCount.count ?? 0,
      paymentIssues: paymentCount.count ?? 0,
      cardActions: (cardCount.count ?? 0) + issuanceItems.length,
      openAlerts: alertCount.count ?? 0,
      openCases: caseCount.count ?? 0,
      failedWebhooks: failedWebhookCount.count ?? 0
    },
    onboardingQueue,
    paymentIssues,
    cardOperations: [...issuanceItems, ...cardStatusItems].slice(0, 12),
    alertCases,
    webhookHealth: {
      pending: ((webhooksResult.data ?? []) as Array<Record<string, unknown>>).filter((item) => item.status === "pending").length,
      processing: ((webhooksResult.data ?? []) as Array<Record<string, unknown>>).filter((item) => item.status === "processing").length,
      failed: ((webhooksResult.data ?? []) as Array<Record<string, unknown>>).filter((item) => item.status === "failed").length,
      deadLetter: ((webhooksResult.data ?? []) as Array<Record<string, unknown>>).filter((item) => item.status === "dead_letter").length,
      recentFailures
    },
    recentAudit
  };
}

export async function getAdminReviewDetail(kind: "onboarding" | "payment" | "card" | "case", id: string): Promise<AdminReviewDetail> {
  const supabase = createSupabaseAdminClient();

  if (kind === "onboarding") {
    const { data, error } = await supabase
      .from("onboarding_applications")
      .select("id, type, status, review_notes, submitted_at, updated_at, applicant_user_id, verification_checks(id, status, attempt_number, decision_reason, created_at, reviewed_by, review_notes)")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Onboarding application not found.");

    const checks = ((data.verification_checks ?? []) as Array<Record<string, unknown>>).sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime());
    const actors = await getProfilesMap(checks.map((item) => item.reviewed_by as string));
    const supportNotes = await getSupportNotes("onboarding_application", id);
    const timeline: AdminTimelineEvent[] = checks.map((item) => ({
      id: item.id as string,
      title: `Verification attempt #${Number(item.attempt_number)}`,
      detail: `${item.status as string}${item.decision_reason ? ` - ${String(item.decision_reason)}` : ""}`,
      occurred_at: item.created_at as string,
      actor: actorFromMap(actors, item.reviewed_by as string | null),
      tone: ["rejected", "failed"].includes(String(item.status)) ? "warning" : item.status === "approved" ? "positive" : "neutral"
    }));

    return {
      kind,
      id,
      title: `${String(data.type).charAt(0).toUpperCase()}${String(data.type).slice(1)} onboarding`,
      subtitle: `Submitted ${data.submitted_at ? new Date(String(data.submitted_at)).toLocaleString() : "not yet"}`,
      status: data.status as string,
      badges: [String(data.type), String(data.status)],
      summary: [
        { label: "Application", value: id },
        { label: "Checks", value: String(checks.length) },
        { label: "Latest note", value: (data.review_notes as string | null) ?? "-" }
      ],
      timeline,
      supportNotes
    };
  }

  if (kind === "payment") {
    const [transferResult, eventsResult, transactionsResult] = await Promise.all([
      supabase.from("transfers").select("id, rail, amount, currency, status, memo, failure_reason, return_reason, created_at").eq("id", id).single(),
      supabase.from("transfer_events").select("id, event_type, previous_status, next_status, actor_user_id, created_at").eq("transfer_id", id).order("created_at", { ascending: true }),
      supabase.from("transactions").select("id, type, amount, currency, description, created_at").eq("transfer_id", id).order("created_at", { ascending: true })
    ]);
    if (transferResult.error || !transferResult.data) throw new Error(transferResult.error?.message ?? "Transfer not found.");
    if (eventsResult.error) throw new Error(eventsResult.error.message);
    if (transactionsResult.error) throw new Error(transactionsResult.error.message);

    const eventActors = await getProfilesMap(((eventsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => item.actor_user_id as string));
    const supportNotes = await getSupportNotes("transfer", id);
    const timeline: AdminTimelineEvent[] = [
      ...((eventsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        title: item.event_type as string,
        detail: `${(item.previous_status as string | null) ?? "new"} -> ${(item.next_status as string | null) ?? "unchanged"}`,
        occurred_at: item.created_at as string,
        actor: actorFromMap(eventActors, item.actor_user_id as string | null),
        tone: (["failed", "returned"].includes(String(item.next_status)) ? "warning" : item.next_status === "settled" ? "positive" : "neutral") as AdminTimelineEvent["tone"]
      })),
      ...((transactionsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        title: item.description as string,
        detail: `${item.type as string} ${formatMoney(Number(item.amount), item.currency as string)}`,
        occurred_at: item.created_at as string,
        actor: null,
        tone: (Number(item.amount) < 0 ? "warning" : "neutral") as AdminTimelineEvent["tone"]
      }))
    ].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

    return {
      kind,
      id,
      title: `${String(transferResult.data.rail).toUpperCase()} payment issue`,
      subtitle: transferResult.data.memo ?? "Operational transfer review",
      status: transferResult.data.status as string,
      badges: [transferResult.data.rail as string, transferResult.data.status as string],
      summary: [
        { label: "Transfer", value: id },
        { label: "Amount", value: formatMoney(Number(transferResult.data.amount), transferResult.data.currency as string) },
        { label: "Reason", value: (transferResult.data.failure_reason as string | null) ?? (transferResult.data.return_reason as string | null) ?? "-" }
      ],
      timeline,
      supportNotes
    };
  }

  if (kind === "card") {
    const [cardResult, eventsResult, feedResult] = await Promise.all([
      supabase.from("cards").select("id, status, nickname, last4, network, cardholder_name, created_at").eq("id", id).single(),
      supabase.from("card_lifecycle_events").select("id, event_type, previous_status, next_status, actor_user_id, created_at").eq("card_id", id).order("created_at", { ascending: true }),
      supabase.from("card_transaction_feed").select("id, status, amount, currency, merchant_name, merchant_category_code, created_at").eq("card_id", id).order("created_at", { ascending: false }).limit(12)
    ]);
    if (cardResult.error || !cardResult.data) throw new Error(cardResult.error?.message ?? "Card not found.");
    if (eventsResult.error) throw new Error(eventsResult.error.message);
    if (feedResult.error) throw new Error(feedResult.error.message);

    const eventActors = await getProfilesMap(((eventsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => item.actor_user_id as string));
    const supportNotes = await getSupportNotes("card", id);
    const timeline: AdminTimelineEvent[] = [
      ...((eventsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        title: item.event_type as string,
        detail: `${(item.previous_status as string | null) ?? "new"} -> ${(item.next_status as string | null) ?? "unchanged"}`,
        occurred_at: item.created_at as string,
        actor: actorFromMap(eventActors, item.actor_user_id as string | null),
        tone: (item.next_status === "terminated" ? "critical" : item.next_status === "active" ? "positive" : "neutral") as AdminTimelineEvent["tone"]
      })),
      ...((feedResult.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        title: (item.merchant_name as string | null) ?? `Card ${String(item.status)}`,
        detail: `${formatMoney(Number(item.amount), item.currency as string)} MCC ${(item.merchant_category_code as string | null) ?? "-"}`,
        occurred_at: item.created_at as string,
        actor: null,
        tone: (["declined", "reversed"].includes(String(item.status)) ? "warning" : "neutral") as AdminTimelineEvent["tone"]
      }))
    ].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

    return {
      kind,
      id,
      title: `${cardResult.data.nickname ?? cardResult.data.network ?? "Card"} review`,
      subtitle: `•••• ${cardResult.data.last4 as string}`,
      status: cardResult.data.status as string,
      badges: [cardResult.data.status as string, (cardResult.data.network as string) ?? "card"],
      summary: [
        { label: "Card", value: id },
        { label: "Cardholder", value: (cardResult.data.cardholder_name as string | null) ?? "-" },
        { label: "Feed events", value: String((feedResult.data ?? []).length) }
      ],
      timeline,
      supportNotes
    };
  }

  const caseDetail = await getMonitoringCaseDetail(id);
  return {
    kind,
    id,
    title: caseDetail.alert.title,
    subtitle: caseDetail.alert.description ?? "Alert case review",
    status: caseDetail.status,
    badges: [caseDetail.alert.severity, caseDetail.priority, caseDetail.disposition],
    summary: [
      { label: "Case", value: caseDetail.id },
      { label: "Alert", value: caseDetail.alert_id },
      { label: "Assignee", value: caseDetail.assignee?.full_name ?? caseDetail.assignee?.email ?? "Unassigned" }
    ],
    timeline: caseDetail.timeline.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.description,
      occurred_at: item.occurred_at,
      actor: item.actor,
      tone: item.tone
    })),
    supportNotes: await getSupportNotes("case", id)
  };
}

export async function exportAdminReport(kind: "overview" | "audit" = "overview", format: "json" | "csv" = "json") {
  const data = await getAdminDashboardData();
  if (format === "json") {
    return {
      contentType: "application/json",
      body: JSON.stringify(kind === "audit" ? data.recentAudit : data, null, 2)
    };
  }

  const rows = kind === "audit"
    ? [
        ["id", "action", "entity_type", "entity_id", "actor", "created_at"],
        ...data.recentAudit.map((item) => [item.id, item.action, item.entity_type, item.entity_id ?? "", item.actor?.email ?? item.actor?.full_name ?? "", item.created_at])
      ]
    : [
        ["metric", "value"],
        ["onboardingPending", String(data.summary.onboardingPending)],
        ["paymentIssues", String(data.summary.paymentIssues)],
        ["cardActions", String(data.summary.cardActions)],
        ["openAlerts", String(data.summary.openAlerts)],
        ["openCases", String(data.summary.openCases)],
        ["failedWebhooks", String(data.summary.failedWebhooks)]
      ];

  const body = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  return {
    contentType: "text/csv",
    body
  };
}


