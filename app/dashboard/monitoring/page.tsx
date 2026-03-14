import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MonitoringWorkspace } from "@/components/monitoring/MonitoringWorkspace";
import { getCurrentUserProfile } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MonitoringPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentUserProfile();

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  const isStaff = profile && ["admin", "analyst", "developer"].includes(profile.role);

  return (
    <DashboardShell
      activeHref="/dashboard/monitoring"
      userEmail={user.email}
      signOut={signOut}
      section="Risk Operations"
      title={
        <span className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Transaction Monitoring
        </span>
      }
      description="Triaged alert queue, case assignment, notes, and disposition workflow for payment and card anomalies."
    >
      {isStaff ? (
        <MonitoringWorkspace role={profile.role} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Radar className="h-7 w-7 text-blue-500" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">Access Restricted</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Transaction monitoring is available to analysts, administrators, and developers only.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}

