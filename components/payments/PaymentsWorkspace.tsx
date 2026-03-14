"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  TriangleAlert,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type AccountOption = {
  id: string;
  account_name: string;
  account_number: string;
  status: "active" | "frozen" | "closed";
  currency: string;
  available_balance: number;
};

type TransferListItem = {
  id: string;
  rail: "ach" | "internal";
  source_account_id: string | null;
  destination_account_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "settled" | "returned" | "failed";
  memo: string | null;
  created_by: string | null;
  provider: string;
  provider_status: string | null;
  failure_reason: string | null;
  return_reason: string | null;
  destination_external_name: string | null;
  destination_external_account_mask: string | null;
  created_at: string;
  updated_at: string;
};

type TransferDetail = TransferListItem & {
  provider_transfer_id: string | null;
  destination_external_routing: string | null;
  metadata: Record<string, unknown>;
  ledger_applied_at: string | null;
  reversal_applied_at: string | null;
};

type TransferEvent = {
  id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string | null;
  source: string;
  provider_event_id: string | null;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type PaymentsWorkspaceProps = {
  initialAccounts: AccountOption[];
  initialTransfers: TransferListItem[];
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

function statusTone(status: TransferListItem["status"]) {
  if (status === "settled") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "processing") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "returned") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function railLabel(rail: "ach" | "internal") {
  return rail === "ach" ? "ACH" : "Internal";
}

export function PaymentsWorkspace({
  initialAccounts,
  initialTransfers,
  role
}: PaymentsWorkspaceProps) {
  const [mode, setMode] = useState<"ach" | "internal">("ach");
  const [accounts, setAccounts] = useState<AccountOption[]>(initialAccounts);
  const [transfers, setTransfers] = useState<TransferListItem[]>(initialTransfers);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    initialTransfers[0]?.id ?? null
  );
  const [selectedTransfer, setSelectedTransfer] = useState<TransferDetail | null>(null);
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState(initialAccounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const counts = useMemo(() => {
    return transfers.reduce(
      (acc, transfer) => {
        acc.total += 1;
        acc[transfer.status] += 1;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        processing: 0,
        settled: 0,
        returned: 0,
        failed: 0
      }
    );
  }, [transfers]);

  const availableDestinationAccounts = useMemo(
    () => accounts.filter((account) => account.id !== sourceAccountId),
    [accounts, sourceAccountId]
  );

  async function refreshTransfers() {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/payments", { cache: "no-store" });
      const data = (await response.json()) as {
        transfers?: TransferListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to refresh transfers.");
      }

      const next = data.transfers ?? [];
      setTransfers(next);

      if (selectedTransferId && !next.some((item) => item.id === selectedTransferId)) {
        setSelectedTransferId(next[0]?.id ?? null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh transfers.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadTransferDetails(transferId: string) {
    setIsLoadingDetails(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/payments/${transferId}`, { cache: "no-store" });
      const data = (await response.json()) as {
        transfer?: TransferDetail;
        events?: TransferEvent[];
        error?: string;
      };

      if (!response.ok || !data.transfer) {
        throw new Error(data.error ?? "Unable to load transfer details.");
      }

      setSelectedTransfer(data.transfer);
      setEvents(data.events ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load transfer details.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  useEffect(() => {
    if (selectedTransferId) {
      void loadTransferDetails(selectedTransferId);
    } else {
      setSelectedTransfer(null);
      setEvents([]);
    }
  }, [selectedTransferId]);

  async function submitTransfer() {
    if (!sourceAccountId) {
      setMessage("Select a source account first.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const idempotencyKey =
        typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto
          ? window.crypto.randomUUID()
          : `pay-${Date.now().toString(36)}`;

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify({
          rail: mode,
          sourceAccountId,
          destinationAccountId: mode === "internal" ? destinationAccountId : undefined,
          amount: Number(amount),
          currency: "USD",
          memo: memo.trim() || null,
          counterpartyName: mode === "ach" ? counterpartyName : undefined,
          routingNumber: mode === "ach" ? routingNumber : undefined,
          accountNumber: mode === "ach" ? accountNumber : undefined
        })
      });

      const data = (await response.json()) as {
        transfer?: TransferListItem;
        replayed?: boolean;
        error?: string;
      };

      if (!response.ok || !data.transfer) {
        throw new Error(data.error ?? "Unable to create transfer.");
      }

      await refreshTransfers();
      setSelectedTransferId(data.transfer.id);
      setAmount("");
      setMemo("");
      setDestinationAccountId("");
      setCounterpartyName("");
      setRoutingNumber("");
      setAccountNumber("");
      setMessage(
        data.replayed
          ? "Duplicate submission detected. Reused the previous transfer result."
          : mode === "ach"
            ? "ACH transfer created. Track status in the history panel."
            : "Internal transfer created and settled."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create transfer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reconcile(nextStatus: "processing" | "settled" | "returned" | "failed") {
    if (!selectedTransferId) {
      setMessage("Select a transfer first.");
      return;
    }

    const reason =
      nextStatus === "returned" || nextStatus === "failed"
        ? window.prompt(
            nextStatus === "returned"
              ? "Optional return reason"
              : "Optional failure reason"
          )
        : null;

    setIsReconciling(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/payments/${selectedTransferId}/reconcile`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nextStatus,
          reason,
          payload: {
            initiatedFrom: "payments_workspace"
          }
        })
      });

      const data = (await response.json()) as {
        transfer?: TransferListItem;
        replayed?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to reconcile transfer.");
      }

      await Promise.all([refreshTransfers(), loadTransferDetails(selectedTransferId)]);
      setMessage(
        data.replayed
          ? "Transfer status update was already applied."
          : `Transfer moved to ${nextStatus}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reconcile transfer.");
    } finally {
      setIsReconciling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-50 p-2 text-blue-600">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Transfers</p>
              <p className="text-lg font-semibold text-slate-900">{counts.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-amber-50 p-2 text-amber-600">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Pending / Processing</p>
              <p className="text-lg font-semibold text-slate-900">
                {counts.pending + counts.processing}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Settled</p>
              <p className="text-lg font-semibold text-slate-900">{counts.settled}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-rose-50 p-2 text-rose-600">
              <TriangleAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Returned / Failed</p>
              <p className="text-lg font-semibold text-slate-900">
                {counts.returned + counts.failed}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Initiate Transfer</CardTitle>
            <CardDescription>
              Create ACH payouts and internal transfers with idempotent submissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("ach")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === "ach" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                ACH
              </button>
              <button
                type="button"
                onClick={() => setMode("internal")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === "internal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Internal
              </button>
            </div>

            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Source account</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={sourceAccountId}
                onChange={(event) => setSourceAccountId(event.target.value)}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ���� {account.account_number.slice(-4)}
                  </option>
                ))}
              </select>
            </label>

            {mode === "internal" ? (
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Destination account</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={destinationAccountId}
                  onChange={(event) => setDestinationAccountId(event.target.value)}
                >
                  <option value="">Select destination</option>
                  {availableDestinationAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ���� {account.account_number.slice(-4)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 sm:col-span-2">
                  <span className="mb-1 block font-medium">Counterparty name</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={counterpartyName}
                    onChange={(event) => setCounterpartyName(event.target.value)}
                    placeholder="Acme Treasury"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Routing number</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={routingNumber}
                    onChange={(event) => setRoutingNumber(event.target.value)}
                    placeholder="021000021"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Account number</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    placeholder="1234567890"
                  />
                </label>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="250.00"
                />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Memo</span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="Invoice settlement"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Submission model</p>
              <p className="mt-1">
                Each submission sends an idempotency key. Duplicate button presses reuse the existing transfer record instead of creating a second payment.
              </p>
            </div>

            <Button className="w-full" onClick={() => void submitTransfer()} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {mode === "ach" ? "Create ACH Transfer" : "Create Internal Transfer"}
            </Button>

            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Status tracking across ACH payouts and internal transfers.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshTransfers()}
                disabled={isRefreshing}
              >
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {transfers.length === 0 ? (
                <p className="text-sm text-slate-500">No transfers have been created yet.</p>
              ) : (
                transfers.map((transfer) => {
                  const source = transfer.source_account_id
                    ? accountMap.get(transfer.source_account_id)
                    : null;
                  const destination = transfer.destination_account_id
                    ? accountMap.get(transfer.destination_account_id)
                    : null;

                  return (
                    <button
                      key={transfer.id}
                      type="button"
                      onClick={() => setSelectedTransferId(transfer.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedTransferId === transfer.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {railLabel(transfer.rail)} transfer
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {source?.account_name ?? "Source account"}
                            {transfer.rail === "internal"
                              ? ` to ${destination?.account_name ?? "destination account"}`
                              : ` to ${transfer.destination_external_name ?? "external account"}`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone(
                            transfer.status
                          )}`}
                        >
                          {transfer.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(transfer.amount, transfer.currency)}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(transfer.created_at)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Transfer Detail</CardTitle>
              <CardDescription>
                Status timeline, reconciliation actions, and operator-safe error details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedTransferId ? (
                <p className="text-sm text-slate-500">Select a transfer from the history list.</p>
              ) : isLoadingDetails ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading transfer detail...
                </div>
              ) : selectedTransfer ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatCurrency(selectedTransfer.amount, selectedTransfer.currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Rail</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {railLabel(selectedTransfer.rail)}
                      </p>
                      <p className="text-xs text-slate-500">Provider: {selectedTransfer.provider}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(
                          selectedTransfer.status
                        )}`}
                      >
                        {selectedTransfer.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Flow</p>
                      <p className="mt-2">
                        From {accountMap.get(selectedTransfer.source_account_id ?? "")?.account_name ?? "source account"}
                      </p>
                      <p>
                        To {selectedTransfer.rail === "internal"
                          ? accountMap.get(selectedTransfer.destination_account_id ?? "")?.account_name ?? "destination account"
                          : `${selectedTransfer.destination_external_name ?? "external account"} ���� ${selectedTransfer.destination_external_account_mask ?? "----"}`}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">Created {formatDate(selectedTransfer.created_at)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Operational details</p>
                      <p className="mt-2">Provider transfer ID: {selectedTransfer.provider_transfer_id ?? "-"}</p>
                      <p>Provider status: {selectedTransfer.provider_status ?? "-"}</p>
                      <p>Ledger posted: {formatDate(selectedTransfer.ledger_applied_at)}</p>
                      <p>Reversal posted: {formatDate(selectedTransfer.reversal_applied_at)}</p>
                    </div>
                  </div>

                  {selectedTransfer.failure_reason || selectedTransfer.return_reason ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-medium">Transfer exception</p>
                      <p className="mt-1">
                        {selectedTransfer.failure_reason ?? selectedTransfer.return_reason}
                      </p>
                    </div>
                  ) : null}

                  {role === "admin" || role === "analyst" ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedTransfer.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void reconcile("processing")}
                          disabled={isReconciling}
                        >
                          Mark Processing
                        </Button>
                      ) : null}
                      {(selectedTransfer.status === "pending" || selectedTransfer.status === "processing") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void reconcile("settled")}
                          disabled={isReconciling}
                        >
                          Mark Settled
                        </Button>
                      ) : null}
                      {(selectedTransfer.status === "processing" || selectedTransfer.status === "settled") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void reconcile("returned")}
                          disabled={isReconciling}
                        >
                          Mark Returned
                        </Button>
                      ) : null}
                      {(selectedTransfer.status === "pending" || selectedTransfer.status === "processing") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void reconcile("failed")}
                          disabled={isReconciling}
                        >
                          Mark Failed
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Event timeline
                    </p>
                    {events.length === 0 ? (
                      <p className="text-sm text-slate-500">No reconciliation events recorded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {events.map((event) => (
                          <li
                            key={event.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{event.event_type}</p>
                                <p className="text-xs text-slate-500">
                                  {event.previous_status ?? "-"} ? {event.next_status ?? "-"}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500">{formatDate(event.created_at)}</p>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Source: {event.source}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Transfer detail unavailable.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
