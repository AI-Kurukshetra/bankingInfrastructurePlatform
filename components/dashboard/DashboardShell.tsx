import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { SessionGuard } from "@/components/auth/SessionGuard";

type DashboardShellProps = {
  /** Sidebar active nav item href */
  activeHref: string;
  /** User email shown in sidebar profile section */
  userEmail?: string;
  /** Server action to sign the user out */
  signOut?: () => Promise<void | never>;
  /** Small section label above the title (e.g. "Compliance") */
  section: string;
  /** Main page heading — accepts a ReactNode so you can embed icons */
  title: ReactNode;
  /** Optional description shown below the title inside the topbar */
  description?: string;
  /** Optional content rendered to the left of the command palette in the topbar */
  headerRight?: ReactNode;
  /** Page body content */
  children: ReactNode;
};

export function DashboardShell({
  activeHref,
  userEmail,
  signOut,
  section,
  title,
  description,
  headerRight,
  children
}: DashboardShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SessionGuard />
      {/* Sidebar */}
      <DashboardSidebar
        activeHref={activeHref}
        userEmail={userEmail}
        signOut={signOut}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky top bar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {section}
            </p>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {headerRight}
            <DashboardCommandPalette />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
