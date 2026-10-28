"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiErrorMessage, apiStatus } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/api";
import {
  expensesApi,
  PaymentQrDetails,
  Settlement,
  SettlementDashboardItem,
} from "@/lib/api/expenses";
import { TripDetails, TripMember, tripsApi, tripRoutes } from "@/lib/api/trips";
import SettlementCard from "@/app/components/settlements/SettlementCard";
import SettlementFormModal from "@/app/components/settlements/SettlementFormModal";
import PaymentInfoModal from "@/app/components/settlements/PaymentInfoModal";

const panel =
  "rounded-[22px] border border-white/[0.08] bg-[#121d1b] p-6 sm:p-8";
const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

type Filter = "" | "Pending" | "Completed" | "Cancelled";

export default function SettlementOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [userId, setUserId] = useState("");
  const [dashboard, setDashboard] = useState<SettlementDashboardItem[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [filter, setFilter] = useState<Filter>("");
  const [activeTab, setActiveTab] = useState<"You Pay" | "You Receive">("You Pay");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [prefilledData, setPrefilledData] = useState<{
    settlementId?: string;
    paidByUserId: string;
    receivedByUserId: string;
    amount: number;
    notes?: string;
  } | null>(null);
  const [formError, setFormError] = useState("");

  // UPI payment details are fetched from the authorized API for the selected balance pair.
  const [paymentInfo, setPaymentInfo] = useState<{
    recipientId: string;
    details: PaymentQrDetails | null;
    loading: boolean;
    error: string;
  } | null>(null);
  const paymentInfoRequest = useRef(0);
  const settlementRequestIds = useRef(new Map<string, string>());

  const validTripId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tripId,
    );

  const activeMembers = useMemo(
    () => members.filter((m) => m.status.toLowerCase() === "active"),
    [members],
  );

  const currency = trip?.currencyCode ?? "INR";

  const refreshData = useCallback(async () => {
    setError("");
    try {
      const [dashboardResult, historyResult] = await Promise.all([
        expensesApi.settlementDashboard(tripId),
        expensesApi.settlementHistory(tripId, filter),
      ]);
      setDashboard(dashboardResult);
      setHistory(historyResult);
    } catch (cause) {
      if (apiStatus(cause) === 401) {
        router.replace(
          `/auth?mode=login&returnUrl=${encodeURIComponent(
            tripRoutes.settlements(tripId),
          )}`,
        );
        return;
      }
      setError(
        apiErrorMessage(cause, "Settlement information could not be refreshed."),
      );
    }
  }, [tripId, filter, router]);

  useEffect(() => {
    if (!validTripId) return;
    let isSubscribed = true;

    Promise.all([
      tripsApi.getById(tripId),
      tripsApi.getMembers(tripId),
      getCurrentUser(),
      expensesApi.settlementDashboard(tripId),
      expensesApi.settlementHistory(tripId, filter),
    ])
      .then(([details, memberList, profile, balances, records]) => {
        if (!isSubscribed) return;
        setTrip(details);
        setMembers(memberList);
        setUserId(profile.userId);
        setDashboard(balances);
        setHistory(records);
        setError("");
      })
      .catch((cause) => {
        if (!isSubscribed) return;
        if (apiStatus(cause) === 401) {
          router.replace(
            `/auth?mode=login&returnUrl=${encodeURIComponent(
              tripRoutes.settlements(tripId),
            )}`,
          );
          return;
        }
        setError(
          apiErrorMessage(cause, "Settlement information could not be loaded."),
        );
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [tripId, validTripId, filter, router]);

  // Open Create Form (manual)
  function handleOpenCreate() {
    settlementRequestIds.current.clear();
    setEditingSettlement(null);
    setPrefilledData({
      paidByUserId: userId,
      receivedByUserId: "",
      amount: 0,
    });
    setFormError("");
    setFormOpen(true);
  }

  // Open Create Form pre-filled from You Pay card
  function handlePayCard(receiverId: string, remainingAmount: number) {
    settlementRequestIds.current.clear();
    setEditingSettlement(null);
    setPrefilledData({
      paidByUserId: userId,
      receivedByUserId: receiverId,
      amount: Math.round(remainingAmount),
    });
    setFormError("");
    setFormOpen(true);
  }

  async function handleShowPaymentInfo(recipientId: string) {
    const requestId = ++paymentInfoRequest.current;
    setPaymentInfo({ recipientId, details: null, loading: true, error: "" });
    try {
      const details = await expensesApi.paymentQrDetails(tripId, recipientId);
      if (requestId === paymentInfoRequest.current) {
        setPaymentInfo({ recipientId, details, loading: false, error: "" });
      }
    } catch (cause) {
      if (requestId === paymentInfoRequest.current) {
        setPaymentInfo({
          recipientId,
          details: null,
          loading: false,
          error: apiErrorMessage(cause, "Recipient payment details could not be loaded."),
        });
      }
    }
  }

  function closePaymentInfo() {
    paymentInfoRequest.current += 1;
    setPaymentInfo(null);
  }

  // Open Edit Form
  function handleOpenEdit(settlement: Settlement) {
    settlementRequestIds.current.clear();
    setEditingSettlement(settlement);
    setPrefilledData({
      settlementId: settlement.settlementId,
      paidByUserId: settlement.paidByUserId,
      receivedByUserId: settlement.receivedByUserId,
      amount: Math.round(settlement.amount),
      notes: settlement.notes || "",
    });
    setFormError("");
    setFormOpen(true);
  }

  // Submit Create or Edit Form
  async function handleFormSubmit(payload: {
    paidByUserId: string;
    receivedByUserId: string;
    amount: number;
    notes?: string;
  }) {
    setBusy(true);
    setFormError("");
    setNotice("");
    const sanitizedAmount = Math.round(payload.amount);
    try {
      if (editingSettlement) {
        await expensesApi.editSettlement(
          tripId,
          editingSettlement.settlementId,
          { ...payload, amount: sanitizedAmount },
        );
        setNotice("Pending repayment updated successfully.");
      } else {
        const requestSignature = `${payload.paidByUserId}:${payload.receivedByUserId}:${sanitizedAmount}`;
        let settlementId = settlementRequestIds.current.get(requestSignature);
        if (!settlementId) {
          settlementId = crypto.randomUUID();
          settlementRequestIds.current.set(requestSignature, settlementId);
        }
        await expensesApi.createSettlement(tripId, {
          ...payload,
          amount: sanitizedAmount,
          settlementId,
        });
        setNotice(
          "Repayment recorded as Pending. The recipient must confirm receipt once transfer is completed.",
        );
      }
      setFormOpen(false);
      await refreshData();
    } catch (cause) {
      setFormError(
        apiErrorMessage(cause, "The repayment could not be saved."),
      );
    } finally {
      setBusy(false);
    }
  }

  // Update Status (Complete or Cancel)
  async function handleStatusChange(
    settlement: Settlement,
    newStatus: "Completed" | "Cancelled",
  ) {
    if (busy) return;
    if (
      newStatus === "Completed" &&
      !window.confirm(
        `Confirm that you have received ${money(
          settlement.amount,
          currency,
        )} from ${settlement.paidByName}?`,
      )
    ) {
      return;
    }
    if (
      newStatus === "Cancelled" &&
      !window.confirm(
        `Cancel this pending repayment of ${money(
          settlement.amount,
          currency,
        )}?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await expensesApi.updateSettlement(
        tripId,
        settlement.settlementId,
        newStatus,
      );
      setNotice(
        newStatus === "Completed"
          ? "Repayment confirmed as Completed. Balances have been updated."
          : "Repayment has been Cancelled.",
      );
      await refreshData();
    } catch (cause) {
      setError(
        apiErrorMessage(cause, "Repayment status could not be updated."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!validTripId) {
    return (
      <main className="min-h-screen bg-[#0b1212] px-5 py-12 text-[#f0eee6]">
        <div className="mx-auto max-w-4xl">
          <Link href="/home" className="text-xs text-[#91cbb7]">
            ← Back to trips
          </Link>
          <div className={`${panel} mt-6`}>
            <h1 className="font-serif text-2xl">Invalid trip</h1>
            <p className="mt-2 text-sm text-[#f0b4a3]">
              This trip identifier is invalid.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const filteredBalances = dashboard.filter(
    (item) => item.settlementType === activeTab,
  );

  return (
    <main className="min-h-screen bg-[#0b1212] text-[#f0eee6]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0d1716]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/home"
            className="text-sm font-bold uppercase tracking-[0.2em] text-white"
          >
            Paisa<span className="text-[#91cbb7]">Matters</span>
          </Link>
          <Link
            href={tripRoutes.details(tripId)}
            className="text-xs text-white/55 transition hover:text-white"
          >
            ← Back to trip room
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#91cbb7]/15 bg-gradient-to-br from-[#142822] via-[#192725] to-[#111c1a] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-32 size-96 rounded-full bg-[#91cbb7]/[0.07] blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.26em] text-[#91cbb7]">
                {trip?.tripName ?? "TRIP"} · {currency}
              </p>
              <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">
                Settlement Overview
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm">
                Pairwise balances and verified repayment history calculated from trip expenses.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="shrink-0 rounded-full bg-[#91cbb7] px-5 py-3 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0]"
            >
              + Record repayment
            </button>
          </div>
        </section>

        {/* Global Notifications */}
        {notice && (
          <div
            role="status"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[#91cbb7]/25 bg-[#91cbb7]/[0.08] p-4 text-xs text-[#b8dfd0]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[#df947f]/30 bg-[#df947f]/[0.08] p-4 text-xs text-[#f0b4a3]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refreshData()}
              className="underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 1. Balances Section (You Pay / You Receive) ──────────── */}
        <section className={`${panel} mt-7`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl">Your Net Balances</h2>
              <p className="mt-1 text-xs text-white/40">
                Calculated by offsetting your shared expense obligations with completed repayments.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex rounded-full border border-white/10 bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("You Pay")}
                className={`rounded-full px-5 py-2 text-xs font-medium transition ${
                  activeTab === "You Pay"
                    ? "bg-[#91cbb7] text-[#10201b]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                You Pay (Debtor)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("You Receive")}
                className={`rounded-full px-5 py-2 text-xs font-medium transition ${
                  activeTab === "You Receive"
                    ? "bg-[#91cbb7] text-[#10201b]"
                    : "text-white/60 hover:text-white"
                }`}
              >
                You Receive (Creditor)
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-44 animate-pulse rounded-2xl bg-white/[0.04]" />
              <div className="h-44 animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm font-medium text-white/60">
                {activeTab === "You Pay"
                  ? "You have no outstanding debts to pay in this trip."
                  : "No members currently owe you repayments for this trip."}
              </p>
              <p className="mt-1 text-xs text-white/35">
                All pairwise expenses under this tab are balanced or settled.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {filteredBalances.map((item, index) => (
                <SettlementCard
                  key={`${item.debtorId}-${item.creditorId}-${index}`}
                  item={item}
                  currency={currency}
                  onPay={handlePayCard}
                  onShowPaymentInfo={(recipientId) => void handleShowPaymentInfo(recipientId)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── 2. Repayment History Section ────────────────────────── */}
        <section className={`${panel} mt-7`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl">Repayment History</h2>
              <p className="mt-1 text-xs text-white/40">
                Audit trail of transfers recorded between trip members. Only Completed repayments reduce balances.
              </p>
            </div>

            {/* Filter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45">Filter:</span>
              <div className="flex flex-wrap rounded-xl border border-white/10 bg-black/20 p-1 text-xs">
                {(
                  [
                    ["", "All"],
                    ["Pending", "Pending"],
                    ["Completed", "Completed"],
                    ["Cancelled", "Cancelled"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFilter(val)}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      filter === val
                        ? "bg-white/15 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm font-medium text-white/60">
                No repayments match the selected filter.
              </p>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-white/[0.06]">
              {history.map((row) => {
                const isPending = row.status === "Pending";
                const isPayer = row.paidByUserId === userId;
                const isReceiver = row.receivedByUserId === userId;

                return (
                  <li key={row.settlementId} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {row.paidByName}
                          </span>
                          <span className="text-xs text-white/40">paid</span>
                          <span className="text-sm font-medium text-white">
                            {row.receivedByName}
                          </span>
                          <span className="font-mono text-sm font-semibold text-[#b8dfd0]">
                            {money(row.amount, currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-white/40">
                          {new Date(row.settlementDate).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {row.notes ? ` · Note: “${row.notes}”` : ""}
                        </p>
                      </div>

                      {/* Right: Badge */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                            row.status === "Completed"
                              ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                              : row.status === "Cancelled"
                              ? "border-white/10 bg-white/[0.03] text-white/40"
                              : "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>

                    {/* Pending Actions */}
                    {isPending && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-2.5">
                        {isPayer && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleOpenEdit(row)}
                              className="text-xs text-[#91cbb7] underline hover:text-[#b8dfd0] disabled:opacity-40"
                            >
                              Edit details
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleStatusChange(row, "Cancelled")}
                              className="text-xs text-[#df947f] hover:text-[#f0b4a3] disabled:opacity-40"
                            >
                              Cancel repayment
                            </button>
                          </>
                        )}
                        {isReceiver && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleStatusChange(row, "Completed")}
                              className="rounded-full bg-[#91cbb7] px-3 py-1 text-[11px] font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:opacity-40"
                            >
                              Confirm received ✓
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleStatusChange(row, "Cancelled")}
                              className="text-xs text-[#df947f] hover:text-[#f0b4a3] disabled:opacity-40"
                            >
                              Reject / Cancel
                            </button>
                          </>
                        )}
                        {!isPayer && !isReceiver && (
                          <span className="text-[11px] text-white/30">
                            Awaiting confirmation between {row.paidByName} and {row.receivedByName}.
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Disclaimer / Notice */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
          PaisaMatters does not execute bank transfers directly. Settle up using UPI or banking, then record repayments here. Completed settlements automatically reduce outstanding obligations.
        </p>
      </div>

      {/* ── Form Modal (Create / Edit) ────────────────────────────── */}
      {formOpen && (
        <SettlementFormModal
          isOpen={formOpen}
        onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          activeMembers={activeMembers}
          currentUserId={userId}
          initialData={prefilledData}
          currency={currency}
          busy={busy}
          serverError={formError}
        />
      )}

      {/* ── Payment Info Modal ────────────────────────────────────── */}
      {paymentInfo && (
        <PaymentInfoModal
          details={paymentInfo.details}
          loading={paymentInfo.loading}
          error={paymentInfo.error}
          onClose={closePaymentInfo}
          onRetry={() => void handleShowPaymentInfo(paymentInfo.recipientId)}
        />
      )}
    </main>
  );
}
