import { redirect } from "next/navigation";
import { ActivitySquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ActivityPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return (
    <DashboardShell
      activeHref="/dashboard/activity"
      userEmail={user.email}
      signOut={signOut}
      section="Observability"
      title={
        <span className="flex items-center gap-2">
          <ActivitySquare className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Activity Log
        </span>
      }
      description="Audit trail of all platform events — payments, KYC decisions, card actions, auth events, and system changes."
    >
      <ActivityFeed />
    </DashboardShell>
  );
}
