import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  trendTone?: "positive" | "neutral" | "warning";
};

const toneConfig = {
  positive: {
    icon: TrendingUp,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    accent: "from-emerald-500 to-emerald-400"
  },
  neutral: {
    icon: Minus,
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    accent: "from-blue-500 to-blue-400"
  },
  warning: {
    icon: TrendingDown,
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    accent: "from-amber-500 to-orange-400"
  }
};

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  trendTone = "neutral"
}: MetricCardProps) {
  const tone = toneConfig[trendTone];
  const TrendIcon = tone.icon;

  return (
    <Card className="group relative overflow-hidden border-slate-100/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", tone.accent)} />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {value}
            </p>
            <div className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", tone.bg, tone.text)}>
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              {trend}
            </div>
          </div>
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.iconBg)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
