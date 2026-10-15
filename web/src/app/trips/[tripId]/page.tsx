"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InviteDialog from "@/app/components/trips/InviteDialog";
import { apiErrorMessage, apiStatus } from "@/lib/api/client";
import { TripDetails, TripMember, tripsApi, tripRoutes } from "@/lib/api/trips";

const panel = "rounded-[22px] border border-white/[0.08] bg-[#121d1b] p-6 sm:p-8";
const prettyDate = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "Not set";

export default function TripRoomPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const validTripId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId);

  useEffect(() => {
    let active = true;
    if (!validTripId) return () => { active = false; };
    Promise.all([tripsApi.getById(tripId), tripsApi.getMembers(tripId)])
      .then(([details, list]) => { if (active) { setTrip(details); setMembers(list); } })
      .catch((cause: unknown) => { if (!active) return; if (apiStatus(cause) === 401) { router.replace(`/auth?mode=login&returnUrl=${encodeURIComponent(tripRoutes.details(tripId))}`); return; } setError(apiErrorMessage(cause, "This trip could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId, router, validTripId]);

  async function removeTrip() {
    if (deleting || !trip) return;
    const deletedName = trip.tripName;
    setDeleting(true); setDeleteError("");
    try { await tripsApi.remove(tripId); router.replace(`/home?deleted=${encodeURIComponent(deletedName)}`); }
    catch (cause) { setDeleteError(apiErrorMessage(cause, "The trip could not be marked inactive. Please try again.")); setDeleting(false); }
  }

  if (!validTripId) return <main className="min-h-screen bg-[#0b1212] px-5 py-12 text-[#f0eee6]"><div className="mx-auto max-w-5xl"><Link href="/home" className="text-xs text-[#91cbb7]">← Back to trips</Link><section className={`${panel} mt-7`}><h1 className="font-serif text-2xl">Trip unavailable</h1><p role="alert" className="mt-3 text-sm text-[#f0b4a3]">This trip link is not valid.</p></section></div></main>;
  if (loading) return <main className="min-h-screen bg-[#0b1212] px-5 py-12 text-[#f0eee6]"><p role="status" className="mx-auto max-w-5xl text-sm text-white/45">Loading trip…</p></main>;
  if (error || !trip) return <main className="min-h-screen bg-[#0b1212] px-5 py-12 text-[#f0eee6]"><div className="mx-auto max-w-5xl"><Link href="/home" className="text-xs text-[#91cbb7]">← Back to trips</Link><section className={`${panel} mt-7`}><h1 className="font-serif text-2xl">Trip unavailable</h1><p role="alert" className="mt-3 text-sm text-[#f0b4a3]">{error || "This trip could not be found."}</p></section></div></main>;

  const isOwner = trip.currentUserRole.toLowerCase() === "owner";
  const activeMembers = members.filter((member) => member.status.toLowerCase() === "active");
  const owner = activeMembers.find((member) => member.role.toLowerCase() === "owner");
  const orderedMembers = [...activeMembers].sort((a, b) => Number(b.role.toLowerCase() === "owner") - Number(a.role.toLowerCase() === "owner"));

  return (
    <main className="min-h-screen bg-[#0b1212] text-[#f0eee6]">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0d1716]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"><Link href="/home" className="text-sm font-bold uppercase tracking-[0.2em] text-white">Paisa<span className="text-[#91cbb7]">Matters</span></Link><Link href="/home" className="text-xs text-white/55 hover:text-white">← Back to trips</Link></div></header>
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <section className="relative overflow-hidden rounded-[28px] border border-[#91cbb7]/15 bg-gradient-to-br from-[#142822] via-[#192725] to-[#111c1a] p-7 sm:p-11"><div className="pointer-events-none absolute -right-16 -top-32 size-96 rounded-full bg-[#91cbb7]/[0.07] blur-3xl"/><div className="relative"><p className="font-mono text-[10px] tracking-[0.28em] text-[#91cbb7]">TRIP ROOM · {trip.currencyCode}</p><h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{trip.tripName}</h1><p className="mt-4 text-sm text-white/55">{trip.destination}</p><div className="mt-7 flex flex-wrap gap-3"><span className="rounded-full border border-[#91cbb7]/25 bg-[#91cbb7]/[0.07] px-4 py-2 text-[11px] text-[#b8dfd0]">Your role · {trip.currentUserRole}</span>{isOwner && <><Link href={tripRoutes.edit(tripId)} className="rounded-full border border-white/15 px-4 py-2 text-[11px] text-white/75 hover:border-[#91cbb7]/45">Edit trip</Link><button type="button" onClick={() => setInviteOpen(true)} className="rounded-full bg-[#91cbb7] px-4 py-2 text-[11px] font-semibold text-[#10201b] hover:bg-[#b8dfd0]">Invite members</button><button type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }} className="rounded-full border border-[#df947f]/30 px-4 py-2 text-[11px] text-[#f0b4a3] hover:bg-[#df947f]/10">Delete trip</button></>}</div></div></section>
        <div className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className={panel}><div className="flex items-center justify-between"><h2 className="font-serif text-xl">Trip details</h2><span className="text-[10px] text-white/35">INR · ₹</span></div><dl className="mt-6 grid gap-5 border-t border-white/[0.07] pt-5 sm:grid-cols-2"><div><dt className="text-[10px] uppercase tracking-wider text-white/35">Destination</dt><dd className="mt-1.5 text-sm">{trip.destination}</dd></div><div><dt className="text-[10px] uppercase tracking-wider text-white/35">Trip owner</dt><dd className="mt-1.5 text-sm text-[#b8dfd0]">{trip.ownerName}</dd></div><div><dt className="text-[10px] uppercase tracking-wider text-white/35">Start date</dt><dd className="mt-1.5 text-sm">{prettyDate(trip.startDate)}</dd></div><div><dt className="text-[10px] uppercase tracking-wider text-white/35">End date</dt><dd className="mt-1.5 text-sm">{prettyDate(trip.endDate)}</dd></div><div><dt className="text-[10px] uppercase tracking-wider text-white/35">Created</dt><dd className="mt-1.5 text-sm">{prettyDate(trip.createdAt)}</dd></div><div><dt className="text-[10px] uppercase tracking-wider text-white/35">Last updated</dt><dd className="mt-1.5 text-sm">{prettyDate(trip.updatedAt)}</dd></div></dl></section>
          <section className={panel}><div className="flex items-center justify-between gap-4"><h2 className="font-serif text-xl">Travel crew</h2><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/55">{activeMembers.length} active {activeMembers.length === 1 ? "member" : "members"}</span></div>{owner && <div className="mt-6 rounded-xl border border-[#91cbb7]/20 bg-[#91cbb7]/[0.05] p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-[#91cbb7]">Trip owner</p><p className="mt-1.5 text-sm font-medium">{owner.fullName}</p><p className="mt-1 text-[10px] text-white/40">Joined {prettyDate(owner.joinedAt)}</p></div>}<ul className="mt-4 divide-y divide-white/[0.07]">{orderedMembers.map((member) => <li key={member.userId} className="flex items-center gap-3 py-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] font-serif text-sm text-[#b8dfd0]">{member.fullName.trim().slice(0, 1).toUpperCase() || "?"}</span><div className="min-w-0 flex-1"><p className="truncate text-xs">{member.fullName}</p><p className="mt-1 text-[10px] text-white/35">{member.role} · joined {prettyDate(member.joinedAt)}</p></div><span className="rounded-full border border-emerald-400/15 px-2 py-1 text-[9px] text-emerald-200">{member.status}</span></li>)}</ul>{activeMembers.length === 0 && <p className="mt-6 text-xs text-white/40">No active members are listed.</p>}</section>
        </div>
      </div>
      {inviteOpen && isOwner && <InviteDialog tripId={tripId} onClose={() => setInviteOpen(false)} />}
      {deleteOpen && isOwner && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-trip-title" className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#182522] p-6 shadow-2xl sm:p-8"><p className="font-mono text-[10px] tracking-[0.2em] text-[#df947f]">DELETE TRIP</p><h2 id="delete-trip-title" className="mt-3 font-serif text-2xl">Delete “{trip.tripName}”?</h2><p className="mt-3 text-xs leading-6 text-white/50">This marks the trip inactive and removes it from trip lists. Membership and invitation records are retained.</p>{deleteError && <p role="alert" className="mt-4 rounded-lg border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3 py-2 text-xs text-[#f0b4a3]">{deleteError}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="rounded-full border border-white/15 px-4 py-3 text-xs text-white/65 disabled:opacity-40">Keep trip</button><button type="button" disabled={deleting} onClick={removeTrip} className="rounded-full bg-[#c47662] px-5 py-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60">{deleting ? "Deleting trip…" : "Delete trip"}</button></div></section></div>}
    </main>
  );
}
