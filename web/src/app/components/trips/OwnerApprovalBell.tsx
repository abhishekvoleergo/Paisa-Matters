"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { apiErrorMessage } from "@/lib/api/client";
import { OwnerJoinRequest, tripsApi } from "@/lib/api/trips";
import { tripRoutes } from "@/lib/api/trips";
import Link from "next/link";

type OwnerApprovalBellProps = {
  visible: boolean;
};

function statusLabel(status: string) {
  switch (status) {
    case "Pending": return "Pending approval";
    case "Approved": return "Approved";
    case "Rejected": return "Rejected";
    case "Cancelled": return "Cancelled";
    case "Expired": return "Expired";
    default: return status;
  }
}

export default function OwnerApprovalBell({ visible }: OwnerApprovalBellProps) {
  const [open, setOpen] = useState(false);
  const [showCleared, setShowCleared] = useState(false);
  const [requests, setRequests] = useState<OwnerJoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyClearAll, setBusyClearAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!visible) return;
    let active = true;
    tripsApi.ownerJoinRequests()
      .then((items) => { if (active) setRequests(items); })
      .catch((cause: unknown) => { if (active) setError(apiErrorMessage(cause, "Approval requests could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [visible]);

  if (!visible) return null;

  async function load(includeCleared = showCleared) {
    setLoading(true);
    setError("");
    try {
      setRequests(await tripsApi.ownerJoinRequests(includeCleared));
    } catch (cause) {
      setError(apiErrorMessage(cause, "Approval requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setNotice("");
      void load();
    }
  }

  async function decide(request: OwnerJoinRequest, action: "approve" | "reject") {
    if (busyRequestId) return;
    setBusyRequestId(request.requestId);
    setError("");
    setNotice("");
    try {
      const result = action === "approve"
        ? await tripsApi.approveJoinRequest(request.requestId)
        : await tripsApi.rejectJoinRequest(request.requestId);
      setNotice(result.status === "Expired" ? "The invitation expired before this request could be approved." : action === "approve" ? "Trip access approved." : "Join request rejected.");
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, "That request could not be updated."));
    } finally {
      setBusyRequestId("");
    }
  }

  async function clear(request: OwnerJoinRequest) {
    if (busyRequestId) return;
    setBusyRequestId(request.requestId);
    setError("");
    try {
      await tripsApi.clearJoinRequest(request.requestId);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, "That notification could not be cleared."));
    } finally {
      setBusyRequestId("");
    }
  }

  async function clearAll() {
    if (busyClearAll) return;
    setBusyClearAll(true);
    setError("");
    try {
      const cleared = await tripsApi.clearAllJoinRequests();
      setNotice(cleared === 1 ? "Notification cleared." : cleared + " notifications cleared.");
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, "Notifications could not be cleared."));
    } finally {
      setBusyClearAll(false);
    }
  }

  async function toggleCleared() {
    const next = !showCleared;
    setShowCleared(next);
    await load(next);
  }

  const pendingCount = requests.filter((request) => request.status === "Pending" && !request.clearedAt).length;
  const unclearedCount = requests.filter((request) => !request.clearedAt).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={pendingCount ? "Open owner approval requests" + ", " + pendingCount + " pending" : "Open owner approval requests"}
        aria-expanded={open}
        aria-controls="owner-approval-inbox"
        className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-[#91cbb7]/40 hover:text-[#b8dfd0]"
      >
        <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
        {pendingCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#91cbb7] px-1 text-[9px] font-bold leading-4 text-[#10201b]">{pendingCount > 9 ? "9+" : pendingCount}</span>}
      </button>

      {open && (
        <section id="owner-approval-inbox" role="dialog" aria-label="Trip join approval inbox" className="absolute right-0 top-12 z-40 w-[min(92vw,25rem)] rounded-2xl border border-white/10 bg-[#172320] p-4 shadow-2xl sm:w-[25rem]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] text-[#91cbb7]">OWNER INBOX</p>
              <h2 className="mt-1 font-serif text-xl">Join requests</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close approval inbox" className="grid size-8 place-items-center rounded-full border border-white/10 text-white/55 hover:text-white"><X size={15} aria-hidden="true" /></button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <button type="button" onClick={() => void toggleCleared()} className="text-[10px] text-white/45 underline hover:text-white/75">{showCleared ? "Hide cleared" : "Show cleared"}</button>
            <button type="button" onClick={() => void clearAll()} disabled={busyClearAll || unclearedCount === 0} className="inline-flex items-center gap-1.5 text-[10px] text-[#b8dfd0] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><Trash2 size={12} aria-hidden="true" />{busyClearAll ? "Clearing…" : "Clear all"}</button>
          </div>

          {notice && <p role="status" className="mt-3 rounded-lg border border-[#91cbb7]/20 bg-[#91cbb7]/[0.06] px-3 py-2 text-[10px] text-[#b8dfd0]">{notice}</p>}
          {error && <p role="alert" className="mt-3 rounded-lg border border-[#df947f]/25 bg-[#df947f]/[0.07] px-3 py-2 text-[10px] text-[#f0b4a3]">{error}</p>}
          {loading ? (
            <p role="status" className="py-8 text-center text-xs text-white/45">Loading join requests…</p>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/45">{showCleared ? "No cleared requests." : "No join requests to review."}</p>
          ) : (
            <ul className="mt-3 max-h-[min(65vh,32rem)] space-y-2 overflow-y-auto pr-1">
              {requests.map((request) => {
                const pending = request.status === "Pending";
                const busy = busyRequestId === request.requestId;
                return (
                  <li key={request.requestId} className="rounded-xl border border-white/[0.08] bg-black/15 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white/85">{request.applicantName}</p>
                        <p className="mt-1 truncate text-[10px] text-white/40">{request.applicantEmail}</p>
                        <Link href={tripRoutes.details(request.tripId)} onClick={() => setOpen(false)} className="mt-2 inline-block truncate text-[11px] text-[#b8dfd0] hover:text-white">{request.tripName} · {request.destination}</Link>
                      </div>
                      <span className={"shrink-0 rounded-full border px-2 py-1 text-[9px] " + (pending ? "border-amber-200/20 text-amber-100/70" : "border-white/10 text-white/45")}>{statusLabel(request.status)}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-white/35">Requested {new Date(request.requestedAt).toLocaleString()}</p>
                    {request.clearedAt && <p className="mt-1 text-[9px] text-white/30">Cleared from the inbox</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {pending && (
                        <>
                          <button type="button" onClick={() => void decide(request, "approve")} disabled={busy || Boolean(busyRequestId)} className="inline-flex items-center gap-1 rounded-full bg-[#91cbb7] px-3 py-1.5 text-[10px] font-semibold text-[#10201b] hover:bg-[#b8dfd0] disabled:opacity-40"><Check size={12} aria-hidden="true" />Approve</button>
                          <button type="button" onClick={() => void decide(request, "reject")} disabled={busy || Boolean(busyRequestId)} className="inline-flex items-center gap-1 rounded-full border border-[#df947f]/30 px-3 py-1.5 text-[10px] text-[#f0b4a3] hover:bg-[#df947f]/10 disabled:opacity-40"><X size={12} aria-hidden="true" />Reject</button>
                        </>
                      )}
                      {!request.clearedAt && (
                        <button type="button" onClick={() => void clear(request)} disabled={busy || Boolean(busyRequestId)} className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/50 hover:text-white disabled:opacity-40"><Trash2 size={11} aria-hidden="true" />Clear</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
