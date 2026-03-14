import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  const firstName = user.email?.split("@")[0].split(/[._-]/)[0] ?? "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Fixed sidebar */}
      <DashboardSidebar
        activeHref="/dashboard"
        userEmail={user.email}
        signOut={signOut}
      />

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky topbar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Operations Workspace
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Good morning, {displayName} 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/40 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">All systems healthy</span>
            </div>
            <DashboardCommandPalette />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <DashboardOverview />
        </main>
      </div>
    </div>
  );
}
