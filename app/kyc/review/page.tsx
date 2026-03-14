import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { KycReviewQueue } from "@/components/kyc/KycReviewQueue";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/rbac";

export default async function KycReviewPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentUserProfile();
  if (!profile || !["admin", "analyst"].includes(profile.role)) {
    redirect("/dashboard");
  }

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar
        activeHref="/kyc/review"
        userEmail={user.email}
        signOut={signOut}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky topbar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Compliance
            </p>
            <h1 className="mt-0.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
              KYC / KYB Review Queue
            </h1>
          </div>
          <DashboardCommandPalette />
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review flagged consumer and business applications. Approve, request more information, or reject based on verification evidence and sanctions screening results.
            </p>
          </div>
          <KycReviewQueue />
        </main>
      </div>
    </div>
  );
}
