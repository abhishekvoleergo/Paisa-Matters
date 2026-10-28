"use client";

import { SettlementDashboardItem } from "@/lib/api/expenses";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

type SettlementCardProps = {
  item: SettlementDashboardItem;
  currency: string;
  onPay?: (receiverId: string, remainingAmount: number) => void;
  onShowPaymentInfo?: (receiverId: string) => void;
};

export default function SettlementCard({
  item,
  currency,
  onPay,
  onShowPaymentInfo,
}: SettlementCardProps) {
  const isPayer = item.settlementType === "You Pay";
  const otherPersonName = isPayer ? item.creditorName : item.debtorName;
  const progressClamped = Math.max(0, Math.min(100, item.progressPercent || 0));
  const isFullySettled = item.remainingAmount <= 0;

  return (
    <li className="rounded-2xl border border-white/[0.08] bg-[#121d1b] p-5 shadow-sm transition hover:border-white/[0.12]">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#91cbb7]">
            {isPayer ? "Payment to" : "Receivable from"}
          </span>
          <h3 className="mt-1 font-serif text-lg font-medium text-[#f0eee6]">
            {otherPersonName}
          </h3>
          <p className="mt-0.5 text-[11px] text-white/40">
            {isPayer ? "You owe this member" : "This member owes you"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-white/35">
            Remaining
          </span>
          <p
            className={`font-serif text-lg font-semibold ${
              isFullySettled ? "text-white/40" : isPayer ? "text-[#df947f]" : "text-[#91cbb7]"
            }`}
          >
            {money(item.remainingAmount, currency)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-white/45">
          <span>Settlement Progress</span>
          <span className="font-mono font-medium text-white/70">
            {progressClamped.toFixed(0)}%
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFullySettled ? "bg-emerald-400" : isPayer ? "bg-[#df947f]" : "bg-[#91cbb7]"
            }`}
            style={{ width: `${progressClamped}%` }}
          />
        </div>
      </div>

      {/* Breakdown Grid */}
      <dl className="mt-5 grid grid-cols-2 gap-2.5 rounded-xl border border-white/[0.05] bg-black/20 p-3 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-white/35">Original Net</dt>
          <dd className="mt-0.5 font-medium text-white/80">
            {money(item.originalAmount, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Confirmed Paid</dt>
          <dd className="mt-0.5 font-medium text-emerald-300/80">
            {money(item.completedAmount, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Awaiting Conf.</dt>
          <dd className="mt-0.5 font-medium text-amber-300/80">
            {money(item.pendingAmount, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Remaining</dt>
          <dd
            className={`mt-0.5 font-semibold ${
              isFullySettled ? "text-white/40" : isPayer ? "text-[#df947f]" : "text-[#91cbb7]"
            }`}
          >
            {money(item.remainingAmount, currency)}
          </dd>
        </div>
      </dl>

      {/* Card Actions */}
      {isPayer && !isFullySettled && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
          {onShowPaymentInfo && (
            <button
              type="button"
              onClick={() => onShowPaymentInfo(item.creditorId)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-[#91cbb7]/40 hover:text-white"
            >
              Pay with UPI QR
            </button>
          )}
          {onPay && (
            <button
              type="button"
              onClick={() => onPay(item.creditorId, Math.round(item.remainingAmount))}
              className="rounded-full bg-[#91cbb7] px-4 py-1.5 text-[11px] font-semibold text-[#10201b] transition hover:bg-[#b8dfd0]"
            >
              Record payment
            </button>
          )}
        </div>
      )}

      {!isPayer && isFullySettled && (
        <p className="mt-3 text-right text-[11px] text-emerald-300/60">
          ✓ All dues from {otherPersonName} are settled.
        </p>
      )}

      {!isPayer && !isFullySettled && item.pendingAmount > 0 && (
        <p className="mt-3 text-right text-[11px] text-amber-300/70">
          ⏳ {money(item.pendingAmount, currency)} is pending your confirmation in history below.
        </p>
      )}
    </li>
  );
}

