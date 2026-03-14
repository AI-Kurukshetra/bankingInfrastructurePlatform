import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { UserOnboardingWorkspace } from "@/components/onboarding/UserOnboardingWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
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

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-slate-50">
      <DashboardSidebar activeHref="/onboarding" userEmail={user.email} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Phase 2
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">User Onboarding Module</h1>
          <p className="mt-1 text-sm text-slate-600">
            Build, resume, validate, and submit consumer and business onboarding applications.
          </p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <UserOnboardingWorkspace />
        </main>
      </div>
    </div>
  );
}
