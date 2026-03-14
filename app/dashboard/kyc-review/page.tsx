import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { KycReviewQueue } from "@/components/kyc/KycReviewQueue";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/rbac";

export default async function KycReviewPage() {
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

  const isStaff = profile && ["admin", "analyst"].includes(profile.role);

  return (
    <DashboardShell
      activeHref="/dashboard/kyc-review"
      userEmail={user.email}
      signOut={signOut}
      section="Compliance"
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
          KYC / KYB Review Queue
        </span>
      }
      description="Review flagged verification checks, apply decisions, and capture review notes."
    >
      {isStaff ? (
        <KycReviewQueue />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/30">
            <ShieldAlert className="h-7 w-7 text-amber-500" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
            Access Restricted
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            The KYC / KYB review queue is available to analysts and administrators only.
            Contact your admin to request elevated access.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
