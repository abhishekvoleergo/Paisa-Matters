"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    title: "Real-time Sync",
    description:
      "All changes sync instantly across everyone's devices. No refresh needed.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9" />
      </svg>
    ),
  },
  {
    title: "Smart Reminders",
    description:
      "Gentle nudges to friends who haven't settled up. No awkward conversations.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    title: "Expense Categories",
    description:
      "Auto-categorize food, transport, stays, and activities. Visual breakdowns.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    ),
  },
  {
    title: "Export Reports",
    description:
      "Download detailed CSV or PDF reports of all trip expenses anytime.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!contentRef.current || !sectionRef.current) return;

      // Section Entrance
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          filter: "blur(12px)",
          y: 40,
        },
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            end: "top 35%",
            scrub: 1,
          },
        }
      );

      // Section Exit
      gsap.to(contentRef.current, {
        opacity: 0,
        filter: "blur(8px)",
        y: -30,
        ease: "power2.in",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "bottom 60%",
          end: "bottom 20%",
          scrub: 1,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative bg-[#050505] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
    >
      <div className="section-gold-glow absolute inset-0 pointer-events-none" />

      <div
        ref={contentRef}
        className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12 relative z-10 transform-gpu"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left — text storytelling */}
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[#d4a853] mb-3">
              03 / POWERFUL FEATURES
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.15]">
              Built for the
              <br />
              <span className="text-[#d4a853]">Real World</span>
            </h2>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-md">
              Every feature in PaisaMatters exists because we&apos;ve been on those
              trips. We know the pain points, lost receipts, and awkward conversations.
            </p>
          </div>

          {/* Right — feature list */}
          <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group flex gap-5 p-6 rounded-[20px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#d4a853]/[0.08] border border-[#d4a853]/15 flex items-center justify-center text-[#d4a853] group-hover:bg-[#d4a853]/[0.15] transition-colors duration-500">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/45 leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
