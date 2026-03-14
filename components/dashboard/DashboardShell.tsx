import type { ReactNode } from "react";
import type { AppRole } from "@/lib/auth/rbac";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { SessionGuard } from "@/components/auth/SessionGuard";

type DashboardShellProps = {
  activeHref: string;
  userEmail?: string;
  userRole?: AppRole;
  signOut?: () => Promise<void | never>;
  section: string;
  title: ReactNode;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function DashboardShell({ activeHref, userEmail, userRole, signOut, section, title, description, headerRight, children }: DashboardShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SessionGuard />
      <DashboardSidebar activeHref={activeHref} userEmail={userEmail} userRole={userRole} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
            <MobileNav activeHref={activeHref} userEmail={userEmail} userRole={userRole} signOut={signOut} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">{section}</p>
              <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">{section}</p>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
            {description ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {headerRight ? <div className="hidden sm:flex">{headerRight}</div> : null}
            <DashboardCommandPalette userRole={userRole} />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
