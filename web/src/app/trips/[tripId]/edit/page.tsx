"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiErrorMessage, apiStatus } from "@/lib/api/client";
import { tripsApi, tripRoutes } from "@/lib/api/trips";

export default function EditTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<Awaited<ReturnType<typeof tripsApi.getById>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    tripsApi.getById(tripId).then((value) => {
      if (!active) return;
      if (value.currentUserRole.toLowerCase() !== "owner") { router.replace(tripRoutes.details(tripId)); return; }
      setTrip(value);
    }).catch((cause: unknown) => { if (!active) return; if (apiStatus(cause) === 401) { router.replace(`/auth?mode=login&returnUrl=${encodeURIComponent(tripRoutes.edit(tripId))}`); return; } setError(apiErrorMessage(cause, "This trip could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId, router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !trip) return;
    const data = new FormData(event.currentTarget);
    const tripName = String(data.get("tripName") || "").trim();
    const destination = String(data.get("destination") || "").trim();
    const startDate = String(data.get("startDate") || "") || undefined;
    const endDate = String(data.get("endDate") || "") || undefined;
    const nextErrors: Record<string, string> = {};
    if (!tripName) nextErrors.tripName = "Trip name is required.";
    else if (tripName.length > 150) nextErrors.tripName = "Trip name must be 150 characters or fewer.";
    if (!destination) nextErrors.destination = "Destination is required.";
    else if (destination.length > 200) nextErrors.destination = "Destination must be 200 characters or fewer.";
    if (startDate && endDate && endDate < startDate) nextErrors.endDate = "End date cannot be before start date.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true); setError("");
    try { await tripsApi.update(tripId, { tripName, destination, startDate, endDate }); router.replace(tripRoutes.details(tripId)); }
    catch (cause) { setError(apiErrorMessage(cause, "Trip changes could not be saved.")); setSaving(false); }
  }

  const input = "w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-[#f0eee6] outline-none placeholder:text-white/30 focus:border-[#91cbb7]/70";
  if (loading) return <main className="min-h-screen bg-[#0b1212] p-8 text-[#f0eee6]"><p role="status" className="mx-auto max-w-2xl text-sm text-white/45">Loading trip…</p></main>;
  if (!trip) return <main className="min-h-screen bg-[#0b1212] p-8 text-[#f0eee6]"><section className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-[#121d1b] p-7"><h1 className="font-serif text-2xl">Trip unavailable</h1><p role="alert" className="mt-3 text-sm text-[#f0b4a3]">{error || "This trip could not be loaded."}</p><Link href="/home" className="mt-5 inline-block text-xs text-[#b8dfd0]">Back to trips</Link></section></main>;

  return <main className="min-h-screen bg-[#0b1212] px-5 py-8 text-[#f0eee6] sm:px-8 sm:py-12"><div className="mx-auto max-w-2xl"><Link href={tripRoutes.details(tripId)} className="text-xs text-[#91cbb7]">← Back to trip</Link><section className="mt-6 rounded-[26px] border border-white/10 bg-[#121d1b] p-6 shadow-2xl sm:p-9"><p className="font-mono text-[10px] tracking-[0.25em] text-[#91cbb7]">TRIP SETTINGS · INR</p><h1 className="mt-3 font-serif text-3xl">Edit trip</h1><p className="mt-2 text-xs text-white/45">Only the trip owner can make these changes.</p><form onSubmit={save} noValidate className="mt-7 space-y-5"><div><label htmlFor="tripName" className="mb-2 block text-xs text-white/70">Trip name</label><input id="tripName" name="tripName" defaultValue={trip.tripName} required maxLength={150} className={input}/>{fieldErrors.tripName && <p className="mt-1 text-xs text-[#f0b4a3]">{fieldErrors.tripName}</p>}</div><div><label htmlFor="destination" className="mb-2 block text-xs text-white/70">Destination</label><input id="destination" name="destination" defaultValue={trip.destination} required maxLength={200} className={input}/>{fieldErrors.destination && <p className="mt-1 text-xs text-[#f0b4a3]">{fieldErrors.destination}</p>}</div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="startDate" className="mb-2 block text-xs text-white/70">Start date</label><input id="startDate" name="startDate" type="date" defaultValue={trip.startDate?.slice(0, 10) || ""} className={input}/></div><div><label htmlFor="endDate" className="mb-2 block text-xs text-white/70">End date</label><input id="endDate" name="endDate" type="date" defaultValue={trip.endDate?.slice(0, 10) || ""} className={input}/>{fieldErrors.endDate && <p className="mt-1 text-xs text-[#f0b4a3]">{fieldErrors.endDate}</p>}</div></div>{error && <p role="alert" className="rounded-lg border border-[#df947f]/30 bg-[#df947f]/[0.08] px-3 py-2 text-xs text-[#f0b4a3]">{error}</p>}<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><Link href={tripRoutes.details(tripId)} className="rounded-full border border-white/15 px-5 py-3 text-center text-xs text-white/65">Cancel</Link><button disabled={saving} className="rounded-full bg-[#91cbb7] px-6 py-3 text-xs font-semibold text-[#10201b] hover:bg-[#b8dfd0] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving changes…" : "Save changes"}</button></div></form></section></div></main>;
}
