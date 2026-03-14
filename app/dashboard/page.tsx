import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AdminControlCenter } from "@/components/dashboard/AdminControlCenter";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getCurrentUserProfile } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentUserProfile();
  const role = profile?.role ?? "customer";

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  const firstName = user.email?.split("@")[0].split(/[._-]/)[0] ?? "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const isStaff = ["admin", "analyst", "developer"].includes(role);

  return (
    <DashboardShell
      activeHref="/dashboard"
      userEmail={user.email}
      signOut={signOut}
      userRole={role}
      section={isStaff ? "Admin Control Center" : "Operations Workspace"}
      title={isStaff ? `Operator console for ${displayName}` : `Good morning, ${displayName}`} 
      description={isStaff ? "Cross-functional queues, privileged actions, exports, and actor history for internal operations." : "Access your banking workspace."}
      headerRight={
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/40 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">All systems healthy</span>
        </div>
      }
    >
      {isStaff ? <AdminControlCenter role={role} /> : <DashboardOverview />}
    </DashboardShell>
  );
}
