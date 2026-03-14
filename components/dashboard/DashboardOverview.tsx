import { ArrowRight, ArrowUpRight, Building2, CreditCard, ShieldAlert, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
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

        {/* Transactions */}
        <TabsContent value="transactions" className="mt-0">
          <Card className="border-slate-100/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
              <div>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription className="mt-0.5">
                  Real-time movement across ACH, internal and card rails.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Queue */}
        <TabsContent value="risk" className="mt-0">
          <Card className="border-slate-100/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
              <div>
                <CardTitle className="text-base">Analyst Risk Queue</CardTitle>
                <CardDescription className="mt-0.5">
                  Prioritized operational alerts for compliance and fraud review.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-blue-100 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-blue-900 dark:hover:bg-blue-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      <AvatarFallback className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {alert.owner}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.detail}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-slate-400">{alert.time}</span>
                    <Badge variant="outline" className={severityBadgeTone(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquidity */}
        <TabsContent value="liquidity" className="mt-0">
          <Card className="border-slate-100/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
              <div>
                <CardTitle className="text-base">Liquidity Health</CardTitle>
                <CardDescription className="mt-0.5">
                  Reserve coverage and intraday utilization against configured limits.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Review policy
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {liquidityMetrics.map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{metric.label}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${metric.value >= 80 ? "text-emerald-600 dark:text-emerald-400" : metric.status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {metric.value}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${liquidityColor(metric.value, metric.status)}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
