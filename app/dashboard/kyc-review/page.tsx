import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { KycReviewQueue } from "@/components/kyc/KycReviewQueue";
import { getCurrentUserProfile } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function KycReviewPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!["admin", "analyst"].includes(profile.role)) {
    redirect("/dashboard");
  }

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh w-full overflow-hidden bg-slate-50">
      <DashboardSidebar activeHref="/dashboard/kyc-review" userEmail={profile.email ?? undefined} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Compliance</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">KYC / KYB Analyst Review Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review flagged verification checks, apply decisions, and capture review notes.
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <KycReviewQueue />
        </main>
      </div>
    </div>
  );
}
