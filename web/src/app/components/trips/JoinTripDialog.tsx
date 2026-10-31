"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/api/client";
import { InvitePreview, JoinTripResult, tripsApi, tripRoutes } from "@/lib/api/trips";

type JoinTripDialogProps = {
  onClose: () => void;
  onRequestSubmitted: () => void;
};

function readInviteToken(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;

  let token = candidate;
  try {
    const parsed = new URL(candidate);
    const match = parsed.pathname.match(/\/join\/([^/]+)\/?$/i);
    if (match) token = decodeURIComponent(match[1]);
  } catch {
    const match = candidate.match(/(?:^|\/)join\/([^/?#]+)\/?$/i);
    if (match) token = decodeURIComponent(match[1]);
  }

  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export default function JoinTripDialog({ onClose, onRequestSubmitted }: JoinTripDialogProps) {
  const [inviteValue, setInviteValue] = useState("");
  const [checkedToken, setCheckedToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [requestResult, setRequestResult] = useState<JoinTripResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  async function checkInvite() {
    const token = readInviteToken(inviteValue);
    setError("");
    setPreview(null);
    setRequestResult(null);
    setCheckedToken("");
    if (!token) {
      setError("Paste a valid PaisaMatters invitation link.");
      return;
    }

    setChecking(true);
    try {
      const result = await tripsApi.previewInvite(token);
      setPreview(result);
      setCheckedToken(token);
      if (!result.valid) setError(result.status === "Expired" ? "This invitation has expired." : result.status === "Exhausted" ? "This invitation has reached its use limit." : "This invitation link is no longer available.");
    } catch (cause) {
      setError(apiErrorMessage(cause, "This invitation could not be checked."));
    } finally {
      setChecking(false);
    }
  }

  async function requestToJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkedToken || !preview?.valid || requesting) return;
    setRequesting(true);
    setError("");
    try {
      const result = await tripsApi.joinByInvite(checkedToken);
      setRequestResult(result);
      onRequestSubmitted();
    } catch (cause) {
      setError(apiErrorMessage(cause, "Your request could not be sent."));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !requesting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="join-trip-title" className="my-auto w-full max-w-xl rounded-[26px] border border-white/10 bg-[#182522] p-6 text-[#f0eee6] shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#91cbb7]">TRAVEL TOGETHER</p>
            <h2 id="join-trip-title" className="mt-3 font-serif text-3xl">Join a trip</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Use an invitation link shared by the trip owner. Your access starts after they approve your request.</p>
          </div>
          <button type="button" onClick={onClose} disabled={requesting} aria-label="Close join trip dialog" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white disabled:opacity-40">✕</button>
        </div>

        {requestResult ? (
          <div className="mt-7 rounded-2xl border border-[#91cbb7]/20 bg-[#91cbb7]/[0.06] p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#91cbb7]">Request status</p>
            {requestResult.status === "AlreadyMember" ? (
              <>
                <h3 className="mt-2 font-serif text-xl">You already have access</h3>
                <p className="mt-2 text-xs leading-5 text-white/55">{preview?.tripName} is already in your trip list.</p>
                <Link href={tripRoutes.details(requestResult.tripId)} onClick={onClose} className="mt-5 inline-flex rounded-full bg-[#91cbb7] px-5 py-2.5 text-xs font-semibold text-[#10201b] hover:bg-[#b8dfd0]">Open trip</Link>
              </>
            ) : (
              <>
                <h3 className="mt-2 font-serif text-xl">Request sent</h3>
                <p role="status" className="mt-2 text-xs leading-5 text-white/55">Your request to join {preview?.tripName} is pending. The owner must approve it before the trip becomes available.</p>
                <button type="button" onClick={onClose} className="mt-5 rounded-full border border-white/15 px-5 py-2.5 text-xs text-white/75 hover:border-[#91cbb7]/40">Done</button>
              </>
            )}
          </div>
        ) : (
          <form className="mt-7" onSubmit={requestToJoin}>
            <label htmlFor="trip-invite-link" className="mb-2 block text-xs font-medium text-white/70">Invitation link</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="trip-invite-link" type="text" autoComplete="url" maxLength={600} value={inviteValue} onChange={(event) => { setInviteValue(event.target.value); setPreview(null); setCheckedToken(""); setRequestResult(null); setError(""); }} placeholder="Paste your trip invitation link" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs outline-none placeholder:text-white/30 focus:border-[#91cbb7]/70" />
              <button type="button" onClick={checkInvite} disabled={checking || !inviteValue.trim()} className="rounded-full border border-[#91cbb7]/35 px-5 py-3 text-xs font-medium text-[#b8dfd0] transition hover:bg-[#91cbb7]/10 disabled:cursor-wait disabled:opacity-40">{checking ? "Checking…" : "Check invite"}</button>
            </div>

            {preview?.valid && (
              <div className="mt-5 rounded-2xl border border-[#91cbb7]/20 bg-[#91cbb7]/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#91cbb7]">Trip invitation</p>
                <h3 className="mt-2 font-serif text-2xl">{preview.tripName}</h3>
                <p className="mt-1 text-xs text-white/55">{preview.destination}</p>
                {preview.expiresAt && <p className="mt-3 text-[10px] text-white/35">Invite expires {new Date(preview.expiresAt).toLocaleString()}</p>}
                {preview.maxUses && <p className="mt-1 text-[10px] text-white/35">Invite uses {preview.useCount ?? 0} of {preview.maxUses}</p>}
              </div>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3 py-2 text-xs text-[#f0b4a3]">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={requesting} className="rounded-full border border-white/15 px-5 py-3 text-xs text-white/65 hover:text-white">Cancel</button>
              <button type="submit" disabled={!preview?.valid || !checkedToken || requesting} className="rounded-full bg-[#91cbb7] px-5 py-3 text-xs font-semibold text-[#10201b] transition hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-40">{requesting ? "Sending request…" : "Request to join"}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
