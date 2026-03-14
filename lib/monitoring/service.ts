import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AlertQueueItem,
  CaseDisposition,
  CaseNoteRecord,
  CasePriority,
  MonitoringCaseDetail,
  MonitoringCaseStatus,
  MonitoringSeverity,
  MonitoringSourceType,
  StaffOption,
  TimelineItem
} from "@/lib/monitoring/types";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

type AlertQueueFilters = {
  severity?: MonitoringSeverity | "all";
  status?: MonitoringCaseStatus | "all";
  assigneeUserId?: string | "all";
};

type AlertRecord = {
  id: string;
  severity: MonitoringSeverity;
  title: string;
  description: string | null;
  status: MonitoringCaseStatus;
  rule_code: string | null;
  source_type: MonitoringSourceType | null;
  source_record_id: string | null;
  dedup_key: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  account_id: string | null;
  transfer_id: string | null;
  transaction_id: string | null;
  card_id: string | null;
  bank_accounts?: {
    id: string;
    account_name: string;
    account_number: string;
    currency: string;
    status: string;
  } | null;
  transfers?: {
    id: string;
    rail: string;
    amount: number | string;
    currency: string;
    status: string;
    destination_external_name: string | null;
    created_at: string;
  } | null;
  cards?: {
    id: string;
    last4: string;
    status: string;
    nickname: string | null;
    network: string;
  } | null;
};

type CaseRecord = {
  id: string;
  alert_id: string;
  assignee_user_id: string | null;
  status: MonitoringCaseStatus;
  priority: CasePriority;
  disposition: CaseDisposition;
  resolution_notes: string | null;
  escalated_at: string | null;
  closed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: StaffOption["role"];
};

type NoteRecord = {
  id: string;
  case_id: string;
  author_user_id: string | null;
  note: string;
  visibility: string;
  created_at: string;
};

type CaseEventRecord = {
  id: string;
  case_id: string;
  event_type: string;
  title: string;
  details: Record<string, unknown> | null;
  actor_user_id: string | null;
  created_at: string;
};

type TransferEventRecord = {
  id: string;
  transfer_id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string | null;
  actor_user_id: string | null;
  created_at: string;
};

type TransactionRecord = {
  id: string;
  account_id: string;
  card_id: string | null;
  transfer_id: string | null;
  type: string;
  amount: number | string;
  currency: string;
  description: string | null;
  merchant_name: string | null;
  merchant_category_code: string | null;
  metadata: Record<string, unknown> | null;
  posted_at: string | null;
  created_at: string;
};

type CardFeedRecord = {
  id: string;
  card_id: string;
  account_id: string;
  status: string;
  amount: number | string;
  currency: string;
  merchant_name: string | null;
  merchant_category_code: string | null;
  metadata: Record<string, unknown> | null;
  authorized_at: string | null;
  posted_at: string | null;
  created_at: string;
};

type MonitoringRuleRecord = {
  id: string;
  rule_code: string;
  name: string;
  description: string | null;
  severity: MonitoringSeverity;
  source_types: MonitoringSourceType[];
  is_active: boolean;
  config: Record<string, unknown> | null;
};

function toStaffOption(record: ProfileRecord | null | undefined): StaffOption | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    full_name: record.full_name,
    email: record.email,
    role: record.role
  };
}

async function getProfilesMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, StaffOption>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((record) => [record.id as string, toStaffOption(record as ProfileRecord)!]));
}

function priorityFromSeverity(severity: MonitoringSeverity): CasePriority {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

async function insertCaseEvent(params: {
  caseId: string;
  eventType: string;
  title: string;
  actorUserId?: string | null;
  details?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("case_events").insert({
    case_id: params.caseId,
    event_type: params.eventType,
    title: params.title,
    details: params.details ?? {},
    actor_user_id: params.actorUserId ?? null
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function touchCase(caseId: string, patch: Partial<CaseRecord>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cases")
    .update({
      ...patch,
      last_activity_at: new Date().toISOString()
    })
    .eq("id", caseId)
    .select(
      "id, alert_id, assignee_user_id, status, priority, disposition, resolution_notes, escalated_at, closed_at, last_activity_at, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update case.");
  }

  return data as CaseRecord;
}

async function getCaseRecord(caseId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cases")
    .select(
      "id, alert_id, assignee_user_id, status, priority, disposition, resolution_notes, escalated_at, closed_at, last_activity_at, created_at, updated_at"
    )
    .eq("id", caseId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Case not found.");
  }

  return data as CaseRecord;
}

async function getAlertById(alertId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("alerts")
    .select(
      "id, severity, title, description, status, rule_code, source_type, source_record_id, dedup_key, payload, created_at, updated_at, escalated_at, account_id, transfer_id, transaction_id, card_id, bank_accounts(id, account_name, account_number, currency, status), transfers(id, rail, amount, currency, status, destination_external_name, created_at), cards(id, last4, status, nickname, network)"
    )
    .eq("id", alertId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Alert not found.");
  }

  return data as unknown as AlertRecord;
}

function normalizeAlertRecord(
  alert: AlertRecord,
  caseRecord: CaseRecord | null,
  assignees: Map<string, StaffOption>
): AlertQueueItem {
  return {
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    status: alert.status,
    rule_code: alert.rule_code,
    source_type: alert.source_type,
    source_record_id: alert.source_record_id,
    dedup_key: alert.dedup_key,
    payload: alert.payload ?? {},
    created_at: alert.created_at,
    updated_at: alert.updated_at,
    escalated_at: alert.escalated_at,
    account_id: alert.account_id,
    transfer_id: alert.transfer_id,
    transaction_id: alert.transaction_id,
    card_id: alert.card_id,
    account: alert.bank_accounts ?? null,
    transfer: alert.transfers
      ? {
          ...alert.transfers,
          amount: Number(alert.transfers.amount)
        }
      : null,
    card: alert.cards ?? null,
    case: caseRecord
      ? {
          id: caseRecord.id,
          assignee_user_id: caseRecord.assignee_user_id,
          assignee: caseRecord.assignee_user_id
            ? assignees.get(caseRecord.assignee_user_id) ?? null
            : null,
          status: caseRecord.status,
          priority: caseRecord.priority,
          disposition: caseRecord.disposition,
          resolution_notes: caseRecord.resolution_notes,
          escalated_at: caseRecord.escalated_at,
          closed_at: caseRecord.closed_at,
          last_activity_at: caseRecord.last_activity_at,
          created_at: caseRecord.created_at,
          updated_at: caseRecord.updated_at
        }
      : null
  };
}

export async function listMonitoringRules() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("monitoring_rules")
    .select("id, rule_code, name, description, severity, source_types, is_active, config")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MonitoringRuleRecord[]).map((rule) => ({
    ...rule,
    config: rule.config ?? {}
  }));
}

export async function listMonitoringStaffOptions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["analyst", "admin", "developer"])
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileRecord[]).map((record) => toStaffOption(record)!);
}

export async function listMonitoringAlerts(filters: AlertQueueFilters = {}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("alerts")
    .select(
      "id, severity, title, description, status, rule_code, source_type, source_record_id, dedup_key, payload, created_at, updated_at, escalated_at, account_id, transfer_id, transaction_id, card_id, bank_accounts(id, account_name, account_number, currency, status), transfers(id, rail, amount, currency, status, destination_external_name, created_at), cards(id, last4, status, nickname, network)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data: alertRows, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const alerts = (alertRows ?? []) as unknown as AlertRecord[];
  const alertIds = alerts.map((alert) => alert.id);
  const emptyId = "00000000-0000-0000-0000-000000000000";
  const { data: caseRows, error: caseError } = await supabase
    .from("cases")
    .select(
      "id, alert_id, assignee_user_id, status, priority, disposition, resolution_notes, escalated_at, closed_at, last_activity_at, created_at, updated_at"
    )
    .in("alert_id", alertIds.length > 0 ? alertIds : [emptyId]);

  if (caseError) {
    throw new Error(caseError.message);
  }
  let cases = (caseRows ?? []) as CaseRecord[];
  if (filters.assigneeUserId && filters.assigneeUserId !== "all") {
    cases = cases.filter((item) => item.assignee_user_id === filters.assigneeUserId);
  }

  const caseMap = new Map(cases.map((item) => [item.alert_id, item]));
  const assignees = await getProfilesMap(
    cases
      .map((item) => item.assignee_user_id)
      .filter((value): value is string => Boolean(value))
  );

  const queue = alerts
    .filter((alert) => caseMap.has(alert.id))
    .map((alert) => normalizeAlertRecord(alert, caseMap.get(alert.id) ?? null, assignees));

  return {
    queue,
    staff: await listMonitoringStaffOptions(),
    rules: await listMonitoringRules()
  };
}

export async function getMonitoringCaseDetail(caseId: string): Promise<MonitoringCaseDetail> {
  const caseRecord = await getCaseRecord(caseId);
  const alert = await getAlertById(caseRecord.alert_id);
  const supabase = createSupabaseAdminClient();

  const [notesResult, caseEventsResult, transferEventsResult, transactionResult, cardFeedResult] =
    await Promise.all([
      supabase
        .from("case_notes")
        .select("id, case_id, author_user_id, note, visibility, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false }),
      supabase
        .from("case_events")
        .select("id, case_id, event_type, title, details, actor_user_id, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true }),
      alert.transfer_id
        ? supabase
            .from("transfer_events")
            .select("id, transfer_id, event_type, previous_status, next_status, actor_user_id, created_at")
            .eq("transfer_id", alert.transfer_id)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      alert.transaction_id
        ? supabase
            .from("transactions")
            .select(
              "id, account_id, card_id, transfer_id, type, amount, currency, description, merchant_name, merchant_category_code, metadata, posted_at, created_at"
            )
            .eq("id", alert.transaction_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      alert.source_type === "card_transaction" && alert.source_record_id
        ? supabase
            .from("card_transaction_feed")
            .select(
              "id, card_id, account_id, status, amount, currency, merchant_name, merchant_category_code, metadata, authorized_at, posted_at, created_at"
            )
            .eq("id", alert.source_record_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

  if (notesResult.error) throw new Error(notesResult.error.message);
  if (caseEventsResult.error) throw new Error(caseEventsResult.error.message);
  if (transferEventsResult.error) throw new Error(transferEventsResult.error.message);
  if (transactionResult.error) throw new Error(transactionResult.error.message);
  if (cardFeedResult.error) throw new Error(cardFeedResult.error.message);

  const caseEvents = (caseEventsResult.data ?? []) as CaseEventRecord[];
  const transferEvents = (transferEventsResult.data ?? []) as TransferEventRecord[];
  const notes = (notesResult.data ?? []) as NoteRecord[];
  const transaction = transactionResult.data as TransactionRecord | null;
  const cardFeed = cardFeedResult.data as CardFeedRecord | null;

  const actorIds = [
    caseRecord.assignee_user_id,
    ...notes.map((note) => note.author_user_id),
    ...caseEvents.map((event) => event.actor_user_id),
    ...transferEvents.map((event) => event.actor_user_id)
  ].filter((value): value is string => Boolean(value));
  const people = await getProfilesMap(actorIds);

  const normalizedAlert = normalizeAlertRecord(alert, caseRecord, people);
  const normalizedNotes: CaseNoteRecord[] = notes.map((note) => ({
    id: note.id,
    case_id: note.case_id,
    author_user_id: note.author_user_id,
    author: note.author_user_id ? people.get(note.author_user_id) ?? null : null,
    note: note.note,
    visibility: note.visibility,
    created_at: note.created_at
  }));

  const timeline: TimelineItem[] = [
    ...caseEvents.map((event) => ({
      id: event.id,
      type: "case_event" as const,
      title: event.title,
      description: event.event_type.replaceAll("_", " "),
      occurred_at: event.created_at,
      actor: event.actor_user_id ? people.get(event.actor_user_id) ?? null : null,
      tone: (event.event_type.includes("escalat") ? "critical" : event.event_type.includes("resolve") || event.event_type.includes("assign") ? "positive" : "neutral") as TimelineItem["tone"]
    })),
    ...transferEvents.map((event) => ({
      id: event.id,
      type: "transfer_event" as const,
      title: event.event_type,
      description: `${event.previous_status ?? "new"} -> ${event.next_status ?? "unchanged"}`,
      occurred_at: event.created_at,
      actor: event.actor_user_id ? people.get(event.actor_user_id) ?? null : null,
      tone: (event.next_status === "returned" || event.next_status === "failed" ? "warning" : event.next_status === "settled" ? "positive" : "neutral") as TimelineItem["tone"]
    })),
    ...(transaction
      ? [
          {
            id: transaction.id,
            type: "transaction" as const,
            title: transaction.description ?? `${transaction.type} transaction`,
            description: `${formatMoney(Number(transaction.amount), transaction.currency)} on ${transaction.account_id}`,
            occurred_at: transaction.posted_at ?? transaction.created_at,
            actor: null,
            tone: (Number(transaction.amount) < 0 ? "warning" : "neutral") as TimelineItem["tone"]
          }
        ]
      : []),
    ...(cardFeed
      ? [
          {
            id: cardFeed.id,
            type: "card_feed" as const,
            title: cardFeed.merchant_name ?? `Card ${cardFeed.status}`,
            description: `${formatMoney(Number(cardFeed.amount), cardFeed.currency)} MCC ${cardFeed.merchant_category_code ?? "-"}`,
            occurred_at: cardFeed.posted_at ?? cardFeed.authorized_at ?? cardFeed.created_at,
            actor: null,
            tone: (cardFeed.status === "declined" || cardFeed.status === "reversed" ? "warning" : Number(cardFeed.amount) >= 1500 ? "critical" : "neutral") as TimelineItem["tone"]
          }
        ]
      : [])
  ].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  return {
    id: caseRecord.id,
    alert_id: caseRecord.alert_id,
    assignee_user_id: caseRecord.assignee_user_id,
    assignee: caseRecord.assignee_user_id ? people.get(caseRecord.assignee_user_id) ?? null : null,
    status: caseRecord.status,
    priority: caseRecord.priority,
    disposition: caseRecord.disposition,
    resolution_notes: caseRecord.resolution_notes,
    escalated_at: caseRecord.escalated_at,
    closed_at: caseRecord.closed_at,
    last_activity_at: caseRecord.last_activity_at,
    created_at: caseRecord.created_at,
    updated_at: caseRecord.updated_at,
    alert: normalizedAlert,
    notes: normalizedNotes,
    timeline
  };
}

export async function assignMonitoringCase(params: {
  caseId: string;
  assigneeUserId: string | null;
  actorUserId: string;
}) {
  if (params.assigneeUserId) {
    const staff = await listMonitoringStaffOptions();
    if (!staff.some((person) => person.id === params.assigneeUserId)) {
      throw new Error("Assignee must be an analyst, admin, or developer.");
    }
  }

  await touchCase(params.caseId, {
    assignee_user_id: params.assigneeUserId
  });

  await insertCaseEvent({
    caseId: params.caseId,
    eventType: "case.assigned",
    title: params.assigneeUserId ? "Case assigned" : "Case unassigned",
    actorUserId: params.actorUserId,
    details: {
      assigneeUserId: params.assigneeUserId
    }
  });

  return getMonitoringCaseDetail(params.caseId);
}

export async function addMonitoringCaseNote(params: {
  caseId: string;
  actorUserId: string;
  note: string;
}) {
  const note = params.note.trim();
  if (!note) {
    throw new Error("Note is required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("case_notes").insert({
    case_id: params.caseId,
    author_user_id: params.actorUserId,
    note,
    visibility: "internal"
  });

  if (error) {
    throw new Error(error.message);
  }

  await touchCase(params.caseId, {});
  await insertCaseEvent({
    caseId: params.caseId,
    eventType: "case.note_added",
    title: "Analyst note added",
    actorUserId: params.actorUserId,
    details: { length: note.length }
  });

  return getMonitoringCaseDetail(params.caseId);
}

export async function updateMonitoringCaseDisposition(params: {
  caseId: string;
  actorUserId: string;
  status: MonitoringCaseStatus;
  disposition: CaseDisposition;
  priority: CasePriority;
  resolutionNotes?: string | null;
}) {
  const closedAt = ["resolved", "closed"].includes(params.status) ? new Date().toISOString() : null;
  const escalatedAt = params.disposition === "escalated" ? new Date().toISOString() : null;
  const caseRecord = await touchCase(params.caseId, {
    status: params.status,
    disposition: params.disposition,
    priority: params.priority,
    resolution_notes: params.resolutionNotes?.trim() || null,
    escalated_at: escalatedAt,
    closed_at: closedAt
  });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("alerts")
    .update({
      status: params.status,
      escalated_at: escalatedAt
    })
    .eq("id", caseRecord.alert_id);

  if (error) {
    throw new Error(error.message);
  }

  await insertCaseEvent({
    caseId: params.caseId,
    eventType: "case.disposition_updated",
    title: "Case disposition updated",
    actorUserId: params.actorUserId,
    details: {
      status: params.status,
      disposition: params.disposition,
      priority: params.priority
    }
  });

  return getMonitoringCaseDetail(params.caseId);
}

export async function escalateMonitoringCase(params: {
  caseId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const detail = await updateMonitoringCaseDisposition({
    caseId: params.caseId,
    actorUserId: params.actorUserId,
    status: "investigating",
    disposition: "escalated",
    priority: "high",
    resolutionNotes: params.note ?? null
  });

  await insertCaseEvent({
    caseId: params.caseId,
    eventType: "case.escalated",
    title: "Case escalated for priority review",
    actorUserId: params.actorUserId,
    details: {
      note: params.note?.trim() || null
    }
  });

  return detail;
}

async function getActiveRules(sourceType: MonitoringSourceType) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("monitoring_rules")
    .select("id, rule_code, name, description, severity, source_types, is_active, config")
    .eq("is_active", true)
    .contains("source_types", [sourceType]);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MonitoringRuleRecord[];
}

async function ensureAlertCase(params: {
  severity: MonitoringSeverity;
  title: string;
  description: string;
  ruleCode: string;
  sourceType: MonitoringSourceType;
  sourceRecordId: string;
  dedupKey: string;
  payload: Record<string, unknown>;
  accountId?: string | null;
  transferId?: string | null;
  transactionId?: string | null;
  cardId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("alerts")
    .select("id")
    .eq("dedup_key", params.dedupKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    await supabase
      .from("alerts")
      .update({
        payload: params.payload,
        last_evaluated_at: new Date().toISOString()
      })
      .eq("id", existing.id);

    const { data: existingCase } = await supabase
      .from("cases")
      .select("id")
      .eq("alert_id", existing.id)
      .maybeSingle();

    if (existingCase?.id) {
      return existingCase.id as string;
    }
  }

  const { data: alertRow, error } = await supabase
    .from("alerts")
    .insert({
      account_id: params.accountId ?? null,
      transfer_id: params.transferId ?? null,
      transaction_id: params.transactionId ?? null,
      card_id: params.cardId ?? null,
      severity: params.severity,
      title: params.title,
      description: params.description,
      status: "open",
      rule_code: params.ruleCode,
      source_type: params.sourceType,
      source_record_id: params.sourceRecordId,
      dedup_key: params.dedupKey,
      payload: params.payload,
      last_evaluated_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !alertRow) {
    throw new Error(error?.message ?? "Unable to create monitoring alert.");
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .insert({
      alert_id: alertRow.id,
      status: "open",
      priority: priorityFromSeverity(params.severity),
      disposition: "pending_review"
    })
    .select("id")
    .single();

  if (caseError || !caseRow) {
    throw new Error(caseError?.message ?? "Unable to create monitoring case.");
  }

  await insertCaseEvent({
    caseId: caseRow.id as string,
    eventType: "case.opened",
    title: "Monitoring alert opened a new case",
    details: {
      ruleCode: params.ruleCode,
      dedupKey: params.dedupKey,
      severity: params.severity
    }
  });

  return caseRow.id as string;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export async function evaluateTransferMonitoring(params: {
  transferId: string;
  eventType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transfers")
    .select(
      "id, rail, source_account_id, destination_account_id, amount, currency, status, memo, destination_external_name, created_at"
    )
    .eq("id", params.transferId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Transfer not found for monitoring.");
  }

  const transfer = {
    ...data,
    amount: Number(data.amount)
  };
  const rules = await getActiveRules("payment_transfer");
  const triggeredCaseIds: string[] = [];

  for (const rule of rules) {
    if (rule.rule_code !== "transfer_amount_threshold") {
      continue;
    }

    const minAmount = asNumber(rule.config?.minAmount, 7500);
    if (transfer.amount < minAmount) {
      continue;
    }

    const caseId = await ensureAlertCase({
      severity: rule.severity,
      title: `Large ${String(transfer.rail).toUpperCase()} transfer detected`,
      description: `${formatMoney(transfer.amount, transfer.currency)} exceeds the configured threshold of ${formatMoney(minAmount, transfer.currency)}.`,
      ruleCode: rule.rule_code,
      sourceType: "payment_transfer",
      sourceRecordId: transfer.id,
      dedupKey: `monitor:${rule.rule_code}:${transfer.id}`,
      payload: {
        eventType: params.eventType,
        thresholdAmount: minAmount,
        amount: transfer.amount,
        currency: transfer.currency,
        rail: transfer.rail,
        status: transfer.status,
        destination: transfer.destination_external_name ?? transfer.destination_account_id ?? null
      },
      accountId: transfer.source_account_id,
      transferId: transfer.id
    });

    triggeredCaseIds.push(caseId);
  }

  return triggeredCaseIds;
}

export async function evaluateAccountTransactionMonitoring(params: {
  transactionId: string;
  eventType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, account_id, card_id, transfer_id, type, amount, currency, description, merchant_name, merchant_category_code, metadata, posted_at, created_at"
    )
    .eq("id", params.transactionId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Transaction not found for monitoring.");
  }

  const transaction = data as TransactionRecord;
  const amount = Number(transaction.amount);
  const direction = String(transaction.metadata?.direction ?? "");
  if (transaction.type !== "debit" || direction !== "outbound" || Math.abs(amount) <= 0) {
    return [] as string[];
  }

  const rules = await getActiveRules("account_transaction");
  const triggeredCaseIds: string[] = [];
  const occurredAt = new Date(transaction.posted_at ?? transaction.created_at);

  for (const rule of rules) {
    if (rule.rule_code !== "account_transfer_velocity") {
      continue;
    }

    const windowMinutes = asNumber(rule.config?.windowMinutes, 60);
    const maxTransfers = asNumber(rule.config?.maxTransfers, 3);
    const minAmount = asNumber(rule.config?.minAmount, 500);

    if (Math.abs(amount) < minAmount) {
      continue;
    }

    const windowStart = new Date(occurredAt.getTime() - windowMinutes * 60 * 1000).toISOString();
    const { data: windowRows, error: windowError } = await supabase
      .from("transactions")
      .select("id, amount, posted_at, created_at")
      .eq("account_id", transaction.account_id)
      .eq("type", "debit")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true });

    if (windowError) {
      throw new Error(windowError.message);
    }

    const matching = (windowRows ?? []).filter((row) => Math.abs(Number(row.amount)) >= minAmount);
    if (matching.length < maxTransfers) {
      continue;
    }

    const bucketMs = windowMinutes * 60 * 1000;
    const bucketStartMs = Math.floor(occurredAt.getTime() / bucketMs) * bucketMs;
    const bucketStart = new Date(bucketStartMs).toISOString();
    const caseId = await ensureAlertCase({
      severity: rule.severity,
      title: "Outbound transfer velocity triggered",
      description: `${matching.length} outbound transactions over ${formatMoney(minAmount, transaction.currency)} were recorded within ${windowMinutes} minutes.`,
      ruleCode: rule.rule_code,
      sourceType: "account_transaction",
      sourceRecordId: transaction.id,
      dedupKey: `monitor:${rule.rule_code}:${transaction.account_id}:${bucketStart}`,
      payload: {
        eventType: params.eventType,
        accountId: transaction.account_id,
        transactionId: transaction.id,
        count: matching.length,
        windowMinutes,
        minAmount,
        matchingTransactionIds: matching.map((row) => row.id)
      },
      accountId: transaction.account_id,
      transactionId: transaction.id,
      transferId: transaction.transfer_id
    });

    triggeredCaseIds.push(caseId);
  }

  return triggeredCaseIds;
}

export async function evaluateCardTransactionMonitoring(params: {
  feedId: string;
  eventType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("card_transaction_feed")
    .select(
      "id, card_id, account_id, status, amount, currency, merchant_name, merchant_category_code, metadata, authorized_at, posted_at, created_at"
    )
    .eq("id", params.feedId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Card feed event not found for monitoring.");
  }

  const feed = data as CardFeedRecord;
  const amount = Number(feed.amount);
  const rules = await getActiveRules("card_transaction");
  const triggeredCaseIds: string[] = [];

  for (const rule of rules) {
    if (rule.rule_code !== "card_spend_anomaly") {
      continue;
    }

    const largeTicketAmount = asNumber(rule.config?.largeTicketAmount, 1500);
    const highRiskMccs = asStringArray(rule.config?.highRiskMccs);
    const declineStatuses = asStringArray(rule.config?.declineStatuses);
    const reasons: string[] = [];

    if (amount >= largeTicketAmount) {
      reasons.push(`large ticket amount ${formatMoney(amount, feed.currency)}`);
    }
    if (feed.merchant_category_code && highRiskMccs.includes(feed.merchant_category_code)) {
      reasons.push(`high-risk MCC ${feed.merchant_category_code}`);
    }
    if (declineStatuses.includes(feed.status)) {
      reasons.push(`status ${feed.status}`);
    }

    if (reasons.length === 0) {
      continue;
    }

    const caseId = await ensureAlertCase({
      severity: rule.severity,
      title: `Card anomaly at ${feed.merchant_name ?? "unknown merchant"}`,
      description: `Triggered by ${reasons.join(", ")} on card activity.`,
      ruleCode: rule.rule_code,
      sourceType: "card_transaction",
      sourceRecordId: feed.id,
      dedupKey: `monitor:${rule.rule_code}:${feed.id}`,
      payload: {
        eventType: params.eventType,
        reasons,
        cardId: feed.card_id,
        accountId: feed.account_id,
        amount,
        currency: feed.currency,
        merchantName: feed.merchant_name,
        merchantCategoryCode: feed.merchant_category_code,
        status: feed.status
      },
      accountId: feed.account_id,
      cardId: feed.card_id
    });

    triggeredCaseIds.push(caseId);
  }

  return triggeredCaseIds;
}




