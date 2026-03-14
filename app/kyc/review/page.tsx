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
    <DashboardShell
      activeHref="/kyc/review"
      userEmail={user.email}
      signOut={signOut}
      section="Compliance"
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
          KYC / KYB Review Queue
        </span>
      }
      description="Review flagged applications. Approve, request more information, or reject based on verification evidence and sanctions screening results."
    >
      <KycReviewQueue />
    </DashboardShell>
  );
}
