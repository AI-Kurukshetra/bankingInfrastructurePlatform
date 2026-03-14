"use client";

import type { ElementType } from "react";
import { useState } from "react";
import {
  ActivitySquare,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Filter,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EventCategory = "all" | "payments" | "accounts" | "cards" | "kyc" | "auth" | "system";
type EventStatus = "success" | "failed" | "pending" | "warning";

type ActivityEvent = {
  id: string;
  category: Exclude<EventCategory, "all">;
  type: string;
  title: string;
  detail: string;
  actor: string;
  actorInitials: string;
  status: EventStatus;
  timestamp: string;
  meta?: string;
};

type StreamHealth = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive" | "warning";
};

const events: ActivityEvent[] = [
  {
    id: "EVT-0048",
    category: "payments",
    type: "ACH Transfer",
    title: "Payroll batch released",
    detail: "Atlas Ventures approved 26 outgoing ACH payouts totaling $148,920.00.",
    actor: "Rachel A.",
    actorInitials: "RA",
    status: "success",
    timestamp: "1 min ago",
    meta: "TRX-8198"
  },
  {
    id: "EVT-0047",
    category: "system",
    type: "Webhook",
    title: "Provider webhook replayed",
    detail: "The reconciliation worker replayed 4 delayed payment webhooks after a timeout window.",
    actor: "system",
    actorInitials: "SY",
    status: "warning",
    timestamp: "4 min ago",
    meta: "WHK-0448"
  },
  {
    id: "EVT-0046",
    category: "cards",
    type: "Card Controls",
    title: "High-risk MCC block enabled",
    detail: "Northline Retail travel card now blocks gambling, wire transfer, and cash-like merchants.",
    actor: "Marcus K.",
    actorInitials: "MK",
    status: "success",
    timestamp: "7 min ago",
    meta: "CRD-5604"
  },
  {
    id: "EVT-0045",
    category: "accounts",
    type: "Account Review",
    title: "Treasury account moved to manual review",
    detail: "Horizon Ops reserve account exceeded its configured same-day transfer threshold.",
    actor: "system",
    actorInitials: "SY",
    status: "warning",
    timestamp: "11 min ago",
    meta: "ACC-3322"
  },
  {
    id: "EVT-0044",
    category: "kyc",
    type: "KYB Decision",
    title: "Business onboarding approved",
    detail: "Meridian Holdings passed document verification and beneficial owner screening.",
    actor: "Anaya P.",
    actorInitials: "AP",
    status: "success",
    timestamp: "16 min ago",
    meta: "APP-7733"
  },
  {
    id: "EVT-0043",
    category: "auth",
    type: "MFA Challenge",
    title: "Operator sign-in challenged",
    detail: "A new browser session for analyst@acme.bank required WebAuthn confirmation.",
    actor: "security@acme.bank",
    actorInitials: "SE",
    status: "pending",
    timestamp: "19 min ago",
    meta: "AUTH-0887"
  },
  {
    id: "EVT-0042",
    category: "payments",
    type: "Return",
    title: "ACH transfer returned",
    detail: "Nova Biolabs outbound payment returned with R02 - account closed.",
    actor: "system",
    actorInitials: "SY",
    status: "failed",
    timestamp: "24 min ago",
    meta: "TRX-8190"
  },
  {
    id: "EVT-0041",
    category: "cards",
    type: "Card Issued",
    title: "Virtual card issued",
    detail: "Visa debit ending 4821 was issued to the Northline operating account.",
    actor: "Marcus K.",
    actorInitials: "MK",
    status: "success",
    timestamp: "31 min ago",
    meta: "CRD-5591"
  },
  {
    id: "EVT-0040",
    category: "auth",
    type: "Role Update",
    title: "Operations analyst role granted",
    detail: "Priya Nair received the payments_operator role for internal transfer approval flows.",
    actor: "admin@acme.bank",
    actorInitials: "AD",
    status: "success",
    timestamp: "38 min ago",
    meta: "RBAC-0104"
  },
  {
    id: "EVT-0039",
    category: "system",
    type: "Migration",
    title: "Payments module schema applied",
    detail: "The payments_and_transfers_module migration completed successfully in staging.",
    actor: "CI/CD",
    actorInitials: "CD",
    status: "success",
    timestamp: "52 min ago",
    meta: "MIG-0015"
  },
  {
    id: "EVT-0038",
    category: "accounts",
    type: "Limit Update",
    title: "ACH daily limit increased",
    detail: "Atlas Ventures daily outgoing ACH capacity increased from $50K to $100K.",
    actor: "Rachel A.",
    actorInitials: "RA",
    status: "success",
    timestamp: "1 hr ago",
    meta: "ACC-3290"
  },
  {
    id: "EVT-0037",
    category: "kyc",
    type: "Watchlist Match",
    title: "Manual review requested",
    detail: "A director on the Meridian Holdings file matched a sanctions-adjacent name variant.",
    actor: "system",
    actorInitials: "SY",
    status: "warning",
    timestamp: "1 hr ago",
    meta: "APP-7729"
  },
  {
    id: "EVT-0036",
    category: "payments",
    type: "Internal Transfer",
    title: "Intraday sweep completed",
    detail: "Operating account moved $75,000.00 into the reserve buffer for settlement coverage.",
    actor: "Marcus K.",
    actorInitials: "MK",
    status: "success",
    timestamp: "2 hr ago",
    meta: "TRX-8171"
  },
  {
    id: "EVT-0035",
    category: "system",
    type: "Alert Queue",
    title: "Fraud queue backlog detected",
    detail: "Three suspicious card-not-present alerts remain open beyond the 20 minute SLA.",
    actor: "system",
    actorInitials: "SY",
    status: "warning",
    timestamp: "2 hr ago",
    meta: "MON-2091"
  }
];

const streamHealth: StreamHealth[] = [
  {
    label: "Ingestion health",
    value: "99.94%",
    detail: "Events replicated from payments, auth, and cards within the last 15 minutes.",
    tone: "positive"
  },
  {
    label: "Open follow-ups",
    value: "7",
    detail: "Case notes, returned transfers, and card control changes waiting for operator review.",
    tone: "warning"
  },
  {
    label: "Avg. event latency",
    value: "42 sec",
    detail: "Dummy telemetry for feed freshness across all enabled activity streams.",
    tone: "neutral"
  }
];

const categories: { label: string; value: EventCategory; icon: ElementType }[] = [
  { label: "All", value: "all", icon: ActivitySquare },
  { label: "Payments", value: "payments", icon: ArrowLeftRight },
  { label: "Accounts", value: "accounts", icon: Building2 },
  { label: "Cards", value: "cards", icon: CreditCard },
  { label: "KYC / KYB", value: "kyc", icon: ShieldAlert },
  { label: "Auth", value: "auth", icon: KeyRound },
  { label: "System", value: "system", icon: RefreshCw }
];

function categoryIcon(category: ActivityEvent["category"]) {
  switch (category) {
    case "payments":
      return ArrowLeftRight;
    case "accounts":
      return Building2;
    case "cards":
      return CreditCard;
    case "kyc":
      return ShieldCheck;
    case "auth":
      return UserCheck;
    case "system":
      return RefreshCw;
    default:
      return ActivitySquare;
  }
}

function statusConfig(status: EventStatus) {
  switch (status) {
    case "success":
      return {
        icon: CheckCircle2,
        dot: "bg-emerald-500",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      };
    case "failed":
      return {
        icon: XCircle,
        dot: "bg-rose-500",
        badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
      };
    case "warning":
      return {
        icon: ShieldAlert,
        dot: "bg-amber-500",
        badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      };
    default:
      return {
        icon: UserPlus,
        dot: "bg-blue-500",
        badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      };
  }
}

const summary = {
  total: events.length,
  success: events.filter((event) => event.status === "success").length,
  failed: events.filter((event) => event.status === "failed").length,
  warning: events.filter((event) => event.status === "warning").length
};

export function ActivityFeed() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>("all");

  const filtered =
    activeCategory === "all"
      ? events
      : events.filter((event) => event.category === activeCategory);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Events",
            value: summary.total,
            color: "text-slate-900 dark:text-slate-100",
            bg: "bg-slate-100 dark:bg-slate-800",
            icon: ActivitySquare,
            iconColor: "text-slate-500"
          },
          {
            label: "Successful",
            value: summary.success,
            color: "text-emerald-700 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            icon: CheckCircle2,
            iconColor: "text-emerald-500"
          },
          {
            label: "Warnings",
            value: summary.warning,
            color: "text-amber-700 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            icon: ShieldAlert,
            iconColor: "text-amber-500"
          },
          {
            label: "Failed",
            value: summary.failed,
            color: "text-rose-700 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-900/20",
            icon: XCircle,
            iconColor: "text-rose-500"
          }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {streamHealth.map((item) => (
          <Card key={item.label} className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle
                className={
                  item.tone === "positive"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : item.tone === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-900 dark:text-slate-100"
                }
              >
                {item.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Audit and Event Log</CardTitle>
            <CardDescription className="mt-0.5">
              Dummy activity across payments, accounts, cards, KYC, auth, and internal system events.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Export log
          </Button>
        </CardHeader>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3 dark:border-slate-800">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.value;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {category.label}
              </button>
            );
          })}
        </div>

        <CardContent className="p-0">
          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
            {filtered.map((event) => {
              const CategoryIcon = categoryIcon(event.category);
              const config = statusConfig(event.status);
              const StatusIcon = config.icon;

              return (
                <li
                  key={event.id}
                  className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <div className="relative mt-0.5 shrink-0">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <CategoryIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    </div>
                    <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${config.dot}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                      <Badge variant="outline" className={`text-[10px] ${config.badge}`}>
                        <span className="inline-flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" aria-hidden="true" />
                          {event.status}
                        </span>
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.detail}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                      {event.meta && <span className="font-mono">{event.meta}</span>}
                      <span>{event.type}</span>
                      <span>
                        by <span className="font-medium text-slate-600 dark:text-slate-300">{event.actor}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{event.timestamp}</span>
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white">
                      {event.actorInitials}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ActivitySquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" aria-hidden="true" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No events in this category.</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing {filtered.length} of {events.length} events from the last 24 hours.
            </p>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400">
              Load older events
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
