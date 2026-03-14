"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Lock,
  LockOpen,
  PlusCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export type AccountListItem = {
  id: string;
  onboarding_application_id: string | null;
  organization_id: string | null;
  owner_user_id: string | null;
  account_name: string;
  account_number: string;
  status: "active" | "frozen" | "closed";
  currency: string;
  available_balance: number;
  created_at: string;
  updated_at: string;
};

type AccountDetails = AccountListItem & {
  synctera_account_id: string | null;
};

type AccountSnapshot = {
  id: string;
  available_balance: number;
  currency: string;
  captured_at: string;
};

type AccountLifecycleEvent = {
  id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string | null;
  source: string;
  details: Record<string, unknown>;
  created_at: string;
};

type AccountTransaction = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  running_balance: number | null;
  description: string | null;
  merchant_name: string | null;
  posted_at: string | null;
  created_at: string;
};

type AccountSummaryWorkspaceProps = {
  initialAccounts: AccountListItem[];
  role: "customer" | "analyst" | "admin" | "developer";
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusTone(status: "active" | "frozen" | "closed") {
  if (status === "active") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "frozen") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-700 bg-slate-100 border-slate-300";
}

export function AccountSummaryWorkspace({
  initialAccounts,
  role
}: AccountSummaryWorkspaceProps) {
  const [accounts, setAccounts] = useState<AccountListItem[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    initialAccounts[0]?.id ?? null
  );
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<AccountLifecycleEvent[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [provisioningApplicationId, setProvisioningApplicationId] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  async function refreshAccounts() {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = (await response.json()) as {
      accounts?: AccountListItem[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to refresh accounts list.");
    }

    const next = data.accounts ?? [];
    setAccounts(next);

    if (selectedAccountId) {
      const stillExists = next.some((item) => item.id === selectedAccountId);
      if (!stillExists) {
        setSelectedAccountId(next[0]?.id ?? null);
      }
    }
  }

  async function loadAccountDetails(accountId: string) {
    setIsLoadingDetails(true);
    setMessage(null);

    try {
      const [detailsResponse, txResponse] = await Promise.all([
        fetch(`/api/accounts/${accountId}`, { cache: "no-store" }),
        fetch(`/api/accounts/${accountId}/transactions`, { cache: "no-store" })
      ]);

      const detailsData = (await detailsResponse.json()) as {
        error?: string;
        account?: AccountDetails;
        snapshot?: AccountSnapshot | null;
        lifecycleEvents?: AccountLifecycleEvent[];
      };

      const txData = (await txResponse.json()) as {
        error?: string;
        transactions?: AccountTransaction[];
      };

      if (!detailsResponse.ok) {
        throw new Error(detailsData.error ?? "Unable to load account details.");
      }

      if (!txResponse.ok) {
        throw new Error(txData.error ?? "Unable to load account transactions.");
      }

      setDetails(detailsData.account ?? null);
      setSnapshot(detailsData.snapshot ?? null);
      setLifecycleEvents(detailsData.lifecycleEvents ?? []);
      setTransactions(txData.transactions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load account details.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  useEffect(() => {
    if (selectedAccountId) {
      void loadAccountDetails(selectedAccountId);
    }
  }, [selectedAccountId]);

  async function provisionFromApprovedApplication() {
    const appId = provisioningApplicationId.trim();
    if (!appId) {
      setMessage("Enter an approved onboarding application ID first.");
      return;
    }

    setIsMutating(true);
    setMessage(null);

    try {
      const response = await fetch("/api/accounts/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ onboardingApplicationId: appId })
      });

      const data = (await response.json()) as {
        error?: string;
        account?: AccountListItem;
        replayed?: boolean;
      };

      if (!response.ok || !data.account) {
        throw new Error(data.error ?? "Unable to provision account from application.");
      }

      await refreshAccounts();
      setSelectedAccountId(data.account.id);
      setProvisioningApplicationId("");
      setMessage(
        data.replayed
          ? "Existing account already linked to application; reusing prior provisioning result."
          : "Account created from approved application."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to provision account from application."
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function syncWithProvider() {
    if (!selectedAccountId) {
      setMessage("Select an account before syncing.");
      return;
    }

    setIsMutating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/accounts/${selectedAccountId}/sync`, {
        method: "POST"
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sync account.");
      }

      await Promise.all([refreshAccounts(), loadAccountDetails(selectedAccountId)]);
      setMessage("Account details refreshed from provider adapter.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sync account.");
    } finally {
      setIsMutating(false);
    }
  }

  async function changeStatus(action: "freeze" | "unfreeze" | "close") {
    if (!selectedAccountId) {
      setMessage("Select an account first.");
      return;
    }

    const confirmationMap = {
      freeze: "Freeze this account?",
      unfreeze: "Unfreeze this account?",
      close: "Close this account? This should be used only for final account shutdown."
    };

    if (!window.confirm(confirmationMap[action])) {
      return;
    }

    setIsMutating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/accounts/${selectedAccountId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? `Unable to ${action} account.`);
      }

      await Promise.all([refreshAccounts(), loadAccountDetails(selectedAccountId)]);
      setMessage(`Account ${action} action completed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} account.`);
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
      <Card className="border border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Select an account to inspect balances, lifecycle events, and recent transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              From Approved Application
            </p>
            <input
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Onboarding application ID"
              value={provisioningApplicationId}
              onChange={(event) => setProvisioningApplicationId(event.target.value)}
            />
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => void provisionFromApprovedApplication()}
              disabled={isMutating}
            >
              <PlusCircle className="h-4 w-4" />
              Provision Account
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshAccounts()}
            disabled={isMutating || isLoadingDetails}
          >
            Refresh Accounts
          </Button>

          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">No accounts available yet.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(account.id);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedAccountId === account.id
                      ? "border-blue-400 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{account.account_name}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone(
                        account.status
                      )}`}
                    >
                      {account.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    •••• {account.account_number.slice(-4)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatCurrency(Number(account.available_balance), account.currency)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>
              Balance snapshot, provider sync, and operational status controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!selectedAccount ? (
              <p className="text-slate-500">Select an account from the left panel.</p>
            ) : isLoadingDetails ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading account details...
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Available balance
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {formatCurrency(
                        Number(
                          snapshot?.available_balance ??
                            details?.available_balance ??
                            selectedAccount.available_balance
                        ),
                        details?.currency ?? selectedAccount.currency
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Snapshot: {formatDate(snapshot?.captured_at ?? details?.updated_at ?? selectedAccount.updated_at)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Account metadata
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Account ID: {selectedAccount.id}
                    </p>
                    <p className="text-sm text-slate-700">
                      Number: •••• {selectedAccount.account_number.slice(-4)}
                    </p>
                    <p className="text-sm text-slate-700">Status: {selectedAccount.status}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void syncWithProvider()}
                    disabled={isMutating}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync From Provider
                  </Button>

                  {role === "admin" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void changeStatus("freeze")}
                        disabled={isMutating || selectedAccount.status !== "active"}
                      >
                        <Lock className="h-4 w-4" />
                        Freeze
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void changeStatus("unfreeze")}
                        disabled={isMutating || selectedAccount.status !== "frozen"}
                      >
                        <LockOpen className="h-4 w-4" />
                        Unfreeze
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void changeStatus("close")}
                        disabled={isMutating || selectedAccount.status === "closed"}
                      >
                        Close Account
                      </Button>
                    </>
                  ) : null}
                </div>

                {message ? <p className="text-xs text-slate-600">{message}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Account lifecycle events and transaction feed for ledger-view reads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Lifecycle events
              </p>
              {lifecycleEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No lifecycle events recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {lifecycleEvents.slice(0, 8).map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"
                    >
                      <p className="font-medium text-slate-800">{event.event_type}</p>
                      <p className="text-xs text-slate-500">{formatDate(event.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Transactions
              </p>
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-500">No transactions found for this account.</p>
              ) : (
                <ul className="space-y-2">
                  {transactions.slice(0, 12).map((transaction) => {
                    const amount = Number(transaction.amount);
                    const positive = amount >= 0;
                    return (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {positive ? (
                            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-rose-600" />
                          )}
                          <div>
                            <p className="font-medium text-slate-800">
                              {transaction.description ?? transaction.type}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(transaction.posted_at ?? transaction.created_at)}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-semibold ${
                            positive ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {formatCurrency(amount, transaction.currency)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

