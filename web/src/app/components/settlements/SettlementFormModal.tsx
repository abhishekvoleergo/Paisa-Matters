"use client";

import { FormEvent, useState } from "react";
import { TripMember } from "@/lib/api/trips";

type InitialFormData = {
  settlementId?: string;
  paidByUserId: string;
  receivedByUserId: string;
  amount: number;
  notes?: string;
};

type SettlementFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    paidByUserId: string;
    receivedByUserId: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
  activeMembers: TripMember[];
  currentUserId: string;
  initialData: InitialFormData | null;
  currency: string;
  busy: boolean;
  serverError?: string;
  lockReceiver?: boolean;
};

const panel =
  "w-full max-w-lg rounded-[24px] border border-white/[0.08] bg-[#121d1b] p-6 shadow-2xl sm:p-7";
const field =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1514] px-3.5 py-2.5 text-sm text-[#f0eee6] outline-none transition focus:border-[#91cbb7]/60";

export default function SettlementFormModal({
  isOpen,
  onClose,
  onSubmit,
  activeMembers,
  currentUserId,
  initialData,
  currency,
  busy,
  serverError,
  lockReceiver,
}: SettlementFormModalProps) {
  const isEditing = Boolean(initialData?.settlementId);

  const payer = initialData?.paidByUserId ?? currentUserId;
  const [receiver, setReceiver] = useState(initialData?.receivedByUserId ?? "");
  const [amount, setAmount] = useState(
    initialData?.amount ? Math.round(initialData.amount).toString() : "",
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [clientError, setClientError] = useState("");

  if (!isOpen) return null;

  const isReceiverLocked =
    lockReceiver ?? Boolean(initialData?.receivedByUserId);

  const payerMember =
    activeMembers.find((m) => m.userId === payer) ||
    activeMembers.find((m) => m.userId === currentUserId);
  const receiverMember = activeMembers.find((m) => m.userId === receiver);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setClientError("");

    if (!payer) {
      setClientError("Please select the payer.");
      return;
    }
    if (!receiver) {
      setClientError("Please select who received the repayment.");
      return;
    }
    if (payer === receiver) {
      setClientError("The payer and receiver cannot be the same person.");
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !Number.isInteger(numAmount)) {
      setClientError("Amount must be a whole number greater than zero (e.g. 90, not 90.5).");
      return;
    }
    if (numAmount > 99999999999999999) {
      setClientError("Amount is too large.");
      return;
    }

    await onSubmit({
      paidByUserId: payer,
      receivedByUserId: receiver,
      amount: numAmount,
      notes: notes.trim() || undefined,
    });
  }

  const errorMessage = clientError || serverError;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className={panel}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#91cbb7]">
              {isEditing ? "EDIT PENDING RECORD" : "NEW REPAYMENT"}
            </p>
            <h3 className="mt-1 font-serif text-2xl text-[#f0eee6]">
              {isEditing ? "Edit pending repayment" : "Record a repayment"}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-white/45">
          {isEditing
            ? "Modify pending repayment details before it is confirmed."
            : "Record a repayment made to a member. The recipient must confirm receipt for it to be marked Completed."}
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3.5 py-2.5 text-xs text-[#f0b4a3]"
          >
            {errorMessage}
          </p>
        )}

        {/* Form Inputs */}
        <div className="mt-5 space-y-4">
          {/* Payer (Always current user) */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              Payer (Paid by)
            </label>
            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-[#0c1514] px-3.5 py-2.5 text-sm text-[#f0eee6]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-[#91cbb7]/15 font-serif text-xs text-[#91cbb7]">
                  {payerMember?.fullName?.trim().charAt(0).toUpperCase() || "Y"}
                </span>
                <span className="font-medium text-white">
                  {payerMember?.fullName || "You"} {payer === currentUserId ? "(You)" : ""}
                </span>
              </div>
              <span className="text-[10px] text-white/35">Payer</span>
            </div>
            <p className="mt-1 text-[10px] text-white/35">
              Only the person who made the payment can record or edit it.
            </p>
          </div>

          {/* Receiver (Paid to) */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              Receiver (Paid to)
            </label>
            {isReceiverLocked && receiverMember ? (
              <div className="mt-1.5 flex items-center justify-between rounded-xl border border-white/10 bg-[#0c1514] px-3.5 py-2.5 text-sm text-[#f0eee6]">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-6 place-items-center rounded-full bg-[#91cbb7]/15 font-serif text-xs text-[#91cbb7]">
                    {receiverMember.fullName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-white">{receiverMember.fullName}</span>
                </div>
                <span className="rounded-full border border-[#91cbb7]/20 bg-[#91cbb7]/[0.08] px-2.5 py-0.5 text-[10px] text-[#b8dfd0]">
                  Recipient
                </span>
              </div>
            ) : (
              <select
                required
                disabled={busy}
                className={field}
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
              >
                <option value="">Select who received money</option>
                {activeMembers
                  .filter((m) => m.userId !== payer)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              Amount ({currency})
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
                ₹
              </span>
              <input
                required
                type="number"
                min="1"
                step="1"
                disabled={busy}
                placeholder="0"
                className={`${field} pl-8`}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              Notes (optional)
            </label>
            <input
              type="text"
              maxLength={500}
              disabled={busy}
              placeholder="e.g. UPI transfer ref or note"
              className={field}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/65 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !payer || !receiver || !amount}
            className="rounded-full bg-[#91cbb7] px-5 py-2.5 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : isEditing
              ? "Update repayment"
              : "Record pending repayment"}
          </button>
        </div>
      </form>
    </div>
  );
}
