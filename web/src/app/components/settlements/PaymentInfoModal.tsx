"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { PaymentQrDetails } from "@/lib/api/expenses";

type PaymentInfoModalProps = {
  details: PaymentQrDetails | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
};

function formatExactCurrency(amountText: string, currency: string) {
  const [whole, fraction = "00"] = amountText.split(".");
  const groupedWhole = whole.length > 3
    ? `${whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${whole.slice(-3)}`
    : whole;
  const formattedAmount = `${groupedWhole}.${fraction}`;
  let insertedAmount = false;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(0)
    .map((part) => {
      if (part.type === "integer") {
        if (insertedAmount) return "";
        insertedAmount = true;
        return formattedAmount;
      }
      if (["group", "decimal", "fraction"].includes(part.type)) return "";
      return part.value;
    })
    .join("");
}

export default function PaymentInfoModal({
  details,
  loading,
  error,
  onClose,
  onRetry,
}: PaymentInfoModalProps) {
  const [showQr, setShowQr] = useState(false);
  const [qrResult, setQrResult] = useState<{ uri: string; dataUrl?: string; error?: string }>({ uri: "" });
  const [qrAttempt, setQrAttempt] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const upiId = details?.recipientUpiId?.trim() ?? "";
  const hasUsableUpiId = /^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]+$/.test(upiId);

  const paymentUri = useMemo(() => {
    if (!details || !hasUsableUpiId || details.amount <= 0) return "";
    const params = new URLSearchParams({
      pa: upiId,
      pn: details.recipientName,
      am: details.amountText,
      cu: details.currencyCode || "INR",
      tn: details.transactionNote,
    });
    return `upi://pay?${params.toString()}`;
  }, [details, hasUsableUpiId, upiId]);

  const qrDataUrl = qrResult.uri === paymentUri ? qrResult.dataUrl ?? "" : "";
  const qrError = qrResult.uri === paymentUri ? qrResult.error ?? "" : "";

  useEffect(() => {
    let cancelled = false;
    if (!paymentUri || !showQr) return () => { cancelled = true; };

    QRCode.toDataURL(paymentUri, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: "Q",
      color: { dark: "#07110e", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrResult({ uri: paymentUri, dataUrl });
      })
      .catch(() => {
        if (!cancelled) setQrResult({ uri: paymentUri, error: "The payment QR could not be generated. Please retry." });
      });

    return () => { cancelled = true; };
  }, [paymentUri, qrAttempt, showQr]);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopyMessage("UPI ID copied");
    } catch {
      setCopyMessage("Could not copy the UPI ID. Select and copy it manually.");
    }
  }

  const amountLabel = details
    ? formatExactCurrency(details.amountText, details.currencyCode)
    : "";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-qr-title"
        className="my-auto w-full max-w-md rounded-[24px] border border-white/[0.08] bg-[#121d1b] p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#91cbb7]">
              UPI PAYMENT
            </p>
            <h2 id="payment-qr-title" className="mt-1 font-serif text-2xl text-[#f0eee6]">
              Pay {details?.recipientName ?? "recipient"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment QR"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 transition hover:border-white/25 hover:text-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-8 text-center" role="status">
            <div className="mx-auto size-7 animate-spin rounded-full border-2 border-white/15 border-t-[#91cbb7]" />
            <p className="mt-3 text-xs text-white/55">Checking the current balance and recipient details…</p>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-[#df947f]/25 bg-[#df947f]/[0.07] p-4">
            <p role="alert" className="text-sm text-[#f0b4a3]">{error}</p>
            <button type="button" onClick={onRetry} className="mt-3 text-xs text-white/75 underline hover:text-white">
              Try again
            </button>
          </div>
        ) : details ? (
          <>
            <div className="mt-5 flex items-end justify-between gap-3 rounded-2xl border border-[#91cbb7]/15 bg-[#91cbb7]/[0.06] p-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/45">Exact amount due</p>
                <p className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#b8dfd0]">{amountLabel}</p>
              </div>
              {details.recipientName && (
                <p className="max-w-[45%] truncate text-right text-xs text-white/70">to {details.recipientName}</p>
              )}
            </div>

            {hasUsableUpiId ? (
              <>
                {!showQr ? (
                  <p className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-4 text-center text-xs leading-relaxed text-white/55">
                    Generate a QR to pay exactly {amountLabel} to {details.recipientName}.
                  </p>
                ) : (
                  <div className="mt-5 flex flex-col items-center">
                    <div className="grid min-h-[296px] w-full place-items-center rounded-2xl bg-white p-2">
                      {qrDataUrl ? (
                        // The generated image has a four-module white quiet zone and a high-contrast palette.
                        <Image
                          src={qrDataUrl}
                          alt={`UPI payment QR for ${details.recipientName}, ${amountLabel}`}
                          width={280}
                          height={280}
                          unoptimized
                          className="h-[280px] w-[280px] max-w-full object-contain"
                        />
                      ) : qrError ? (
                        <div className="max-w-[240px] text-center text-xs text-[#8d3d2b]" role="alert">
                          <p>{qrError}</p>
                          <button type="button" onClick={() => setQrAttempt((attempt) => attempt + 1)} className="mt-2 underline">Try generating again</button>
                        </div>
                      ) : (
                        <div className="text-xs text-[#35433d]" role="status">Preparing your payment QR…</div>
                      )}
                    </div>
                    <p className="mt-3 max-w-xs text-center text-[11px] leading-relaxed text-white/50">
                      Scan with a compatible UPI app and verify the recipient and amount before paying.
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Recipient UPI ID</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="min-w-0 flex-1 break-all font-mono text-sm text-white/85">{upiId}</span>
                    <button
                      type="button"
                      onClick={() => void copyUpiId()}
                      className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/75 transition hover:border-[#91cbb7]/40 hover:text-white"
                    >
                      Copy UPI ID
                    </button>
                  </div>
                  {copyMessage && <p role="status" className="mt-2 text-[10px] text-[#b8dfd0]">{copyMessage}</p>}
                </div>

                {showQr && (
                  <>
                    <a
                      href={paymentUri}
                      className="mt-3 flex w-full items-center justify-center rounded-full border border-[#91cbb7]/35 px-4 py-3 text-xs font-semibold text-[#b8dfd0] transition hover:bg-[#91cbb7]/10"
                    >
                      Pay with a UPI app
                    </a>
                    <p className="mt-2 text-center text-[10px] leading-relaxed text-white/40">
                      The app link works only on devices and browsers with a compatible UPI app installed.
                    </p>
                  </>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                <p className="text-sm font-medium text-amber-100">No usable UPI ID is saved for {details.recipientName}.</p>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-100/65">
                  Ask them to add a valid UPI ID in their PaisaMatters profile before using a QR payment.
                </p>
              </div>
            )}

            <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] leading-relaxed text-amber-100/65">
              A QR scan or UPI app opening does not confirm payment. After transferring, record the repayment from the settlement card; {details.recipientName} must confirm receipt.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/65 transition hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!hasUsableUpiId}
                onClick={() => {
                  if (showQr) setQrAttempt((attempt) => attempt + 1);
                  setShowQr(true);
                }}
                className="rounded-full bg-[#91cbb7] px-5 py-2.5 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {showQr ? "Regenerate QR" : "Generate QR"}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
