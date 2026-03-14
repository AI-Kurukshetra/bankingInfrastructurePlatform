export type AdminSummary = {
  onboardingPending: number;
  paymentIssues: number;
  cardActions: number;
  openAlerts: number;
  openCases: number;
  failedWebhooks: number;
};

export type AdminQueueOnboardingItem = {
  id: string;
  type: "consumer" | "business";
  status: string;
  submitted_at: string | null;
  updated_at: string;
  review_notes: string | null;
  applicant: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
  latestVerification: {
    id: string;
    status: string;
    attempt_number: number;
    decision_reason: string | null;
    created_at: string;
  } | null;
};

export type AdminQueuePaymentItem = {
  id: string;
  rail: string;
  amount: number;
  currency: string;
  status: string;
  memo: string | null;
  failure_reason: string | null;
  return_reason: string | null;
  provider_status: string | null;
  created_at: string;
  sourceAccount: { id: string; account_name: string; account_number: string } | null;
  destinationAccount: { id: string; account_name: string; account_number: string } | null;
};

export type AdminQueueCardItem = {
  id: string;
  workflow: "card_status" | "issuance_request";
  status: string;
  nickname: string | null;
  last4: string | null;
  network: string | null;
  cardholder_name: string | null;
  created_at: string;
  account: { id: string; account_name: string; account_number: string } | null;
  issuanceRequestId: string | null;
  issuanceError: string | null;
};

export type AdminQueueCaseItem = {
  id: string;
  case_id: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  disposition: string;
  priority: string;
  assignee: { id: string; email: string | null; full_name: string | null } | null;
  created_at: string;
  updated_at: string;
};

export type AdminWebhookHealth = {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  recentFailures: Array<{
    id: string;
    event_id: string;
    event_type: string;
    status: string;
    retry_count: number;
    last_error: string | null;
    received_at: string;
  }>;
};

export type AdminAuditItem = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor: { id: string; email: string | null; full_name: string | null } | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminDashboardData = {
  summary: AdminSummary;
  onboardingQueue: AdminQueueOnboardingItem[];
  paymentIssues: AdminQueuePaymentItem[];
  cardOperations: AdminQueueCardItem[];
  alertCases: AdminQueueCaseItem[];
  webhookHealth: AdminWebhookHealth;
  recentAudit: AdminAuditItem[];
};

export type AdminTimelineEvent = {
  id: string;
  title: string;
  detail: string;
  occurred_at: string;
  actor: { id: string; email: string | null; full_name: string | null } | null;
  tone: "neutral" | "warning" | "critical" | "positive";
};

export type AdminSupportNote = {
  id: string;
  note: string;
  actor: { id: string; email: string | null; full_name: string | null } | null;
  created_at: string;
};

export type AdminReviewDetail = {
  kind: "onboarding" | "payment" | "card" | "case";
  id: string;
  title: string;
  subtitle: string;
  status: string;
  badges: string[];
  summary: Array<{ label: string; value: string }>;
  timeline: AdminTimelineEvent[];
  supportNotes: AdminSupportNote[];
};
