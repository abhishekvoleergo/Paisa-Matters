"use client";

type PaymentInfoModalProps = {
  receiverName: string;
  onClose: () => void;
  onProceedToRecord: () => void;
};

export default function PaymentInfoModal({
  receiverName,
  onClose,
  onProceedToRecord,
}: PaymentInfoModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-white/[0.08] bg-[#121d1b] p-6 shadow-2xl sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#91cbb7]">
              DIRECT TRANSFER
            </p>
            <h3 className="mt-1 font-serif text-2xl text-[#f0eee6]">
              Pay {receiverName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Informational Body */}
        <div className="mt-5 space-y-3.5 text-xs text-white/60">
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
            <h4 className="font-medium text-white/80">Manual Payment Notice</h4>
            <p className="mt-1 leading-relaxed text-white/55">
              PaisaMatters does not directly process payments or access your bank accounts. Transfers are made peer-to-peer using your preferred UPI app (Google Pay, PhonePe, Paytm) or net banking directly to <strong>{receiverName}</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-amber-200/80">
            <h4 className="font-medium text-amber-200">How verification works</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed text-amber-100/70">
              <li>Send money to {receiverName} via your banking / UPI app.</li>
              <li>Click &ldquo;Record payment as pending&rdquo; below with the amount.</li>
              <li>{receiverName} will see the repayment in their overview and confirm receipt to mark it Completed.</li>
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/65 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedToRecord();
            }}
            className="rounded-full bg-[#91cbb7] px-5 py-2.5 text-xs font-semibold text-[#10201b] hover:bg-[#b8dfd0]"
          >
            Record payment as pending
          </button>
        </div>
      </div>
    </div>
  );
}

