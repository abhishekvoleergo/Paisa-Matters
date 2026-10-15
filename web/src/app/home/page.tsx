"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, getCurrentUser, UserProfile } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api/client";
import { CreateTripRequest, Trip, tripsApi } from "@/lib/api/trips";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((profile) => { if (active) setUser(profile); })
      .catch(() => router.replace("/auth?mode=login"))
      .finally(() => { if (active) setLoading(false); });
    tripsApi.list().then((items) => { if (active) setTrips(items); })
      .catch((error: unknown) => { if (active) setTripsError(apiErrorMessage(error, "Your trips could not be loaded.")); })
      .finally(() => { if (active) setTripsLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    try { await apiRequest("auth/logout", { method: "POST" }); }
    finally { router.replace("/auth?mode=login"); }
  }

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const form = event.currentTarget;
    setCreateError(""); setSuccessMessage("");
    const data = new FormData(event.currentTarget);
    const request: CreateTripRequest = {
      tripName: String(data.get("tripName") || "").trim(),
      destination: String(data.get("destination") || "").trim(),
      startDate: String(data.get("startDate") || "") || undefined,
      endDate: String(data.get("endDate") || "") || undefined,
    };
    const errors: Record<string, string> = {};
    if (!request.tripName) errors.tripName = "Enter a name for your trip.";
    else if (request.tripName.length > 150) errors.tripName = "Trip name must be 150 characters or fewer.";
    if (!request.destination) errors.destination = "Enter a destination.";
    else if (request.destination.length > 200) errors.destination = "Destination must be 200 characters or fewer.";
    if (request.startDate && request.endDate && request.endDate < request.startDate) errors.endDate = "End date cannot be before start date.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setCreating(true);
    try {
      const created = await tripsApi.create(request);
      setTrips((current) => [created, ...current.filter((trip) => trip.tripId !== created.tripId)]);
      setSuccessMessage(`${created.tripName} was created successfully.`);
      setCreateOpen(false);
      form.reset();
    } catch (error) { setCreateError(apiErrorMessage(error, "Your trip could not be created. Please try again.")); }
    finally { setCreating(false); }
  }

  if (loading || !user) return <main className="min-h-screen bg-[#050505] px-6 py-10 text-[#f4eee4]"><p role="status" className="mx-auto max-w-6xl text-sm text-white/45">Checking your session…</p></main>;
  const isAdmin = user.roles.some((role) => role.toLowerCase() === "admin");

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4eee4]">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#080807]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/home" className="text-sm font-bold uppercase tracking-[0.2em] text-white">Paisa<span className="text-[#d4a853]">Matters</span></Link>
          <nav className="hidden items-center gap-7 text-xs text-white/50 sm:flex"><a href="#overview" className="hover:text-white">Overview</a><a href="#recent-trips" className="hover:text-white">Recent trips</a><a href="#balances" className="hover:text-white">Balances</a>{isAdmin && <a href="/api/admin/verify-access" className="text-[#d4a853]">Admin access</a>}</nav>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open profile menu" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs hover:border-[#d4a853]/40"><span className="grid size-7 place-items-center rounded-full bg-[#d4a853]/15 font-serif text-[#e7c477]">{user.fullName.slice(0, 1).toUpperCase()}</span><span className="hidden max-w-32 truncate sm:inline">{user.fullName}</span><span aria-hidden="true" className="text-white/40">⌄</span></button>
            {menuOpen && <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#11100e] p-4 shadow-2xl"><p className="truncate text-sm font-medium">{user.fullName}</p><p className="mt-1 truncate text-[11px] text-white/40">{user.email}</p><p className="mt-3 inline-flex rounded-full border border-[#d4a853]/20 bg-[#d4a853]/[0.08] px-2.5 py-1 text-[10px] text-[#e7c477]">{user.roles.join(", ") || "User"}</p><button type="button" onClick={logout} disabled={loggingOut} className="mt-4 w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05] disabled:opacity-50">{loggingOut ? "Signing out…" : "Log out"}</button></div>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <section id="overview" className="relative overflow-hidden rounded-[28px] border border-[#d4a853]/15 bg-gradient-to-br from-[#1b1710] via-[#11100d] to-[#0a0a09] p-7 sm:p-11">
          <div className="pointer-events-none absolute -right-20 -top-32 size-96 rounded-full bg-[#d4a853]/[0.07] blur-3xl" />
          <div className="relative max-w-2xl"><p className="font-mono text-[10px] tracking-[0.28em] text-[#d4a853]">YOUR PAISAMATTERS</p><h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">Welcome, {user.fullName.split(" ")[0]}.</h1><p className="mt-4 max-w-lg text-sm leading-6 text-white/50">Your plans, shared costs, and travel crew will find a home here.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => { setCreateOpen(true); setCreateError(""); setFieldErrors({}); }} className="rounded-full bg-[#d4a853] px-5 py-3 text-xs font-semibold text-black transition hover:bg-[#e3bc72]">Create a Trip</button><button type="button" disabled title="Joining trips is coming soon" className="rounded-full border border-white/15 px-5 py-3 text-xs text-white/45">Join a Trip · Coming soon</button></div></div>
        </section>

        {successMessage && <p role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-xs text-emerald-200">{successMessage}</p>}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section id="recent-trips" className="rounded-[22px] border border-white/[0.08] bg-[#0b0b0a] p-6 sm:p-8"><div className="flex items-center justify-between"><h2 className="font-serif text-xl">Recent trips</h2><span className="text-[10px] tracking-wide text-white/30">ACTIVITY</span></div><div className="mt-7 border-t border-white/[0.07] pt-6">{tripsLoading ? <p role="status" className="text-xs text-white/40">Loading your trips…</p> : tripsError ? <div><p role="alert" className="text-xs text-[#ffc3a4]">{tripsError}</p><button type="button" className="mt-3 text-xs text-[#e7c477] underline" onClick={() => { setTripsLoading(true); setTripsError(""); tripsApi.list().then(setTrips).catch((e: unknown) => setTripsError(apiErrorMessage(e, "Your trips could not be loaded."))).finally(() => setTripsLoading(false)); }}>Try again</button></div> : trips.length === 0 ? <div className="py-3"><span className="grid size-10 place-items-center rounded-xl border border-[#d4a853]/20 bg-[#d4a853]/[0.07] text-[#d4a853]" aria-hidden="true">✦</span><h3 className="mt-4 font-serif text-lg">Your next trip starts here</h3><p className="mt-2 max-w-md text-xs leading-6 text-white/45">Create your first trip and invite your travel crew when you’re ready.</p><button type="button" onClick={() => setCreateOpen(true)} className="mt-5 text-xs font-medium text-[#e7c477] hover:text-white">Create your first trip →</button></div> : <ul className="divide-y divide-white/[0.07]">{trips.map((trip) => <li key={trip.tripId} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-serif text-lg">{trip.tripName}</h3><p className="mt-1 text-xs text-white/45">{trip.destination}</p></div><div className="text-left sm:text-right"><p className="text-[10px] text-[#d4a853]">{trip.memberRole || "Member"} · {trip.currencyCode}</p><p className="mt-1 text-[10px] text-white/35">{trip.startDate ? new Date(`${trip.startDate}T00:00:00`).toLocaleDateString() : "Dates flexible"}{trip.endDate ? ` – ${new Date(`${trip.endDate}T00:00:00`).toLocaleDateString()}` : ""}</p></div></li>)}</ul>}</div></section>
          <section id="balances" className="rounded-[22px] border border-white/[0.08] bg-[#0b0b0a] p-6 sm:p-8"><div className="flex items-center justify-between"><h2 className="font-serif text-xl">Balances</h2><span className="text-[10px] tracking-wide text-white/30">YOUR GROUPS</span></div><div className="mt-7 border-t border-white/[0.07] pt-6"><p className="text-xs text-white/40">Balances will appear once you have a trip with shared expenses.</p></div></section>
        </div>
        <footer className="mt-12 border-t border-white/[0.07] pt-5 text-[10px] text-white/30">A clearer way to travel together.</footer>
      </div>
      {createOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="create-trip-title" className="my-auto w-full max-w-xl rounded-[26px] border border-white/10 bg-[#0e0d0b] p-6 shadow-2xl sm:p-9"><div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] tracking-[0.25em] text-[#d4a853]">A JOURNEY TOGETHER</p><h2 id="create-trip-title" className="mt-3 font-serif text-3xl">Create a trip</h2><p className="mt-2 text-xs text-white/45">Start with a name and destination. You can add dates later.</p></div><button type="button" aria-label="Close create trip form" disabled={creating} onClick={() => setCreateOpen(false)} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:text-white disabled:opacity-40">✕</button></div><form className="mt-7 space-y-5" onSubmit={createTrip} noValidate><div><label htmlFor="tripName" className="mb-2 block text-xs font-medium text-white/70">Trip name <span className="text-[#d4a853]">*</span></label><input id="tripName" name="tripName" required maxLength={150} aria-invalid={!!fieldErrors.tripName} aria-describedby={fieldErrors.tripName ? "tripName-error" : undefined} placeholder="A week in the mountains" className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-[#d4a853]/70" />{fieldErrors.tripName && <p id="tripName-error" className="mt-1.5 text-xs text-[#ffc3a4]">{fieldErrors.tripName}</p>}</div><div><label htmlFor="destination" className="mb-2 block text-xs font-medium text-white/70">Destination <span className="text-[#d4a853]">*</span></label><input id="destination" name="destination" required maxLength={200} aria-invalid={!!fieldErrors.destination} aria-describedby={fieldErrors.destination ? "destination-error" : undefined} placeholder="Manali, Himachal Pradesh" className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-[#d4a853]/70" />{fieldErrors.destination && <p id="destination-error" className="mt-1.5 text-xs text-[#ffc3a4]">{fieldErrors.destination}</p>}</div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="startDate" className="mb-2 block text-xs font-medium text-white/70">Start date <span className="text-white/30">· optional</span></label><input id="startDate" name="startDate" type="date" aria-invalid={!!fieldErrors.startDate} className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80 outline-none focus:border-[#d4a853]/70" /></div><div><label htmlFor="endDate" className="mb-2 block text-xs font-medium text-white/70">End date <span className="text-white/30">· optional</span></label><input id="endDate" name="endDate" type="date" aria-invalid={!!fieldErrors.endDate} className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80 outline-none focus:border-[#d4a853]/70" />{fieldErrors.endDate && <p className="mt-1.5 text-xs text-[#ffc3a4]">{fieldErrors.endDate}</p>}</div></div><div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"><span className="text-xs text-white/55">Trip currency</span><span className="text-xs font-medium text-[#e7c477]">₹ INR</span></div>{createError && <p role="alert" className="rounded-lg border border-[#e58e62]/30 bg-[#e58e62]/[0.08] px-3 py-2 text-xs text-[#ffc3a4]">{createError}</p>}<div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end"><button type="button" disabled={creating} onClick={() => setCreateOpen(false)} className="rounded-full border border-white/15 px-5 py-3 text-xs text-white/65 hover:text-white disabled:opacity-40">Cancel</button><button type="submit" disabled={creating} className="rounded-full bg-[#d4a853] px-6 py-3 text-xs font-semibold text-[#100d08] transition hover:bg-[#e3bc72] disabled:cursor-wait disabled:opacity-60">{creating ? "Creating trip…" : "Create trip"}</button></div></form></section></div>}
    </main>
  );
}
