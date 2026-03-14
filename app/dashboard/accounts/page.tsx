import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  AccountSummaryWorkspace,
  type AccountListItem
} from "@/components/accounts/AccountSummaryWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/rbac";

export default async function AccountsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profile is optional — falls back gracefully if profiles table isn't set up yet
  const profile = await getCurrentUserProfile();
  const role = profile?.role ?? "customer";

  async function signOut() {
    "use server";
    const serverClient = createSupabaseServerClient();
    await serverClient.auth.signOut();
    redirect("/login");
  }

  const { data: initialAccounts } = await supabase
    .from("bank_accounts")
    .select(
      "id, onboarding_application_id, organization_id, owner_user_id, account_name, account_number, status, currency, available_balance, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      activeHref="/dashboard/accounts"
      userEmail={user.email}
      signOut={signOut}
      section="Account Operations"
      title={
        <span className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Account Management
        </span>
      }
      description="View, manage, and provision bank accounts across your customer portfolio."
    >
      <AccountSummaryWorkspace
        initialAccounts={(initialAccounts ?? []) as AccountListItem[]}
        role={role}
      />
    </DashboardShell>
  );
}

