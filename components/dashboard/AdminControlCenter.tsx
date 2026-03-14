"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivitySquare,
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Webhook,
  XCircle
} from "lucide-react";
import type { AdminDashboardData, AdminReviewDetail } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminControlCenterProps = {
  role: "customer" | "analyst" | "admin" | "developer";
};

type AdminTab = "overview" | "onboarding" | "payments" | "cards" | "alerts" | "activity";

type DashboardResponse = AdminDashboardData & { error?: string };

type DetailResponse = { detail?: AdminReviewDetail; error?: string };

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function toneForStatus(status: string) {
  if (["approved", "settled", "active", "resolved"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["rejected", "failed", "returned", "dead_letter", "terminated"].includes(status)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["processing", "pending", "submitted", "investigating", "in_review", "inactive", "frozen"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function AdminControlCenter({ role }: AdminControlCenterProps) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [selected, setSelected] = useState<{ kind: "onboarding" | "payment" | "card" | "case"; id: string } | null>(null);
  const [detail, setDetail] = useState<AdminReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dispositionStatus, setDispositionStatus] = useState("open");
  const [dispositionPriority, setDispositionPriority] = useState("medium");
  const [dispositionValue, setDispositionValue] = useState("pending_review");

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const next = (await response.json()) as DashboardResponse;
      if (!response.ok) throw new Error(next.error ?? "Unable to load admin dashboard.");
      setData(next);
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Unable to load admin dashboard." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (kind: "onboarding" | "payment" | "card" | "case", id: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/admin/review-item?kind=${kind}&id=${id}`, { cache: "no-store" });
      const payload = (await response.json()) as DetailResponse;
      if (!response.ok || !payload.detail) throw new Error(payload.error ?? "Unable to load review detail.");
      setDetail(payload.detail);
      setDispositionStatus(payload.detail.status);
      setResult(null);
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Unable to load review detail." });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (!data) return;
    if (tab === "onboarding" && data.onboardingQueue[0]) setSelected((current) => current ?? { kind: "onboarding", id: data.onboardingQueue[0].id });
    if (tab === "payments" && data.paymentIssues[0]) setSelected((current) => current ?? { kind: "payment", id: data.paymentIssues[0].id });
    if (tab === "cards" && data.cardOperations[0]) setSelected((current) => current ?? { kind: "card", id: data.cardOperations[0].id });
    if (tab === "alerts" && data.alertCases[0]) setSelected((current) => current ?? { kind: "case", id: data.alertCases[0].case_id });
  }, [data, tab]);

  useEffect(() => {
    if (selected) {
      void loadDetail(selected.kind, selected.id);
    } else {
      setDetail(null);
    }
  }, [loadDetail, selected]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Onboarding Review", value: data.summary.onboardingPending, icon: ShieldCheck, tone: "from-sky-500 to-cyan-400" },
      { label: "Payment Issues", value: data.summary.paymentIssues, icon: ArrowLeftRight, tone: "from-amber-500 to-orange-400" },
      { label: "Card Actions", value: data.summary.cardActions, icon: CreditCard, tone: "from-indigo-500 to-blue-500" },
      { label: "Open Cases", value: data.summary.openCases, icon: Radar, tone: "from-rose-500 to-pink-400" },
      { label: "Webhook Failures", value: data.summary.failedWebhooks, icon: Webhook, tone: "from-slate-500 to-slate-400" }
    ];
  }, [data]);

  async function runAction(url: string, body: Record<string, unknown>, successText: string) {
    setIsMutating(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");
      setResult({ type: "success", text: successText });
      await refreshDashboard();
      if (selected) {
        await loadDetail(selected.kind, selected.id);
      }
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Action failed." });
    } finally {
      setIsMutating(false);
    }
  }

  async function saveSupportNote() {
    if (!detail || !note.trim()) return;
    setIsMutating(true);
    try {
      const response = await fetch("/api/admin/support-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: detail.kind === "payment" ? "transfer" : detail.kind === "card" ? "card" : detail.kind === "case" ? "case" : "onboarding_application", entityId: detail.id, note })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save note.");
      setNote("");
      setResult({ type: "success", text: "Support note saved." });
      if (selected) {
        await loadDetail(selected.kind, selected.id);
      }
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Unable to save note." });
    } finally {
      setIsMutating(false);
    }
  }

  if (role === "customer") return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="overflow-hidden border-slate-200 bg-white">
              <CardContent className="relative p-5">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.tone}`} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Icon className="h-5 w-5" /></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(value) => { setTab(value as AdminTab); setSelected(null); }} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="alerts">Alert Cases</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => window.open("/api/admin/reports/export?kind=overview&format=json", "_blank") }>
              <Download className="h-4 w-4" /> Export Overview
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => void refreshDashboard()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Operational Queue Snapshot</CardTitle>
                <CardDescription>Cross-functional review workload across onboarding, payments, cards, alerts, and webhooks.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Review Queues</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between"><span>Onboarding applications</span><span className="font-semibold text-slate-900">{data?.summary.onboardingPending ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Payment issues</span><span className="font-semibold text-slate-900">{data?.summary.paymentIssues ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Card actions</span><span className="font-semibold text-slate-900">{data?.summary.cardActions ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Alert cases</span><span className="font-semibold text-slate-900">{data?.summary.openCases ?? 0}</span></div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#111827_0%,#0f172a_40%,#1d4ed8_100%)] p-4 text-white">
                  <p className="text-sm font-semibold">Webhook Health</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div><p className="text-xs uppercase tracking-wide text-blue-100/70">Pending</p><p className="mt-1 text-xl font-semibold">{data?.webhookHealth.pending ?? 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-blue-100/70">Processing</p><p className="mt-1 text-xl font-semibold">{data?.webhookHealth.processing ?? 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-blue-100/70">Failed</p><p className="mt-1 text-xl font-semibold">{data?.webhookHealth.failed ?? 0}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-blue-100/70">Dead Letter</p><p className="mt-1 text-xl font-semibold">{data?.webhookHealth.deadLetter ?? 0}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Recent Webhook Failures</CardTitle>
                <CardDescription>Latest provider event processing problems surfaced for operator review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.webhookHealth.recentFailures.length ? data.webhookHealth.recentFailures.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.event_type}</p><p className="mt-1 text-xs text-slate-500">{item.last_error ?? "No error message recorded."}</p></div><Badge variant="outline" className={toneForStatus(item.status)}>{item.status}</Badge></div>
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{item.event_id} • retries {item.retry_count} • {formatDate(item.received_at)}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No recent webhook failures.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="onboarding">
          <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Onboarding Decisions</CardTitle><CardDescription>Submitted and exception-state applications requiring operator action.</CardDescription></CardHeader><CardContent className="space-y-3 p-3">{data?.onboardingQueue.map((item) => <button key={item.id} type="button" onClick={() => setSelected({ kind: "onboarding", id: item.id })} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.kind === "onboarding" && selected.id === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.applicant?.full_name ?? item.applicant?.email ?? item.id}</p><p className="mt-1 text-xs text-slate-500">{item.type} • {item.latestVerification?.status ?? "no verification"}</p></div><Badge variant="outline" className={toneForStatus(item.status)}>{item.status}</Badge></div></button>)}</CardContent></Card>
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Application Review</CardTitle><CardDescription>Approve, reject, or request more information with explicit operator confirmation.</CardDescription></CardHeader><CardContent className="space-y-4">{detail && detail.kind === "onboarding" ? <><div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{detail.summary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 py-1 text-sm"><span className="text-slate-500">{item.label}</span><span className="font-medium text-slate-900">{item.value}</span></div>)}</div><textarea className="min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Decision rationale or follow-up request." /><div className="flex flex-wrap gap-2"><Button onClick={() => window.confirm("Approve this onboarding application?") && void runAction(`/api/kyc/review-queue/${detail.id}`, { decision: "approved", notes: note }, "Onboarding application approved.")} disabled={isMutating} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />Approve</Button><Button variant="outline" onClick={() => window.confirm("Request more info for this onboarding application?") && void runAction(`/api/kyc/review-queue/${detail.id}`, { decision: "more_info_needed", notes: note }, "Requested more information from applicant.")} disabled={isMutating} className="gap-2"><AlertTriangle className="h-4 w-4" />More Info</Button><Button variant="outline" onClick={() => window.confirm("Reject this onboarding application?") && void runAction(`/api/kyc/review-queue/${detail.id}`, { decision: "rejected", notes: note }, "Onboarding application rejected.")} disabled={isMutating} className="gap-2 border-rose-200 text-rose-600"><XCircle className="h-4 w-4" />Reject</Button></div></> : <p className="text-sm text-slate-500">Select an onboarding item.</p>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Payment Issues</CardTitle><CardDescription>Transfers in pending, processing, returned, and failed states.</CardDescription></CardHeader><CardContent className="space-y-3 p-3">{data?.paymentIssues.map((item) => <button key={item.id} type="button" onClick={() => setSelected({ kind: "payment", id: item.id })} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.kind === "payment" && selected.id === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.rail.toUpperCase()} {item.amount.toFixed(2)} {item.currency}</p><p className="mt-1 text-xs text-slate-500">{item.sourceAccount?.account_name ?? "Source"} ? {item.destinationAccount?.account_name ?? "Destination"}</p></div><Badge variant="outline" className={toneForStatus(item.status)}>{item.status}</Badge></div></button>)}</CardContent></Card>
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Transfer Review</CardTitle><CardDescription>Manually reconcile problematic payment states and document operator notes.</CardDescription></CardHeader><CardContent className="space-y-4">{detail && detail.kind === "payment" ? <><div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{detail.summary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 py-1 text-sm"><span className="text-slate-500">{item.label}</span><span className="font-medium text-slate-900">{item.value}</span></div>)}</div><div className="flex flex-wrap gap-2"><Button onClick={() => window.confirm("Mark this transfer as settled?") && void runAction(`/api/payments/${detail.id}/reconcile`, { nextStatus: "settled", reason: note }, "Transfer reconciled to settled.")} disabled={isMutating}>Settle</Button><Button variant="outline" onClick={() => window.confirm("Mark this transfer as returned?") && void runAction(`/api/payments/${detail.id}/reconcile`, { nextStatus: "returned", reason: note }, "Transfer reconciled to returned.")} disabled={isMutating}>Return</Button><Button variant="outline" onClick={() => window.confirm("Mark this transfer as failed?") && void runAction(`/api/payments/${detail.id}/reconcile`, { nextStatus: "failed", reason: note }, "Transfer reconciled to failed.")} disabled={isMutating}>Fail</Button></div></> : <p className="text-sm text-slate-500">Select a payment issue.</p>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Card Operations</CardTitle><CardDescription>Inactive, frozen, or failed issuance workflows needing operator action.</CardDescription></CardHeader><CardContent className="space-y-3 p-3">{data?.cardOperations.map((item) => <button key={`${item.workflow}-${item.id}-${item.issuanceRequestId ?? "live"}`} type="button" onClick={() => setSelected({ kind: "card", id: item.id })} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.kind === "card" && selected.id === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.nickname ?? item.cardholder_name ?? item.id}</p><p className="mt-1 text-xs text-slate-500">•••• {item.last4 ?? "----"} • {item.workflow.replaceAll("_", " ")}</p></div><Badge variant="outline" className={toneForStatus(item.status)}>{item.status}</Badge></div></button>)}</CardContent></Card>
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Card Review</CardTitle><CardDescription>Apply lifecycle actions with explicit confirmation and status feedback.</CardDescription></CardHeader><CardContent className="space-y-4">{detail && detail.kind === "card" ? <><div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{detail.summary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 py-1 text-sm"><span className="text-slate-500">{item.label}</span><span className="font-medium text-slate-900">{item.value}</span></div>)}</div><div className="flex flex-wrap gap-2"><Button onClick={() => window.confirm("Activate this card?") && void runAction(`/api/cards/${detail.id}/status`, { action: "activate" }, "Card activated.")} disabled={isMutating}>Activate</Button><Button variant="outline" onClick={() => window.confirm("Freeze this card?") && void runAction(`/api/cards/${detail.id}/status`, { action: "freeze" }, "Card frozen.")} disabled={isMutating}>Freeze</Button><Button variant="outline" onClick={() => window.confirm("Unfreeze this card?") && void runAction(`/api/cards/${detail.id}/status`, { action: "unfreeze" }, "Card unfrozen.")} disabled={isMutating}>Unfreeze</Button><Button variant="outline" onClick={() => window.confirm("Terminate this card?") && void runAction(`/api/cards/${detail.id}/status`, { action: "terminate" }, "Card terminated.")} disabled={isMutating}>Terminate</Button></div></> : <p className="text-sm text-slate-500">Select a card workflow.</p>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Alert Cases</CardTitle><CardDescription>Monitoring cases requiring escalation or closure decisions.</CardDescription></CardHeader><CardContent className="space-y-3 p-3">{data?.alertCases.map((item) => <button key={item.case_id} type="button" onClick={() => setSelected({ kind: "case", id: item.case_id })} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.kind === "case" && selected.id === item.case_id ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.priority} • {item.assignee?.full_name ?? item.assignee?.email ?? "Unassigned"}</p></div><Badge variant="outline" className={toneForStatus(item.status)}>{item.status}</Badge></div></button>)}</CardContent></Card>
            <Card className="border-slate-200 bg-white"><CardHeader><CardTitle>Case Review</CardTitle><CardDescription>Drive disposition, resolution, and escalation from the admin dashboard.</CardDescription></CardHeader><CardContent className="space-y-4">{detail && detail.kind === "case" ? <><div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{detail.summary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 py-1 text-sm"><span className="text-slate-500">{item.label}</span><span className="font-medium text-slate-900">{item.value}</span></div>)}</div><div className="grid gap-3 md:grid-cols-3"><select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={dispositionStatus} onChange={(event) => setDispositionStatus(event.target.value)}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={dispositionPriority} onChange={(event) => setDispositionPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={dispositionValue} onChange={(event) => setDispositionValue(event.target.value)}><option value="pending_review">Pending review</option><option value="monitor">Monitor</option><option value="false_positive">False positive</option><option value="customer_outreach">Customer outreach</option><option value="escalated">Escalated</option><option value="suspicious_activity">Suspicious activity</option></select></div><div className="flex flex-wrap gap-2"><Button onClick={() => window.confirm("Save this case disposition?") && void runAction(`/api/cases/${detail.id}/disposition`, { status: dispositionStatus, priority: dispositionPriority, disposition: dispositionValue, resolutionNotes: note }, "Case disposition updated.")} disabled={isMutating}>Save</Button><Button variant="outline" onClick={() => window.confirm("Escalate this case?") && void runAction(`/api/cases/${detail.id}/escalate`, { note }, "Case escalated.")} disabled={isMutating}>Escalate</Button></div></> : <p className="text-sm text-slate-500">Select an alert case.</p>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader><CardTitle>Recent Audit Activity</CardTitle><CardDescription>Operator-visible actor history and support-note record for privileged workflows.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {data?.recentAudit.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.action}</p><p className="mt-1 text-xs text-slate-500">{item.entity_type} • {item.entity_id ?? "-"}</p></div><Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{item.actor?.full_name ?? item.actor?.email ?? "system"}</Badge></div>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{formatDate(item.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {detail ? (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>{detail.title}</CardTitle>
            <CardDescription>{detail.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
            <div>
              <div className="flex flex-wrap gap-2">{detail.badges.map((badge) => <Badge key={badge} variant="outline" className={toneForStatus(badge)}>{badge}</Badge>)}</div>
              <div className="mt-4 space-y-3">{detail.timeline.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.detail}</p></div><Badge variant="outline" className={item.tone === "critical" ? "border-rose-200 bg-rose-50 text-rose-700" : item.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : item.tone === "positive" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}>{item.actor?.full_name ?? item.actor?.email ?? "system"}</Badge></div><p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{formatDate(item.occurred_at)}</p></div>)}</div>
            </div>
            <div className="space-y-4">
              {result ? <div className={`rounded-2xl border px-4 py-3 text-sm ${result.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{result.text}</div> : null}
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Support Notes</p>
                <textarea className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Document operator context, customer outreach, or escalation notes." />
                <Button className="mt-3 gap-2" onClick={() => void saveSupportNote()} disabled={isMutating || !note.trim()}>{isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActivitySquare className="h-4 w-4" />}Save Note</Button>
                <div className="mt-4 space-y-2">{detail.supportNotes.length === 0 ? <p className="text-sm text-slate-500">No support notes yet.</p> : detail.supportNotes.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm text-slate-800">{item.note}</p><p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{item.actor?.full_name ?? item.actor?.email ?? "staff"} • {formatDate(item.created_at)}</p></div>)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

