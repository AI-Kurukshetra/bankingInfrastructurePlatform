import { redirect } from "next/navigation";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  AccountSummaryWorkspace,
  type AccountListItem
} from "@/components/accounts/AccountSummaryWorkspace";
import { DashboardCommandPalette } from "@/components/dashboard/DashboardCommandPalette";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { getCurrentUserProfile } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = createSupabaseServerClient();

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
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SessionGuard />
      <DashboardSidebar
        activeHref="/dashboard/accounts"
        userEmail={profile.email ?? undefined}
        signOut={signOut}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Account Operations
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Account Management Module
            </h1>
          </div>
          <DashboardCommandPalette />
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <AccountSummaryWorkspace
            initialAccounts={(initialAccounts ?? []) as AccountListItem[]}
            role={profile.role}
          />
        </main>
      </div>
    </div>
  );
}

