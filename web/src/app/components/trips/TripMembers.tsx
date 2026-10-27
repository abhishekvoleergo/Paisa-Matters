"use client";

import { useMemo } from "react";
import { TripMember } from "@/lib/api/trips";

/* ── palette tokens (consistent with existing Trip Room) ───────────── */
const panel =
  "rounded-[22px] border border-white/[0.08] bg-[#121d1b] p-6 sm:p-8";

/* ── deterministic avatar colours ──────────────────────────────────── */
const avatarPalette = [
  { bg: "bg-[#91cbb7]/15", text: "text-[#91cbb7]", ring: "ring-[#91cbb7]/25" },
  { bg: "bg-[#a0b4e0]/15", text: "text-[#a0b4e0]", ring: "ring-[#a0b4e0]/25" },
  { bg: "bg-[#dbb990]/15", text: "text-[#dbb990]", ring: "ring-[#dbb990]/25" },
  { bg: "bg-[#c9a0d8]/15", text: "text-[#c9a0d8]", ring: "ring-[#c9a0d8]/25" },
  { bg: "bg-[#e0a0a0]/15", text: "text-[#e0a0a0]", ring: "ring-[#e0a0a0]/25" },
  { bg: "bg-[#a0d8c0]/15", text: "text-[#a0d8c0]", ring: "ring-[#a0d8c0]/25" },
] as const;

function avatarColour(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function prettyDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ── role badge ────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const isOwner = role.toLowerCase() === "owner";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium leading-none ${
        isOwner
          ? "border border-[#91cbb7]/25 bg-[#91cbb7]/[0.08] text-[#b8dfd0]"
          : "border border-white/10 bg-white/[0.04] text-white/50"
      }`}
    >
      {isOwner && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-70">
          <path d="M3 14l1-5L0 6l5-.5L8 1l3 4.5L16 6l-4 3 1 5-5-3z" />
        </svg>
      )}
      {role}
    </span>
  );
}

/* ── member card ───────────────────────────────────────────────────── */
function MemberCard({
  member,
  isCurrentUser,
}: {
  member: TripMember;
  isCurrentUser: boolean;
}) {
  const colour = avatarColour(member.userId);
  const isOwner = member.role.toLowerCase() === "owner";

  return (
    <li
      className={`group relative flex items-center gap-4 rounded-2xl px-4 py-4 transition-colors ${
        isOwner
          ? "bg-[#91cbb7]/[0.03] hover:bg-[#91cbb7]/[0.06]"
          : "hover:bg-white/[0.02]"
      }`}
    >
      {/* avatar */}
      <div
        className={`grid size-11 shrink-0 place-items-center rounded-full ring-1 font-serif text-sm ${colour.bg} ${colour.text} ${colour.ring}`}
      >
        {initials(member.fullName)}
      </div>

      {/* details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{member.fullName}</p>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-[#91cbb7]/10 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#91cbb7]">
              You
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-white/40">
          Joined {prettyDate(member.joinedAt)}
        </p>
      </div>

      {/* role badge */}
      <RoleBadge role={member.role} />
    </li>
  );
}

/* ── loading skeleton ──────────────────────────────────────────────── */
function MemberSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-4 animate-pulse">
      <div className="size-11 shrink-0 rounded-full bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 rounded bg-white/[0.06]" />
        <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
      </div>
      <div className="h-5 w-14 rounded-full bg-white/[0.05]" />
    </li>
  );
}

/* ── main component ────────────────────────────────────────────────── */
export type TripMembersProps = {
  members: TripMember[];
  currentUserId: string | null;
  membersLoading: boolean;
  membersError: string;
  onRetry: () => void;
};

export default function TripMembers({
  members,
  currentUserId,
  membersLoading,
  membersError,
  onRetry,
}: TripMembersProps) {
  /* deduplicate by userId, preferring first occurrence (Owner sorts first from SP) */
  const uniqueMembers = useMemo(() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      if (seen.has(m.userId)) return false;
      seen.add(m.userId);
      return true;
    });
  }, [members]);

  const activeMembers = useMemo(
    () => uniqueMembers.filter((m) => m.status.toLowerCase() === "active"),
    [uniqueMembers],
  );

  /* owner first, then by join date ascending (mirrors SP ORDER BY) */
  const orderedMembers = useMemo(
    () =>
      [...activeMembers].sort(
        (a, b) =>
          Number(b.role.toLowerCase() === "owner") -
          Number(a.role.toLowerCase() === "owner"),
      ),
    [activeMembers],
  );

  const totalCount = uniqueMembers.length;
  const activeCount = activeMembers.length;

  /* ── loading ──────────────────────────────────────────────────────── */
  if (membersLoading) {
    return (
      <section className={panel}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl">Trip Members</h2>
          <span className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
        </div>
        <p className="mt-2 text-xs text-white/35">Loading travel crew…</p>
        <ul className="mt-5 divide-y divide-white/[0.05]">
          {Array.from({ length: 3 }).map((_, i) => (
            <MemberSkeleton key={i} />
          ))}
        </ul>
      </section>
    );
  }

  /* ── error ────────────────────────────────────────────────────────── */
  if (membersError) {
    return (
      <section className={panel}>
        <h2 className="font-serif text-xl">Trip Members</h2>
        <div className="mt-5 rounded-xl border border-[#df947f]/20 bg-[#df947f]/[0.06] p-5 text-center">
          <p className="text-sm text-[#f0b4a3]">{membersError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full border border-[#df947f]/30 px-5 py-2 text-xs text-[#f0b4a3] transition hover:bg-[#df947f]/10"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  /* ── empty ────────────────────────────────────────────────────────── */
  if (activeCount === 0) {
    return (
      <section className={panel}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl">Trip Members</h2>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/40">
            0 members
          </span>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-white/50">
            No active members yet.
          </p>
          <p className="mt-1.5 text-xs text-white/30">
            Invite friends to start your travel crew.
          </p>
        </div>
      </section>
    );
  }

  /* ── success ──────────────────────────────────────────────────────── */
  return (
    <section className={panel}>
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl">Trip Members</h2>
          <p className="mt-1 text-xs text-white/35">
            Everyone on this journey, in one place.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/55">
          {activeCount}
          {totalCount !== activeCount ? ` / ${totalCount}` : ""}{" "}
          {activeCount === 1 ? "member" : "members"}
        </span>
      </div>

      {/* member list */}
      <ul className="mt-5 divide-y divide-white/[0.05]">
        {orderedMembers.map((member) => (
          <MemberCard
            key={member.userId}
            member={member}
            isCurrentUser={currentUserId === member.userId}
          />
        ))}
      </ul>
    </section>
  );
}

