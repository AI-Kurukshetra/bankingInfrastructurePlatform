import { redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PaymentsWorkspace } from "@/components/payments/PaymentsWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/rbac";

export default async function PaymentsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profile is optional â€” falls back gracefully if profiles table isn't set up yet
  const profile = await getCurrentUserProfile();
  const role = profile?.role ?? "customer";

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  const [{ data: accounts }, { data: transfers }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, account_name, account_number, status, currency, available_balance")
      .order("created_at", { ascending: false }),
    supabase
      .from("transfers")
      .select(
        "id, rail, source_account_id, destination_account_id, amount, currency, status, memo, created_by, provider, provider_status, failure_reason, return_reason, destination_external_name, destination_external_account_mask, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  return (
    <DashboardShell
      activeHref="/dashboard/payments"
      userEmail={user.email}
      signOut={signOut}
      section="Money Movement"
      title={
        <span className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Payments & Transfers
        </span>
      }
      description="Initiate ACH payouts and internal transfers. Track status, reconcile events, and review transfer history."
    >
      <PaymentsWorkspace
        initialAccounts={(accounts ?? []).map((item) => ({
          ...item,
          available_balance: Number(item.available_balance)
        }))}
        initialTransfers={(transfers ?? []).map((item) => ({
          ...item,
          amount: Number(item.amount)
        }))}
        role={role}
      />
    </DashboardShell>
  );
}


