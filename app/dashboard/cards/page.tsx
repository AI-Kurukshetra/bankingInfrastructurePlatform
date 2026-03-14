import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CardManagementWorkspace } from "@/components/cards/CardManagementWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/rbac";

export default async function CardsPage() {
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

  const [{ data: accounts }, { data: cards }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, account_name, account_number, currency, status, available_balance")
      .order("created_at", { ascending: false }),
    supabase
      .from("cards")
      .select(
        "id, account_id, last4, status, spending_limit_cents, provider_card_id, form_factor, nickname, cardholder_name, network, spending_controls, issued_at, activated_at, frozen_at, terminated_at, created_at, updated_at, bank_accounts(id, account_name, account_number, currency, status)"
      )
      .order("created_at", { ascending: false })
  ]);

  return (
    <DashboardShell
      activeHref="/dashboard/cards"
      userEmail={user.email}
      signOut={signOut}
      section="Card Operations"
      title={
        <span className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Cards Module
        </span>
      }
      description="Issue, manage, and monitor virtual and physical cards across accounts."
    >
      <CardManagementWorkspace
        initialAccounts={(accounts ?? []).map((item) => ({
          ...item,
          available_balance: Number(item.available_balance)
        }))}
        initialCards={(cards ?? []).map((item) => ({
          ...item,
          spending_limit_cents:
            item.spending_limit_cents === null || item.spending_limit_cents === undefined
              ? null
              : Number(item.spending_limit_cents),
          bank_accounts:
            Array.isArray(item.bank_accounts)
              ? item.bank_accounts[0] ?? null
              : item.bank_accounts ?? null
        }))}
        role={role}
      />
    </DashboardShell>
  );
}

