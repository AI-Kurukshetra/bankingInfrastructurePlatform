import type { AppRole } from "@/lib/auth/rbac";

export type MonitoringSourceType =
  | "payment_transfer"
  | "account_transaction"
  | "card_transaction";

export type MonitoringCaseStatus = "open" | "investigating" | "resolved" | "closed";

export type MonitoringSeverity = "low" | "medium" | "high";

export type CasePriority = "low" | "medium" | "high";

export type CaseDisposition =
  | "pending_review"
  | "monitor"
  | "false_positive"
  | "customer_outreach"
  | "escalated"
  | "suspicious_activity";

export type StaffOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
};

export type AlertQueueItem = {
  id: string;
  severity: MonitoringSeverity;
  title: string;
  description: string | null;
  status: MonitoringCaseStatus;
  rule_code: string | null;
  source_type: MonitoringSourceType | null;
  source_record_id: string | null;
  dedup_key: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  account_id: string | null;
  transfer_id: string | null;
  transaction_id: string | null;
  card_id: string | null;
  account: {
    id: string;
    account_name: string;
    account_number: string;
    currency: string;
    status: string;
  } | null;
  transfer: {
    id: string;
    rail: string;
    amount: number;
    currency: string;
    status: string;
    destination_external_name: string | null;
    created_at: string;
  } | null;
  card: {
    id: string;
    last4: string;
    status: string;
    nickname: string | null;
    network: string;
  } | null;
  case: {
    id: string;
    assignee_user_id: string | null;
    assignee: StaffOption | null;
    status: MonitoringCaseStatus;
    priority: CasePriority;
    disposition: CaseDisposition;
    resolution_notes: string | null;
    escalated_at: string | null;
    closed_at: string | null;
    last_activity_at: string;
    created_at: string;
    updated_at: string;
  } | null;
};

export type CaseNoteRecord = {
  id: string;
  case_id: string;
  author_user_id: string | null;
  author: StaffOption | null;
  note: string;
  visibility: string;
  created_at: string;
};

export type TimelineItem = {
  id: string;
  type: "case_event" | "transfer_event" | "transaction" | "card_feed";
  title: string;
  description: string;
  occurred_at: string;
  actor: StaffOption | null;
  tone: "neutral" | "warning" | "critical" | "positive";
};

export type MonitoringCaseDetail = {
  id: string;
  alert_id: string;
  assignee_user_id: string | null;
  assignee: StaffOption | null;
  status: MonitoringCaseStatus;
  priority: CasePriority;
  disposition: CaseDisposition;
  resolution_notes: string | null;
  escalated_at: string | null;
  closed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  alert: AlertQueueItem;
  notes: CaseNoteRecord[];
  timeline: TimelineItem[];
};
