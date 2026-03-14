"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QueueItem = {
  id: string;
  type: "consumer" | "business";
  status: string;
  review_notes: string | null;
  submitted_at: string | null;
  updated_at: string;
  verification_checks?: Array<{
    id: string;
    status: string;
    decision_reason: string | null;
    created_at: string;
    attempt_number: number;
  }>;
};

const statusBadge: Record<string, string> = {
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  more_info_needed: "bg-blue-50 text-blue-700 border-blue-200"
};

const statusLabel: Record<string, string> = {
  in_review: "Under Review",
  rejected: "Rejected",
  more_info_needed: "Info Needed"
};

const statusIcon: Record<string, React.ElementType> = {
  in_review: AlertTriangle,
  rejected: XCircle,
  more_info_needed: Clock
};

const checkStatusBadge: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  manual_review: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200"
};

export function KycReviewQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/kyc/review-queue", { cache: "no-store" });
      const data = (await response.json()) as { queue?: QueueItem[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load review queue.");
      setQueue(data.queue ?? []);
    } catch (error) {
      setSubmitResult({ type: "error", text: error instanceof Error ? error.message : "Unable to load review queue." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const latestCheck = useMemo(() => {
    if (!selected?.verification_checks?.length) return null;
    return [...selected.verification_checks].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [selected]);

  async function decide(decision: "approved" | "rejected" | "more_info_needed") {
    if (!selected) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const response = await fetch(`/api/kyc/review-queue/${selected.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, notes })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save decision.");
      setSubmitResult({ type: "success", text: `Decision recorded: ${decision.replaceAll("_", " ")}.` });
      setNotes("");
      setSelected(null);
      await loadQueue();
    } catch (error) {
      setSubmitResult({ type: "error", text: error instanceof Error ? error.message : "Unable to save decision." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const counts = {
    total: queue.length,
    inReview: queue.filter((q) => q.status === "in_review").length,
    rejected: queue.filter((q) => q.status === "rejected").length
  };

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Flagged", value: counts.total, color: "text-slate-900 dark:text-slate-100" },
          { label: "Under Review", value: counts.inReview, color: "text-amber-600 dark:text-amber-400" },
          { label: "Rejected", value: counts.rejected, color: "text-rose-600 dark:text-rose-400" }
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="grid gap-5 lg:grid-cols-[380px,1fr]">
        {/* Queue list */}
        <Card className="border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
            <div>
              <CardTitle className="text-base">Flagged Applications</CardTitle>
              <CardDescription className="mt-0.5">Select an application to review.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadQueue()} disabled={isLoading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {isLoading && queue.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Queue is clear</p>
                <p className="text-xs text-slate-400">No flagged applications require attention.</p>
              </div>
            ) : (
              queue.map((item) => {
                const Icon = statusIcon[item.status] ?? Clock;
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setSelected(item); setSubmitResult(null); setNotes(""); }}
                    className={`group w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        item.type === "business" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}>
                        {item.type === "business" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium capitalize text-slate-800 dark:text-slate-200">
                            {item.type} applicant
                          </p>
                          <Badge variant="outline" className={statusBadge[item.status] ?? ""}>
                            <Icon className="mr-1 h-3 w-3" />
                            {statusLabel[item.status] ?? item.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400 font-mono">
                          {item.id.slice(0, 18)}…
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not submitted"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Decision panel */}
        <Card className="border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-50 pb-4 dark:border-slate-800">
            <CardTitle className="text-base">Analyst Decision</CardTitle>
            <CardDescription className="mt-0.5">Review verification evidence and record your outcome.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!selected ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <ShieldCheck className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No application selected</p>
                <p className="text-xs text-slate-400">Pick an item from the queue on the left to begin review.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Application info */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Application ID</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-700 dark:text-slate-300">{selected.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Type</p>
                      <p className="mt-0.5 font-medium capitalize text-slate-700 dark:text-slate-300">{selected.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current Status</p>
                      <Badge variant="outline" className={`mt-0.5 ${statusBadge[selected.status] ?? ""}`}>
                        {statusLabel[selected.status] ?? selected.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Submitted</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Latest verification check */}
                {latestCheck && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest Verification Check</p>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Attempt #{latestCheck.attempt_number}
                          </p>
                          {latestCheck.decision_reason && (
                            <p className="mt-1 text-xs text-slate-500">{latestCheck.decision_reason}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={checkStatusBadge[latestCheck.status] ?? ""}>
                          {latestCheck.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Checked: {new Date(latestCheck.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Review notes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Internal Review Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add context, findings, or reasoning for this decision…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-600 dark:focus:ring-blue-900/30"
                  />
                </div>

                {/* Feedback */}
                {submitResult && (
                  <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    submitResult.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                  }`}>
                    {submitResult.type === "success"
                      ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                      : <XCircle className="h-4 w-4 shrink-0" />}
                    {submitResult.text}
                  </div>
                )}

                {/* Decision buttons */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button
                    onClick={() => void decide("approved")}
                    disabled={isSubmitting}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button
                    onClick={() => void decide("more_info_needed")}
                    disabled={isSubmitting}
                    variant="outline"
                    className="gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Request Info
                  </Button>
                  <Button
                    onClick={() => void decide("rejected")}
                    disabled={isSubmitting}
                    variant="outline"
                    className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
