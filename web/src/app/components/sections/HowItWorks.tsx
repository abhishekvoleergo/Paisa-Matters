"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    number: "01",
    title: "Create a Trip",
    description:
      "Start a new trip in seconds. Add your friends, set a name, and you're ready to roll.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Log Expenses",
    description:
      "Whenever someone pays for the group, log it with one tap. PaisaMatters remembers everything.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "See the Balance",
    description:
      "Instantly see who owes whom. PaisaMatters calculates the optimal way to settle debts.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
        <path d="M12 6v2m0 8v2" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Settle Up",
    description:
      "Pay your friends directly or record external payments. Everyone stays on the same page.",
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!contentRef.current || !sectionRef.current) return;

      // Section Entrance — smooth emerge from pure darkness
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

      // Section Exit — clean fade out to zero opacity
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
      id="how-it-works"
      className="relative bg-[#050505] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
    >
      {/* Soft atmospheric background glow */}
      <div className="section-gold-glow absolute inset-0 pointer-events-none" />

      <div
        ref={contentRef}
        className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12 relative z-10 transform-gpu"
      >
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[#d4a853] mb-3">
            01 / HOW IT WORKS
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white text-center">
            How PaisaMatters Works
          </h2>
          <p className="mt-4 max-w-[600px] mx-auto text-sm sm:text-base text-white/50 leading-relaxed text-center">
            Four simple steps from trip creation to settlement.
            <br className="hidden sm:inline" /> No spreadsheets. No arguments.
          </p>
        </div>

        {/* Steps grid — 4 equal width cards */}
        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              data-step-card
              className="w-full min-w-0 group relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1"
            >
              {/* Step number */}
              <span className="text-[11px] font-mono tracking-widest text-[#d4a853]/70 mb-5 block font-medium">
                {step.number}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#d4a853]/[0.08] border border-[#d4a853]/15 flex items-center justify-center text-[#d4a853] mb-5 group-hover:bg-[#d4a853]/[0.15] group-hover:border-[#d4a853]/30 transition-all duration-300">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
