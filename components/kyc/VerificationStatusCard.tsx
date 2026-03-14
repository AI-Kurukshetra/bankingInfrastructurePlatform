"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ScreeningResult = {
  provider: "ofac" | "pep" | "watchlist";
  status: "clear" | "hit";
  matchScore: number;
  details: string;
};

type VerificationRecord = {
  id: string;
  status: "pending" | "processing" | "approved" | "rejected" | "manual_review" | "failed";
  decision_reason: string | null;
  review_notes: string | null;
  attempt_number: number;
  sanctions_checks: ScreeningResult[];
  evidence_references: string[];
  created_at: string;
};

type VerificationStatusCardProps = {
  applicationId: string;
  applicationStatus: string;
};

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-800",
    badge: "bg-rose-50 text-rose-700 border-rose-200"
  },
  manual_review: {
    icon: AlertTriangle,
    label: "Under Review",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-50 text-amber-700 border-amber-200"
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-50 text-blue-700 border-blue-200"
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    badge: "bg-slate-50 text-slate-600 border-slate-200"
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-800",
    badge: "bg-rose-50 text-rose-700 border-rose-200"
  }
};

function safeUserMessage(status: string) {
  if (status === "approved") return "Your identity has been successfully verified. You're all set.";
  if (status === "processing" || status === "pending") return "Verification is running in the background. This usually takes under a minute.";
  if (status === "manual_review") return "Your application has been flagged for manual compliance review. Our team will contact you within 1–2 business days.";
  if (status === "rejected") return "Verification did not pass. Please review the details and resubmit with accurate information.";
  if (status === "failed") return "Our verification service is temporarily unavailable. Please try again shortly.";
  return "Verification status is being updated.";
}

const steps = [
  { key: "submitted", label: "Application Submitted" },
  { key: "processing", label: "Identity Check Running" },
  { key: "screening", label: "Sanctions & Watchlist Screening" },
  { key: "decision", label: "Decision" }
];

function getStepIndex(status: string) {
  if (status === "pending") return 0;
  if (status === "processing") return 1;
  if (status === "manual_review") return 2;
  if (status === "approved" || status === "rejected" || status === "failed") return 3;
  return 0;
}

export function VerificationStatusCard({ applicationId, applicationStatus }: VerificationStatusCardProps) {
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const canStart = ["submitted", "more_info_needed", "in_review"].includes(applicationStatus);
  const canResubmit = ["rejected", "more_info_needed"].includes(applicationStatus);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarding/applications/${applicationId}/verification`, { cache: "no-store" });
      const data = (await response.json()) as { verification?: VerificationRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load verification status.");
      setRecord(data.verification ?? null);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to load verification status.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  async function startVerification() {
    setMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarding/applications/${applicationId}/verification/start`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to start verification.");
      await loadStatus();
      setMessage({ text: "Verification check started.", type: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to start verification.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  async function resubmitVerification() {
    setMessage(null);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarding/applications/${applicationId}/verification/resubmit`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to resubmit.");
      await loadStatus();
      setMessage({ text: "Verification resubmitted successfully.", type: "success" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Unable to resubmit.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  const status = (record?.status ?? "pending") as keyof typeof statusConfig;
  const config = statusConfig[status] ?? statusConfig.pending;
  const Icon = config.icon;
  const userMessage = useMemo(() => safeUserMessage(status), [status]);
  const stepIndex = getStepIndex(status);
  const screenings = record?.sanctions_checks ?? [];

  return (
    <Card className="overflow-hidden border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Status header */}
      <div className={`border-b px-6 py-4 ${config.bg} ${config.border}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${config.border} bg-white dark:bg-slate-900`}>
              <Icon className={`h-5 w-5 ${config.color} ${status === "processing" ? "animate-spin" : ""}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {record ? `Attempt #${record.attempt_number}` : "No check initiated"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={config.badge}>{config.label}</Badge>
        </div>
      </div>

      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-base">Verification Progress</CardTitle>
        <CardDescription>KYC/KYB check status and screening results.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Step progress */}
        <div className="relative">
          <div className="absolute left-[11px] top-3 h-[calc(100%-12px)] w-0.5 bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isDone = index < stepIndex;
              const isActive = index === stepIndex;
              return (
                <div key={step.key} className="relative flex items-center gap-3 pl-8">
                  <div className={`absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className={`text-sm ${isActive ? "font-semibold text-slate-900 dark:text-slate-100" : isDone ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* User message */}
        <div className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
          <p className="text-sm text-slate-700 dark:text-slate-300">{userMessage}</p>
          {record?.decision_reason && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Reason:</span> {record.decision_reason}
            </p>
          )}
        </div>

        {/* Sanctions screening results */}
        {screenings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Screening Results</p>
            <div className="space-y-1.5">
              {screenings.map((check) => (
                <div key={check.provider} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-medium uppercase text-slate-600 dark:text-slate-400">{check.provider}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={check.status === "clear"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"}
                  >
                    {check.status === "clear" ? "Clear" : "Hit"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <p className={`text-xs ${message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {message.text}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button onClick={() => void loadStatus()} variant="outline" size="sm" disabled={isLoading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canStart && (
            <Button onClick={() => void startVerification()} size="sm" disabled={isLoading} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Start Verification
            </Button>
          )}
          {canResubmit && (
            <Button onClick={() => void resubmitVerification()} size="sm" variant="outline" disabled={isLoading} className="gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              Resubmit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
