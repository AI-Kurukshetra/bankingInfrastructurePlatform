"use client";

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type EventCategory = "all" | "payments" | "accounts" | "cards" | "kyc" | "auth" | "system";

type ActivityEvent = {
  id: string;
  category: Exclude<EventCategory, "all">;
  type: string;
  title: string;
  detail: string;
  actor: string;
  actorInitials: string;
  status: "success" | "failed" | "pending" | "warning";
  timestamp: string;
  meta?: string;
};

const events: ActivityEvent[] = [
  {
    id: "EVT-0041",
    category: "payments",
    type: "ACH Transfer",
    title: "ACH transfer settled",
    detail: "Atlas Ventures → Northline Retail for $18,450.00",
    actor: "system",
    actorInitials: "SY",
    status: "success",
    timestamp: "2 min ago",
    meta: "TRX-8124"
  },
  {
    id: "EVT-0040",
    category: "kyc",
    type: "KYC Decision",
    title: "KYC application approved",
    detail: "Consumer application for James Okafor passed all checks",
    actor: "Rachel A.",
    actorInitials: "RA",
    status: "success",
    timestamp: "8 min ago",
    meta: "APP-7721"
  },
  {
    id: "EVT-0039",
    category: "cards",
    type: "Card Issued",
    title: "Virtual card issued",
    detail: "Visa Debit •••• 4821 linked to Northline Operating account",
    actor: "Marcus K.",
    actorInitials: "MK",
    status: "success",
    timestamp: "14 min ago",
    meta: "CRD-5591"
  },
  {
    id: "EVT-0038",
    category: "payments",
    type: "ACH Transfer",
    title: "ACH transfer returned",
    detail: "Nova Biolabs → External •••• 9201 returned — R02 Account closed",
    actor: "system",
    actorInitials: "SY",
    status: "failed",
    timestamp: "21 min ago",
    meta: "TRX-8119"
  },
  {
    id: "EVT-0037",
    category: "accounts",
    type: "Account Frozen",
    title: "Account frozen by compliance",
    detail: "Horizon Ops checking account frozen pending investigation",
    actor: "Admin",
    actorInitials: "AD",
    status: "warning",
    timestamp: "35 min ago",
    meta: "ACC-3312"
  },
  {
    id: "EVT-0036",
    category: "kyc",
    type: "Sanctions Hit",
    title: "OFAC watchlist match detected",
    detail: "Business application for Meridian Holdings flagged for review",
    actor: "system",
    actorInitials: "SY",
    status: "warning",
    timestamp: "42 min ago",
    meta: "APP-7718"
  },
  {
    id: "EVT-0035",
    category: "auth",
    type: "Login",
    title: "Admin login from new device",
    detail: "Successful login from Chrome on Windows — IP 92.168.1.44",
    actor: "admin@acme.bank",
    actorInitials: "AD",
    status: "success",
    timestamp: "1 hr ago",
    meta: "AUTH-0882"
  },
  {
    id: "EVT-0034",
    category: "accounts",
    type: "Account Opened",
    title: "New business account provisioned",
    detail: "Checking account opened for Nova Biolabs Inc. via onboarding",
    actor: "system",
    actorInitials: "SY",
    status: "success",
    timestamp: "1 hr ago",
    meta: "ACC-3318"
  },
  {
    id: "EVT-0033",
    category: "payments",
    type: "Internal Transfer",
    title: "Internal transfer settled instantly",
    detail: "Operating → Reserve account $75,000.00 sweep",
    actor: "Marcus K.",
    actorInitials: "MK",
    status: "success",
    timestamp: "2 hr ago",
    meta: "TRX-8101"
  },
  {
    id: "EVT-0032",
    category: "kyc",
    type: "KYC Submitted",
    title: "New KYC application submitted",
    detail: "Consumer onboarding for Priya Nair — identity documents uploaded",
    actor: "customer",
    actorInitials: "PN",
    status: "pending",
    timestamp: "2 hr ago",
    meta: "APP-7715"
  },
  {
    id: "EVT-0031",
    category: "cards",
    type: "Card Frozen",
    title: "Card frozen by customer request",
    detail: "Visa Debit •••• 3302 frozen — reported lost by cardholder",
    actor: "support@acme.bank",
    actorInitials: "SP",
    status: "warning",
    timestamp: "3 hr ago",
    meta: "CRD-5580"
  },
  {
    id: "EVT-0030",
    category: "auth",
    type: "Failed Login",
    title: "Repeated failed login attempts",
    detail: "5 consecutive failures for analyst@acme.bank — account locked",
    actor: "system",
    actorInitials: "SY",
    status: "failed",
    timestamp: "4 hr ago",
    meta: "AUTH-0871"
  },
  {
    id: "EVT-0029",
    category: "system",
    type: "Schema Migration",
    title: "Database migration applied",
    detail: "Migration 20260315 — payments_and_transfers_module applied successfully",
    actor: "CI/CD",
    actorInitials: "CD",
    status: "success",
    timestamp: "5 hr ago",
    meta: "MIG-0015"
  },
  {
    id: "EVT-0028",
    category: "accounts",
    type: "Limit Updated",
    title: "Spending limit increased",
    detail: "Daily ACH limit raised from $50K to $100K for Atlas Ventures",
    actor: "Rachel A.",
    actorInitials: "RA",
    status: "success",
    timestamp: "6 hr ago",
    meta: "ACC-3290"
  },
  {
    id: "EVT-0027",
    category: "system",
    type: "Webhook",
    title: "Outbound webhook delivery failed",
    detail: "POST https://hooks.partner.io/banking failed — 503 after 3 retries",
    actor: "system",
    actorInitials: "SY",
    status: "failed",
    timestamp: "7 hr ago",
    meta: "WHK-0441"
  }
];

const categories: { label: string; value: EventCategory; icon: React.ElementType }[] = [
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
    case "payments": return ArrowLeftRight;
    case "accounts": return Building2;
    case "cards": return CreditCard;
    case "kyc": return ShieldCheck;
    case "auth": return UserCheck;
    case "system": return RefreshCw;
    default: return ActivitySquare;
  }
}

function statusConfig(status: ActivityEvent["status"]) {
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
        dot: "bg-blue-400",
        badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      };
  }
}

const summary = {
  total: events.length,
  success: events.filter((e) => e.status === "success").length,
  failed: events.filter((e) => e.status === "failed").length,
  warning: events.filter((e) => e.status === "warning").length
};

export function ActivityFeed() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>("all");

  const filtered =
    activeCategory === "all" ? events : events.filter((e) => e.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* Summary row */}
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
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
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

      {/* Feed card */}
      <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Audit & Event Log</CardTitle>
            <CardDescription className="mt-0.5">
              Real-time activity across payments, accounts, cards, KYC, and system events.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
            <Filter className="h-3.5 w-3.5" />
            Export log
          </Button>
        </CardHeader>

        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pb-0 pt-3 dark:border-slate-800">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Event list */}
        <CardContent className="p-0">
          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
            {filtered.map((event) => {
              const CatIcon = categoryIcon(event.category);
              const sc = statusConfig(event.status);

              return (
                <li
                  key={event.id}
                  className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  {/* Left: status dot + category icon */}
                  <div className="relative mt-0.5 shrink-0">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <CatIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${sc.dot}`} />
                  </div>

                  {/* Middle: text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {event.title}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${sc.badge}`}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {event.detail}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="font-mono">{event.meta}</span>
                      <span>·</span>
                      <span>{event.type}</span>
                      <span>·</span>
                      <span>
                        by{" "}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {event.actor}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right: time + actor avatar */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {event.timestamp}
                    </span>
                    <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white">
                      {event.actorInitials}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ActivitySquare className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No events in this category.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing {filtered.length} of {events.length} events · Last 24 hours
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
