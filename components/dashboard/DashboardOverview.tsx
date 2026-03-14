import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ActivitySquare,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  CreditCard,
  ShieldAlert,
  Wallet
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/dashboard/MetricCard";

const transactions = [
  {
    id: "TRX-8124",
    customer: "Atlas Ventures",
    amount: "$18,450.00",
    status: "Settled",
    rails: "ACH",
    time: "2 min ago"
  },
  {
    id: "TRX-8125",
    customer: "Northline Retail",
    amount: "$7,290.15",
    status: "Pending",
    rails: "Internal",
    time: "8 min ago"
  },
  {
    id: "TRX-8126",
    customer: "Nova Biolabs",
    amount: "$31,105.40",
    status: "Review",
    rails: "ACH",
    time: "14 min ago"
  },
  {
    id: "TRX-8127",
    customer: "Horizon Ops",
    amount: "$4,025.00",
    status: "Settled",
    rails: "Card",
    time: "21 min ago"
  }
];

const alerts = [
  {
    title: "Velocity threshold triggered",
    detail: "3 transfers over policy limit in 15 minutes",
    severity: "High",
    owner: "RA",
    time: "5 min ago"
  },
  {
    title: "Card-not-present spike",
    detail: "Unusual card-not-present burst in new merchant category",
    severity: "Medium",
    owner: "MK",
    time: "23 min ago"
  },
  {
    title: "KYC pending document",
    detail: "Business onboarding missing proof of address",
    severity: "Low",
    owner: "AN",
    time: "1 hr ago"
  }
];

const liquidityMetrics = [
  { label: "Reserve coverage ratio", value: 82, status: "healthy" },
  { label: "Intraday transfer capacity", value: 67, status: "healthy" },
  { label: "Overnight settlement buffer", value: 91, status: "healthy" },
  { label: "Collateral utilization", value: 44, status: "warning" }
];

const moduleLinks = [
  {
    title: "Onboarding",
    href: "/onboarding",
    description: "Resume application drafts and submit customer onboarding files.",
    icon: ClipboardCheck,
    accent: "from-sky-500/20 via-cyan-500/10 to-transparent",
    iconTone: "text-sky-600 dark:text-sky-300"
  },
  {
    title: "Accounts",
    href: "/dashboard/accounts",
    description: "Provision accounts, review balances, and inspect account state.",
    icon: Building2,
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
    iconTone: "text-emerald-600 dark:text-emerald-300"
  },
  {
    title: "Payments",
    href: "/dashboard/payments",
    description: "Initiate ACH and internal transfers with operational controls.",
    icon: Wallet,
    accent: "from-amber-500/20 via-orange-500/10 to-transparent",
    iconTone: "text-amber-600 dark:text-amber-300"
  },
  {
    title: "Cards",
    href: "/dashboard/cards",
    description: "Issue virtual cards, manage lifecycle controls, and review feed activity.",
    icon: CreditCard,
    accent: "from-blue-600/25 via-indigo-500/15 to-transparent",
    iconTone: "text-blue-600 dark:text-blue-300"
  },
  {
    title: "Activity",
    href: "/dashboard/activity",
    description: "Review the platform-wide event log with dummy audit activity and operator follow-ups.",
    icon: ActivitySquare,
    accent: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    iconTone: "text-violet-600 dark:text-violet-300"
  }
];

const tabScrollerStyle: CSSProperties = {
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch"
};

function statusBadgeTone(status: string) {
  if (status === "Settled") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
  if (status === "Pending") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
}

function severityBadgeTone(severity: string) {
  if (severity === "High") return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
}

function liquidityColor(value: number, status: string) {
  if (status === "warning") return "bg-amber-500";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-blue-500";
  return "bg-rose-500";
}

export function DashboardOverview() {
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Deposits"
          value="$4.82M"
          trend="+8.1% month-over-month"
          icon={Wallet}
          trendTone="positive"
        />
        <MetricCard
          title="Active Accounts"
          value="2,148"
          trend="+124 this week"
          icon={Building2}
          trendTone="neutral"
        />
        <MetricCard
          title="Card Spend Today"
          value="$92.4K"
          trend="Within expected range"
          icon={CreditCard}
          trendTone="neutral"
        />
        <MetricCard
          title="Open Risk Alerts"
          value="17"
          trend="3 need immediate action"
          icon={ShieldAlert}
          trendTone="warning"
        />
      </div>

      <Card className="border-slate-100/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Modules</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Direct desktop access to the operational surfaces in use today.
            </p>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">
            {moduleLinks.length} live modules
          </span>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-5">
          {moduleLinks.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${module.accent}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80">
                      <Icon className={`h-5 w-5 ${module.iconTone}`} aria-hidden="true" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                  <p className="mt-6 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {module.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {module.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-100/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Tabs defaultValue="transactions" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-2 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:pb-4">
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Activity</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Live data across transactions, risk alerts, and liquidity.
                </p>
              </div>
              <div
                className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
                style={tabScrollerStyle}
              >
                <TabsList className="shrink-0">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="risk">
                    Risk Queue
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-100 px-1 text-[10px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                      3
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          <TabsContent value="transactions" className="m-0 min-h-0 flex-1 overflow-auto">
            <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3 dark:border-slate-800 sm:px-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time movement across ACH, internal and card rails.
              </p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-50 hover:bg-transparent dark:border-slate-800">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Transfer ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rails</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="border-slate-50 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <TableCell className="pl-6 font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                        {tx.id}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300">{tx.customer}</TableCell>
                      <TableCell>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          {tx.rails}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tx.amount}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeTone(tx.status)}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs text-slate-400">{tx.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="m-0 min-h-0 flex-1 overflow-auto">
            <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3 dark:border-slate-800 sm:px-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prioritized operational alerts for compliance and fraud review.
              </p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 p-3 sm:p-4">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-blue-100 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-blue-900 dark:hover:bg-blue-950/20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      <AvatarFallback className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {alert.owner}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.detail}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0 sm:gap-3">
                    <span className="text-xs text-slate-400">{alert.time}</span>
                    <Badge variant="outline" className={severityBadgeTone(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="liquidity" className="m-0 min-h-0 flex-1 overflow-auto">
            <div className="flex items-center justify-between border-b border-slate-50 px-4 py-3 dark:border-slate-800 sm:px-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reserve coverage and intraday utilization against configured limits.
              </p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Review policy
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-5 p-4 sm:p-6">
              {liquidityMetrics.map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{metric.label}</p>
                    <span className={`text-sm font-bold ${metric.value >= 80 ? "text-emerald-600 dark:text-emerald-400" : metric.status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${liquidityColor(metric.value, metric.status)}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
