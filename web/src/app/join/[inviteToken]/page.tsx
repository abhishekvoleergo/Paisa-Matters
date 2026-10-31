"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/api";
import { InvitePreview, JoinTripResult, tripsApi, tripRoutes } from "@/lib/api/trips";

export default function JoinTripPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [requestResult, setRequestResult] = useState<JoinTripResult | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([tripsApi.previewInvite(inviteToken), getCurrentUser()]).then(([inviteResult, userResult]) => {
      if (!active) return;
      if (inviteResult.status === "fulfilled") setPreview(inviteResult.value);
      else setError(apiErrorMessage(inviteResult.reason, "This invitation could not be checked."));
      setAuthenticated(userResult.status === "fulfilled");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [inviteToken]);

  const returnUrl = tripRoutes.join(inviteToken);
  const authUrl = (mode: "login" | "signup") => "/auth?mode=" + mode + "&returnUrl=" + encodeURIComponent(returnUrl);

  async function requestToJoin() {
    if (requesting) return;
    if (!authenticated) { router.push(authUrl("login")); return; }
    setRequesting(true);
    setError("");
    try {
      setRequestResult(await tripsApi.joinByInvite(inviteToken));
    } catch (cause) {
      setError(apiErrorMessage(cause, "Your request could not be sent. The invitation may have expired or reached its use limit."));
    } finally {
      setRequesting(false);
    }
  }

  const panel = "mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-[#15211f] p-7 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-10";
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#0b1212] px-5 text-[#f0eee6]"><p role="status" className="text-sm text-white/45">Checking invitation…</p></main>;
  const valid = !!preview?.valid && preview.status.toLowerCase() === "valid";
  const alreadyMember = requestResult?.status.toLowerCase() === "alreadymember";

  return (
    <main className="auth-scene grid min-h-screen place-items-center px-5 py-10 text-[#f0eee6]">
      <section className={panel}>
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-white">Paisa<span className="text-[#91cbb7]">Matters</span></Link>
        <p className="mt-10 font-mono text-[10px] tracking-[0.26em] text-[#91cbb7]">TRAVEL TOGETHER</p>

        {requestResult ? (
          <>
            <h1 className="mt-3 font-serif text-3xl">{alreadyMember ? "You’re already in." : "Request sent."}</h1>
            <p role="status" className="mt-3 text-sm leading-6 text-white/50">
              {alreadyMember
                ? "You already have an active place in this travel crew."
                : "Your request to join " + (preview?.tripName ?? "this trip") + " is pending. The owner must approve it before you can access trip details or expenses."}
            </p>
            {alreadyMember ? (
              <button type="button" onClick={() => router.replace(tripRoutes.details(requestResult.tripId))} className="mt-7 w-full rounded-full bg-[#91cbb7] px-5 py-3.5 text-sm font-semibold text-[#10201b] hover:bg-[#b8dfd0]">Open trip</button>
            ) : (
              <Link href="/home" className="mt-7 block w-full rounded-full bg-[#91cbb7] px-5 py-3.5 text-center text-sm font-semibold text-[#10201b] hover:bg-[#b8dfd0]">View request status</Link>
            )}
          </>
        ) : valid ? (
          <>
            <h1 className="mt-3 font-serif text-3xl">You’re invited.</h1>
            <p className="mt-2 text-sm text-white/50">Preview this trip and ask the owner to approve your access.</p>
            <div className="mt-7 rounded-2xl border border-[#91cbb7]/20 bg-[#91cbb7]/[0.05] p-5">
              <h2 className="font-serif text-2xl">{preview?.tripName}</h2>
              <p className="mt-2 text-sm text-white/55">{preview?.destination}</p>
              {preview?.expiresAt && <p className="mt-4 text-[10px] text-white/40">Invitation expires {new Date(preview.expiresAt).toLocaleString()}</p>}
              {preview?.maxUses && <p className="mt-1 text-[10px] text-white/40">Uses {preview.useCount ?? 0} of {preview.maxUses}</p>}
            </div>
            {authenticated ? (
              <button type="button" onClick={requestToJoin} disabled={requesting} className="mt-7 w-full rounded-full bg-[#91cbb7] px-5 py-3.5 text-sm font-semibold text-[#10201b] hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-60">{requesting ? "Sending request…" : "Request to join"}</button>
            ) : (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link href={authUrl("login")} className="rounded-full bg-[#91cbb7] px-5 py-3.5 text-center text-sm font-semibold text-[#10201b]">Sign in to request access</Link>
                <Link href={authUrl("signup")} className="rounded-full border border-white/15 px-5 py-3.5 text-center text-sm text-white/75">Create account</Link>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-3 font-serif text-3xl">Invitation unavailable</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-white/50">{error || (preview?.status.toLowerCase() === "expired" ? "This invitation has expired." : preview?.status.toLowerCase() === "exhausted" ? "This invitation has reached its use limit." : "This invitation link is invalid or no longer available.")}</p>
          </>
        )}

        {error && valid && !requestResult && <p role="alert" className="mt-4 rounded-lg border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3 py-2 text-xs text-[#f0b4a3]">{error}</p>}
        <Link href="/" className="mt-8 inline-block text-xs text-white/35 hover:text-white/70">Return to PaisaMatters</Link>
      </section>
    </main>
  );
}
