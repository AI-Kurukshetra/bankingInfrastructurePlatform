"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Loader2,
  NotebookPen,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserRoundCheck
} from "lucide-react";
import type {
  AlertQueueItem,
  CaseDisposition,
  CasePriority,
  MonitoringCaseDetail,
  MonitoringCaseStatus,
  MonitoringSeverity,
  StaffOption
} from "@/lib/monitoring/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MonitoringWorkspaceProps = {
  role: "customer" | "analyst" | "admin" | "developer";
};

type QueueResponse = {
  queue?: AlertQueueItem[];
  staff?: StaffOption[];
  rules?: Array<{ id: string; rule_code: string; name: string }>;
  error?: string;
};

type DetailResponse = {
  detail?: MonitoringCaseDetail;
  error?: string;
};

const severityTone: Record<MonitoringSeverity, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700"
};

const statusTone: Record<MonitoringCaseStatus, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700",
  investigating: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-50 text-slate-700"
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatCurrency(amount: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount ?? 0);
}

export function MonitoringWorkspace({ role }: MonitoringWorkspaceProps) {
  const [queue, setQueue] = useState<AlertQueueItem[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MonitoringCaseDetail | null>(null);
  const [severityFilter, setSeverityFilter] = useState<MonitoringSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MonitoringCaseStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [note, setNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const summary = useMemo(() => ({
    total: queue.length,
    high: queue.filter((item) => item.severity === "high").length,
    investigating: queue.filter((item) => item.case?.status === "investigating").length
  }), [queue]);

  const loadQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const params = new URLSearchParams({
        severity: severityFilter,
        status: statusFilter,
        assignee: assigneeFilter
      });
      const response = await fetch(`/api/monitoring/alerts?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as QueueResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load monitoring queue.");
      }

      const nextQueue = data.queue ?? [];
      setQueue(nextQueue);
      setStaff(data.staff ?? []);
      setSelectedCaseId((current) => {
        if (current && nextQueue.some((item) => item.case?.id === current)) {
          return current;
        }
        return nextQueue[0]?.case?.id ?? null;
      });
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Unable to load monitoring queue." });
    } finally {
      setIsLoadingQueue(false);
    }
  }, [assigneeFilter, severityFilter, statusFilter]);

  const loadDetail = useCallback(async (caseId: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, { cache: "no-store" });
      const data = (await response.json()) as DetailResponse;
      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "Unable to load case detail.");
      }

      setDetail(data.detail);
      setResolutionNotes(data.detail.resolution_notes ?? "");
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Unable to load case detail." });
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (selectedCaseId) {
      void loadDetail(selectedCaseId);
    } else {
      setDetail(null);
    }
  }, [loadDetail, selectedCaseId]);

  async function refreshAll(message?: string) {
    await loadQueue();
    if (selectedCaseId) {
      await loadDetail(selectedCaseId);
    }
    if (message) {
      setResult({ type: "success", text: message });
    }
  }

  async function postJson(path: string, payload: Record<string, unknown>, successMessage: string) {
    if (!selectedCaseId) return;

    setIsMutating(true);
    setResult(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as DetailResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Action failed.");
      }

      if (data.detail) {
        setDetail(data.detail);
        setResolutionNotes(data.detail.resolution_notes ?? "");
      }
      await loadQueue();
      setResult({ type: "success", text: successMessage });
      setNote("");
    } catch (error) {
      setResult({ type: "error", text: error instanceof Error ? error.message : "Action failed." });
    } finally {
      setIsMutating(false);
    }
  }

  if (role === "customer") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="relative p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-amber-400" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Open Queue</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.total}</p>
            <p className="mt-2 text-sm text-slate-500">Active alert-backed cases waiting for analyst action.</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="relative p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-rose-300" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">High Severity</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.high}</p>
            <p className="mt-2 text-sm text-slate-500">Large transfers and card anomalies with elevated risk posture.</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="relative p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Investigating</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{summary.investigating}</p>
            <p className="mt-2 text-sm text-slate-500">Cases escalated into active evidence review.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr,1fr,1fr,auto]">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Severity</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as MonitoringSeverity | "all")}>
              <option value="all">All severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MonitoringCaseStatus | "all")}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Assignee</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
              <option value="all">Anyone</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>{person.full_name ?? person.email ?? person.id}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end">
            <Button variant="outline" className="gap-2" onClick={() => void refreshAll()} disabled={isLoadingQueue || isLoadingDetail}>
              {isLoadingQueue ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base"><Radar className="h-4 w-4 text-blue-600" /> Alert Queue</CardTitle>
            <CardDescription>Filterable severity, status, and assignee views for monitoring triage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-500">
                <Sparkles className="h-8 w-8 text-emerald-500" />
                Monitoring queue is clear.
              </div>
            ) : (
              queue.map((item) => {
                const selected = item.case?.id === selectedCaseId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCaseId(item.case?.id ?? null)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description ?? "No description available."}</p>
                      </div>
                      <Badge variant="outline" className={severityTone[item.severity]}>{item.severity}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-1">{item.rule_code ?? "manual"}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">{item.case?.assignee?.full_name ?? item.case?.assignee?.email ?? "Unassigned"}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">{formatDate(item.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-rose-500" /> Case Detail</CardTitle>
            <CardDescription>Evidence timeline, notes, assignment, and disposition actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedCaseId ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-slate-500">
                <AlertTriangle className="h-8 w-8 text-slate-300" />
                Select a monitoring case from the queue.
              </div>
            ) : isLoadingDetail ? (
              <div className="flex items-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading case detail...</div>
            ) : detail ? (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-900 bg-[linear-gradient(135deg,#111827_0%,#0f172a_42%,#1d4ed8_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                  <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-blue-100/70">Transaction Monitoring</p>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight">{detail.alert.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm text-blue-100/80">{detail.alert.description ?? "No analyst description available."}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${severityTone[detail.alert.severity]}`}>{detail.alert.severity}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone[detail.status]}`}>{detail.status}</span>
                    </div>
                  </div>
                  <div className="relative mt-8 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Rule</p>
                      <p className="mt-2 text-sm font-medium text-white">{detail.alert.rule_code ?? "manual"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Priority</p>
                      <p className="mt-2 text-sm font-medium text-white">{detail.priority}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Assignee</p>
                      <p className="mt-2 text-sm font-medium text-white">{detail.assignee?.full_name ?? detail.assignee?.email ?? "Unassigned"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Triggered</p>
                      <p className="mt-2 text-sm font-medium text-white">{formatDate(detail.alert.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
                  <div className="space-y-6">
                    <Card className="border-slate-200 bg-slate-50">
                      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transfer</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{detail.alert.transfer ? formatCurrency(detail.alert.transfer.amount, detail.alert.transfer.currency) : "-"}</p>
                          <p className="text-xs text-slate-500">{detail.alert.transfer?.rail ?? "No transfer linked"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{detail.alert.account?.account_name ?? "-"}</p>
                          <p className="text-xs text-slate-500">•••• {detail.alert.account?.account_number?.slice(-4) ?? "----"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Card</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{detail.alert.card?.nickname ?? detail.alert.card?.network ?? "-"}</p>
                          <p className="text-xs text-slate-500">•••• {detail.alert.card?.last4 ?? "----"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Disposition</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{detail.disposition.replaceAll("_", " ")}</p>
                          <p className="text-xs text-slate-500">Last activity {formatDate(detail.last_activity_at)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900"><UserRoundCheck className="h-4 w-4 text-blue-600" /><p className="text-sm font-semibold">Assignment</p></div>
                      <select className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2" value={detail.assignee_user_id ?? ""} onChange={(event) => void postJson(`/api/cases/${detail.id}/assign`, { assigneeUserId: event.target.value || null }, "Case assignment updated.")} disabled={isMutating}>
                        <option value="">Unassigned</option>
                        {staff.map((person) => (
                          <option key={person.id} value={person.id}>{person.full_name ?? person.email ?? person.id}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900"><NotebookPen className="h-4 w-4 text-amber-500" /><p className="text-sm font-semibold">Analyst Notes</p></div>
                      <textarea className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Capture evidence, reasoning, or follow-up items." />
                      <Button className="mt-3 gap-2" onClick={() => void postJson(`/api/cases/${detail.id}/notes`, { note }, "Analyst note saved.")} disabled={isMutating || !note.trim()}>
                        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                        Add Note
                      </Button>
                      <div className="mt-4 space-y-2">
                        {detail.notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : detail.notes.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm text-slate-800">{item.note}</p>
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{item.author?.full_name ?? item.author?.email ?? "Staff"} • {formatDate(item.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900"><ArrowUpRight className="h-4 w-4 text-rose-500" /><p className="text-sm font-semibold">Disposition</p></div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={detail.status} onChange={(event) => setDetail({ ...detail, status: event.target.value as MonitoringCaseStatus })}>
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={detail.priority} onChange={(event) => setDetail({ ...detail, priority: event.target.value as CasePriority })}>
                          <option value="low">Low priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="high">High priority</option>
                        </select>
                        <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={detail.disposition} onChange={(event) => setDetail({ ...detail, disposition: event.target.value as CaseDisposition })}>
                          <option value="pending_review">Pending review</option>
                          <option value="monitor">Monitor</option>
                          <option value="false_positive">False positive</option>
                          <option value="customer_outreach">Customer outreach</option>
                          <option value="escalated">Escalated</option>
                          <option value="suspicious_activity">Suspicious activity</option>
                        </select>
                      </div>
                      <textarea className="mt-4 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm" value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} placeholder="Resolution notes or escalation rationale." />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button className="gap-2" onClick={() => void postJson(`/api/cases/${detail.id}/disposition`, { status: detail.status, priority: detail.priority, disposition: detail.disposition, resolutionNotes }, "Case disposition updated.")} disabled={isMutating}>
                          {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                          Save Disposition
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => void postJson(`/api/cases/${detail.id}/escalate`, { note: resolutionNotes }, "Case escalated for priority review.")} disabled={isMutating}>
                          <ShieldAlert className="h-4 w-4" />
                          Escalate
                        </Button>
                      </div>
                    </div>

                    {result ? (
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${result.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        {result.text}
                      </div>
                    ) : null}

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900"><Radar className="h-4 w-4 text-blue-600" /><p className="text-sm font-semibold">Evidence Timeline</p></div>
                      <div className="mt-4 space-y-3">
                        {detail.timeline.length === 0 ? <p className="text-sm text-slate-500">No evidence recorded yet.</p> : detail.timeline.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              </div>
                              <Badge variant="outline" className={item.tone === "critical" ? severityTone.high : item.tone === "warning" ? severityTone.medium : item.tone === "positive" ? statusTone.resolved : statusTone.closed}>{item.type.replaceAll("_", " ")}</Badge>
                            </div>
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{item.actor?.full_name ?? item.actor?.email ?? "System"} • {formatDate(item.occurred_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
