import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { UserOnboardingWorkspace } from "@/components/onboarding/UserOnboardingWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return (
    <DashboardShell
      activeHref="/onboarding"
      userEmail={user.email}
      signOut={signOut}
      section="Onboarding"
      title={
        <span className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-500" aria-hidden="true" />
          User Onboarding
        </span>
      }
      description="Build, resume, validate, and submit consumer and business onboarding applications."
    >
      <UserOnboardingWorkspace />
    </DashboardShell>
  );
}
