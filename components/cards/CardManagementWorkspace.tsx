"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  Flame,
  Loader2,
  Lock,
  LockOpen,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2
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
  currency: string;
  status: "active" | "frozen" | "closed";
  available_balance: number;
};

type CardListItem = {
  id: string;
  account_id: string;
  last4: string;
  status: "inactive" | "active" | "frozen" | "terminated";
  spending_limit_cents: number | null;
  provider_card_id: string | null;
  form_factor: "virtual" | "physical";
  nickname: string | null;
  cardholder_name: string | null;
  network: string;
  spending_controls: Record<string, unknown>;
  issued_at: string;
  activated_at: string | null;
  frozen_at: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
  bank_accounts?: {
    id: string;
    account_name: string;
    account_number: string;
    currency: string;
    status: string;
  } | null;
};

type CardDetail = CardListItem;

type CardLifecycleEvent = {
  id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string | null;
  source: string;
  details: Record<string, unknown>;
  created_at: string;
};

type CardFeedItem = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  merchant_name: string | null;
  merchant_category_code: string | null;
  network_reference: string | null;
  metadata: Record<string, unknown>;
  authorized_at: string | null;
  posted_at: string | null;
  created_at: string;
};

type CardManagementWorkspaceProps = {
  initialAccounts: AccountOption[];
  initialCards: CardListItem[];
  role: "customer" | "analyst" | "admin" | "developer";
};

function formatCurrencyFromCents(amountCents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format((amountCents ?? 0) / 100);
}

function formatMoney(amount: number, currency = "USD") {
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

function statusTone(status: CardListItem["status"]) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "inactive") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "frozen") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function controlsFromRecord(record: Record<string, unknown>) {
  return {
    spendingLimitCents:
      typeof record.spendingLimitCents === "number" ? record.spendingLimitCents : null,
    allowedMccs: Array.isArray(record.allowedMccs) ? (record.allowedMccs as string[]) : [],
    blockedMccs: Array.isArray(record.blockedMccs) ? (record.blockedMccs as string[]) : [],
    ecommerceEnabled:
      typeof record.ecommerceEnabled === "boolean" ? record.ecommerceEnabled : true,
    atmEnabled: typeof record.atmEnabled === "boolean" ? record.atmEnabled : false
  };
}

export function CardManagementWorkspace({
  initialAccounts,
  initialCards,
  role
}: CardManagementWorkspaceProps) {
  const [accounts] = useState(initialAccounts);
  const [cards, setCards] = useState(initialCards);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialCards[0]?.id ?? null);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [events, setEvents] = useState<CardLifecycleEvent[]>([]);
  const [feed, setFeed] = useState<CardFeedItem[]>([]);
  const [issueAccountId, setIssueAccountId] = useState(initialAccounts[0]?.id ?? "");
  const [nickname, setNickname] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [limitDollars, setLimitDollars] = useState("");
  const [allowedMccs, setAllowedMccs] = useState("");
  const [blockedMccs, setBlockedMccs] = useState("");
  const [ecommerceEnabled, setEcommerceEnabled] = useState(true);
  const [atmEnabled, setAtmEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const stats = useMemo(
    () =>
      cards.reduce(
        (acc, card) => {
          acc.total += 1;
          acc[card.status] += 1;
          return acc;
        },
        { total: 0, inactive: 0, active: 0, frozen: 0, terminated: 0 }
      ),
    [cards]
  );

  async function refreshCards() {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/cards", { cache: "no-store" });
      const data = (await response.json()) as { cards?: CardListItem[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to refresh cards.");
      }

      const next = data.cards ?? [];
      setCards(next);
      if (selectedCardId && !next.some((item) => item.id === selectedCardId)) {
        setSelectedCardId(next[0]?.id ?? null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh cards.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadCardDetail(cardId: string) {
    setIsLoadingDetail(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/cards/${cardId}`, { cache: "no-store" });
      const data = (await response.json()) as {
        card?: CardDetail;
        lifecycleEvents?: CardLifecycleEvent[];
        transactionFeed?: CardFeedItem[];
        error?: string;
      };

      if (!response.ok || !data.card) {
        throw new Error(data.error ?? "Unable to load card detail.");
      }

      setDetail(data.card);
      setEvents(data.lifecycleEvents ?? []);
      setFeed(data.transactionFeed ?? []);

      const controls = controlsFromRecord(data.card.spending_controls ?? {});
      setLimitDollars(
        controls.spendingLimitCents === null || controls.spendingLimitCents === undefined
          ? ""
          : (controls.spendingLimitCents / 100).toFixed(2)
      );
      setAllowedMccs(controls.allowedMccs.join(", "));
      setBlockedMccs(controls.blockedMccs.join(", "));
      setEcommerceEnabled(controls.ecommerceEnabled);
      setAtmEnabled(controls.atmEnabled);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load card detail.");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (selectedCardId) {
      void loadCardDetail(selectedCardId);
    } else {
      setDetail(null);
      setEvents([]);
      setFeed([]);
    }
  }, [selectedCardId]);

  async function issueCard() {
    if (!issueAccountId) {
      setMessage("Select an account first.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const idempotencyKey =
        typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto
          ? window.crypto.randomUUID()
          : `card-${Date.now().toString(36)}`;

      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify({
          accountId: issueAccountId,
          nickname: nickname.trim() || null,
          cardholderName: cardholderName.trim() || null,
          spendingLimitCents: limitDollars.trim() ? Math.round(Number(limitDollars) * 100) : null,
          allowedMccs: allowedMccs
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          blockedMccs: blockedMccs
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          ecommerceEnabled,
          atmEnabled
        })
      });

      const data = (await response.json()) as { card?: CardListItem; replayed?: boolean; error?: string };
      if (!response.ok || !data.card) {
        throw new Error(data.error ?? "Unable to issue card.");
      }

      await refreshCards();
      setSelectedCardId(data.card.id);
      setNickname("");
      setCardholderName("");
      setLimitDollars("");
      setAllowedMccs("");
      setBlockedMccs("");
      setEcommerceEnabled(true);
      setAtmEnabled(false);
      setMessage(
        data.replayed
          ? "Reused the existing card issuance result for this submission."
          : "Virtual debit card issued. Activate it before spend is allowed."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to issue card.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeStatus(action: "activate" | "freeze" | "unfreeze" | "terminate") {
    if (!selectedCardId) return;

    const confirmText =
      action === "terminate"
        ? "Terminate this card? This cannot be undone."
        : `${action[0].toUpperCase()}${action.slice(1)} this card?`;

    if (!window.confirm(confirmText)) {
      return;
    }

    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/cards/${selectedCardId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? `Unable to ${action} card.`);
      }

      await Promise.all([refreshCards(), loadCardDetail(selectedCardId)]);
      setMessage(`Card ${action} action completed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${action} card.`);
    } finally {
      setIsMutating(false);
    }
  }

  async function saveControls() {
    if (!selectedCardId) return;

    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/cards/${selectedCardId}/controls`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spendingLimitCents: limitDollars.trim() ? Math.round(Number(limitDollars) * 100) : null,
          allowedMccs: allowedMccs
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          blockedMccs: blockedMccs
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          ecommerceEnabled,
          atmEnabled
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update controls.");
      }

      await Promise.all([refreshCards(), loadCardDetail(selectedCardId)]);
      setMessage("Card controls updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update controls.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-50 p-2 text-blue-600"><CreditCard className="h-4 w-4" /></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Cards</p><p className="text-lg font-semibold text-slate-900">{stats.total}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-600"><BadgeCheck className="h-4 w-4" /></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Active</p><p className="text-lg font-semibold text-slate-900">{stats.active}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-amber-50 p-2 text-amber-600"><Lock className="h-4 w-4" /></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Inactive / Frozen</p><p className="text-lg font-semibold text-slate-900">{stats.inactive + stats.frozen}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-slate-100 p-2 text-slate-700"><Trash2 className="h-4 w-4" /></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Terminated</p><p className="text-lg font-semibold text-slate-900">{stats.terminated}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Issue Virtual Card</CardTitle>
              <CardDescription>
                Physical card support is prepared as an extension point, but this module issues virtual debit cards only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Funding account</span>
                <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={issueAccountId} onChange={(event) => setIssueAccountId(event.target.value)}>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} ���� {account.account_number.slice(-4)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Card nickname</span>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Travel Ops" />
                </label>
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Cardholder name</span>
                  <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} placeholder="Jordan Rivera" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1 block font-medium">Spend limit (USD)</span>
                  <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={limitDollars} onChange={(event) => setLimitDollars(event.target.value)} placeholder="1500.00" />
                </label>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">Network</p>
                  <p className="mt-1">Mock adapter issues Visa virtual debit cards and keeps a physical-card form factor hook in the same API boundary.</p>
                </div>
              </div>

              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Allow MCCs</span>
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={allowedMccs} onChange={(event) => setAllowedMccs(event.target.value)} placeholder="4511, 5812" />
              </label>
              <label className="block text-sm text-slate-700">
                <span className="mb-1 block font-medium">Block MCCs</span>
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={blockedMccs} onChange={(event) => setBlockedMccs(event.target.value)} placeholder="4829, 7995" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={ecommerceEnabled} onChange={(event) => setEcommerceEnabled(event.target.checked)} />
                  E-commerce enabled
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={atmEnabled} onChange={(event) => setAtmEnabled(event.target.checked)} />
                  ATM enabled
                </label>
              </div>

              <Button className="w-full" onClick={() => void issueCard()} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Issue Virtual Card
              </Button>
              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Issued Cards</CardTitle>
                <CardDescription>Card state across active, frozen, and terminated programs.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void refreshCards()} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {cards.length === 0 ? (
                <p className="text-sm text-slate-500">No cards issued yet.</p>
              ) : (
                cards.map((card) => (
                  <button key={card.id} type="button" onClick={() => setSelectedCardId(card.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedCardId === card.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{card.nickname || card.cardholder_name || "Virtual debit"}</p>
                        <p className="mt-1 text-xs text-slate-500">{card.bank_accounts?.account_name ?? accountMap.get(card.account_id)?.account_name ?? "Account"} ���� {card.last4}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone(card.status)}`}>{card.status}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border border-slate-200 bg-white">
            <CardHeader>
              <CardTitle>Card Management</CardTitle>
              <CardDescription>Lifecycle controls, spending controls, and transaction feed.</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCardId ? (
                <p className="text-sm text-slate-500">Select a card to inspect it.</p>
              ) : isLoadingDetail ? (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading card detail...</div>
              ) : detail ? (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                    <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[linear-gradient(135deg,#0f172a_0%,#111827_35%,#1d4ed8_100%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
                      <div className="absolute -right-10 top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute bottom-0 left-0 h-32 w-48 bg-[radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.22),transparent_70%)]" />
                      <div className="relative flex items-start justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-100/80">FinStack Treasury</p>
                          <p className="mt-4 text-xl font-semibold tracking-tight">{detail.nickname || "Virtual Debit"}</p>
                        </div>
                        <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-50">{detail.network}</div>
                      </div>
                      <div className="relative mt-14">
                        <div className="mb-5 flex h-11 w-16 items-center rounded-xl bg-gradient-to-br from-[#f8e6a0] to-[#b99a41] px-2 shadow-lg">
                          <div className="h-7 w-7 rounded-md border border-black/10 bg-[#d7b95d]/90" />
                        </div>
                        <p className="font-mono text-2xl tracking-[0.35em] text-white/95">���� ���� ���� {detail.last4}</p>
                        <div className="mt-6 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Cardholder</p>
                            <p className="mt-1 text-sm font-medium text-white">{detail.cardholder_name || "FinStack User"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-blue-100/70">Status</p>
                            <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(detail.status)}`}>{detail.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Funding account</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{detail.bank_accounts?.account_name ?? accountMap.get(detail.account_id)?.account_name ?? "Account"}</p>
                          <p className="text-xs text-slate-500">���� {detail.bank_accounts?.account_number?.slice(-4) ?? accountMap.get(detail.account_id)?.account_number?.slice(-4) ?? "----"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Spend limit</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrencyFromCents(detail.spending_limit_cents, detail.bank_accounts?.currency ?? "USD")}</p>
                          <p className="text-xs text-slate-500">Form factor: {detail.form_factor}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {detail.status === "inactive" ? <Button variant="outline" size="sm" onClick={() => void changeStatus("activate")} disabled={isMutating}><BadgeCheck className="h-4 w-4" />Activate</Button> : null}
                        {detail.status === "active" ? <Button variant="outline" size="sm" onClick={() => void changeStatus("freeze")} disabled={isMutating}><Lock className="h-4 w-4" />Freeze</Button> : null}
                        {detail.status === "frozen" ? <Button variant="outline" size="sm" onClick={() => void changeStatus("unfreeze")} disabled={isMutating}><LockOpen className="h-4 w-4" />Unfreeze</Button> : null}
                        {detail.status !== "terminated" ? <Button variant="destructive" size="sm" onClick={() => void changeStatus("terminate")} disabled={isMutating}><Trash2 className="h-4 w-4" />Terminate</Button> : null}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-900"><Shield className="h-4 w-4 text-blue-600" /><p className="text-sm font-semibold">Spending controls</p></div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm text-slate-700">
                            <span className="mb-1 block font-medium">Spend limit (USD)</span>
                            <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={limitDollars} onChange={(event) => setLimitDollars(event.target.value)} />
                          </label>
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                            Pushes the same control payload through the internal adapter boundary used for future Synctera controls.
                          </div>
                          <label className="block text-sm text-slate-700 sm:col-span-2">
                            <span className="mb-1 block font-medium">Allow MCCs</span>
                            <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={allowedMccs} onChange={(event) => setAllowedMccs(event.target.value)} placeholder="4511, 5812" />
                          </label>
                          <label className="block text-sm text-slate-700 sm:col-span-2">
                            <span className="mb-1 block font-medium">Block MCCs</span>
                            <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={blockedMccs} onChange={(event) => setBlockedMccs(event.target.value)} placeholder="4829, 7995" />
                          </label>
                          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={ecommerceEnabled} onChange={(event) => setEcommerceEnabled(event.target.checked)} />E-commerce enabled</label>
                          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={atmEnabled} onChange={(event) => setAtmEnabled(event.target.checked)} />ATM enabled</label>
                        </div>
                        <Button className="mt-4" onClick={() => void saveControls()} disabled={isMutating || detail.status === "terminated"}><Flame className="h-4 w-4" />Save Controls</Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Lifecycle timeline</p>
                      {events.length === 0 ? <p className="text-sm text-slate-500">No lifecycle events recorded yet.</p> : <ul className="space-y-2">{events.map((event) => <li key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{event.event_type}</p><p className="text-xs text-slate-500">{event.previous_status ?? "-"} ? {event.next_status ?? "-"}</p></div><p className="text-xs text-slate-500">{formatDate(event.created_at)}</p></div></li>)}</ul>}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Transaction feed</p>
                      {feed.length === 0 ? <p className="text-sm text-slate-500">No card transactions recorded yet.</p> : <ul className="space-y-2">{feed.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">{item.merchant_name ?? "Card event"}</p><p className="text-xs text-slate-500">MCC {item.merchant_category_code ?? "-"} � {item.status}</p></div><p className="text-sm font-semibold text-slate-900">{formatMoney(item.amount, item.currency)}</p></div><p className="mt-2 text-xs text-slate-500">{formatDate(item.posted_at ?? item.authorized_at ?? item.created_at)}</p></li>)}</ul>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Card detail unavailable.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
