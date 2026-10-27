import Link from "next/link";
import type { ReactNode } from "react";

const exploreLinks = [
  ["How it works", "#how-it-works"],
  ["For Trips", "#for-trips"],
  ["Features", "#features"],
  ["Pricing", "#pricing"],
];

const unavailableLinks = ["Support", "Privacy", "Terms", "Contact"];

export default function Footer() {
  return (
    <footer className="site-footer relative w-full overflow-hidden bg-[#11131b] text-[#f4f0e8]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_75%_0%,rgba(155,223,225,0.08),transparent_65%)]" />
      <div className="site-footer-inner relative mx-auto max-w-[1400px] px-6 md:px-10 lg:px-12">
        <section className="footer-cta grid gap-7 border-b border-white/10 py-12 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.25em] text-[#9bdfe1]">PAISAMATTERS / TRAVEL TOGETHER</p>
            <h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl">The trip is better when the money feels simple.</h2>
          </div>
          <Link href="/auth?mode=signup" className="inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-[#9bdfe1] px-6 text-sm font-semibold text-[#11131b] transition hover:bg-[#c9f3f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c1b5ef]">
            Start a trip <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8 lg:py-12">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center text-base font-bold uppercase tracking-[0.16em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c1b5ef]">
              Paisa<span className="text-[#9bdfe1]">Matters</span>
            </Link>
            <p className="mt-4 max-w-[260px] text-sm leading-6 text-white/55">Fair splits, clear balances, and more time for the journey.</p>
          </div>

          <FooterColumn title="Explore">
            {exploreLinks.map(([label, href]) => <Link key={href} href={href} className="footer-link">{label}</Link>)}
          </FooterColumn>
          <FooterColumn title="Account">
            <Link href="/auth?mode=signup" className="footer-link">Create account</Link>
            <Link href="/auth?mode=login" className="footer-link">Log in</Link>
            <Unavailable label="Support" />
          </FooterColumn>
          <FooterColumn title="Legal">
            {unavailableLinks.slice(1).map((label) => <Unavailable key={label} label={label} />)}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-5 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PaisaMatters. Built for shared journeys.</p>
          <p className="tracking-[0.14em] text-white/35">MAKE THE MEMORIES. WE&apos;LL HANDLE THE MATH.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return <nav aria-label={title} className="flex flex-col items-start gap-3">
    <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">{title}</h2>
    {children}
  </nav>;
}

function Unavailable({ label }: { label: string }) {
  return <span className="flex items-baseline gap-2 text-sm text-white/45" aria-label={`${label} — not available yet`}>
    {label}<span className="text-[9px] text-white/30">Coming soon</span>
  </span>;
}


