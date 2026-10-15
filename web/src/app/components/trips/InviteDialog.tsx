"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { TripInvite, tripsApi } from "@/lib/api/trips";

export default function InviteDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [invite, setInvite] = useState<TripInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    setBusy(true); setError(""); setNotice("");
    try { setInvite(await tripsApi.createInvite(tripId)); }
    catch (cause) { setError(apiErrorMessage(cause, "The invitation link could not be created.")); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.inviteUrl); setNotice("Invitation link copied."); }
    catch { setError("Copying is unavailable in this browser. Select and copy the invitation link."); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title" className="my-auto w-full max-w-lg rounded-[26px] border border-white/10 bg-[#182522] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[0.25em] text-[#91cbb7]">BRING YOUR CREW</p><h2 id="invite-dialog-title" className="mt-3 font-serif text-2xl">Invite members</h2><p className="mt-2 text-xs leading-5 text-white/45">Create a shareable link. Opening the link previews the trip; it does not join automatically.</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Close invitation dialog" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white disabled:opacity-40">✕</button></div>
        {!invite ? <button type="button" onClick={generate} disabled={busy} className="mt-7 w-full rounded-full bg-[#91cbb7] px-5 py-3 text-xs font-semibold text-[#10201b] hover:bg-[#b8dfd0] disabled:opacity-60">{busy ? "Generating link…" : "Generate invite link"}</button> : <div className="mt-7"><label htmlFor="invite-link" className="mb-2 block text-xs text-white/60">Invitation link</label><input id="invite-link" readOnly value={invite.inviteUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-xs text-white/75 outline-none"/><p className="mt-3 text-[11px] text-white/40">{invite.expiresAt ? `Expires ${new Date(invite.expiresAt).toLocaleString()}` : "No expiration"} · {invite.maxUses ? `Up to ${invite.maxUses} uses` : "Unlimited uses"}</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={copy} className="rounded-full border border-white/15 px-4 py-3 text-xs text-white/75 hover:border-[#91cbb7]/40">Copy link</button><a href={`https://wa.me/?text=${encodeURIComponent(invite.inviteUrl)}`} target="_blank" rel="noreferrer" onClick={() => setNotice("WhatsApp opened with your invitation link.")} className="rounded-full bg-[#91cbb7] px-4 py-3 text-center text-xs font-semibold text-[#10201b] hover:bg-[#b8dfd0]">Share via WhatsApp</a></div></div>}
        {notice && <p role="status" className="mt-4 text-xs text-emerald-200">{notice}</p>}{error && <p role="alert" className="mt-4 rounded-lg border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3 py-2 text-xs text-[#f0b4a3]">{error}</p>}
      </section>
    </div>
  );
}
