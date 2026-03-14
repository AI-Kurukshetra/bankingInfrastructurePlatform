import Link from "next/link";
import {
  ActivitySquare,
  Building2,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert
} from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Onboarding", href: "/onboarding", icon: ClipboardCheck },
  { label: "Accounts", href: "/dashboard", icon: Building2 },
  { label: "Cards", href: "/dashboard", icon: CreditCard },
  { label: "KYC / KYB Review", href: "/kyc/review", icon: ShieldAlert, badge: 17 },
  { label: "Activity", href: "/dashboard", icon: ActivitySquare }
];

type DashboardSidebarProps = {
  activeHref?: string;
  userEmail?: string;
  signOut?: () => Promise<void | never>;
};

function getInitials(email: string) {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function DashboardSidebar({ activeHref = "/dashboard", userEmail, signOut }: DashboardSidebarProps) {
  const initials = userEmail ? getInitials(userEmail) : "??";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <BrandLogo href="/dashboard" subtitle="Operations Console" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Main
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="my-4 border-t border-slate-100 dark:border-slate-800" />

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Settings
        </p>
        <div className="space-y-0.5">
          <Link
            href="/account/reset-password"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-500" aria-hidden="true" />
            Account Settings
          </Link>
        </div>
      </nav>

      {userEmail && (
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                {userEmail}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Operations Staff</p>
            </div>
            {signOut && (
              <form action={signOut}>
                <button
                  type="submit"
                  title="Sign out"
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

