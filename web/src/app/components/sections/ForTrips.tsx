"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const TRIP_FEATURES = [
  {
    number: "01",
    title: "Group Budgets",
    description:
      "Set budgets for your trip and track spending in real-time. Never overspend again.",
  },
  {
    number: "02",
    title: "Multi-Currency",
    description:
      "Travelling abroad? PaisaMatters handles currency conversions automatically.",
  },
  {
    number: "03",
    title: "Photo Receipts",
    description:
      "Snap a photo of the receipt and attach it to the expense. Proof is always there.",
  },
  {
    number: "04",
    title: "Trip Timeline",
    description:
      "A beautiful timeline of all expenses during your trip. Relive the memories.",
  },
  {
    number: "05",
    title: "Offline Mode",
    description:
      "No signal in the mountains? Log expenses offline and sync when you're back.",
  },
  {
    number: "06",
    title: "Smart Split",
    description:
      "Split equally, by percentage, by shares, or exact amounts. Your rules.",
  },
];

export default function ForTrips() {
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
      id="for-trips"
      className="relative bg-[#0b1212] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
    >
      {/* Soft atmospheric background glow */}
      <div className="section-gold-glow absolute inset-0 pointer-events-none" />

      <div
        ref={contentRef}
        className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12 relative z-10 transform-gpu"
      >
        <div className="text-center mb-16 md:mb-20">
          <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[#91cbb7] mb-3">
            02 / BUILT FOR ADVENTURE
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Everything You Need for Group Trips
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-white/50 leading-relaxed">
            Whether it&apos;s a weekend getaway or a month-long expedition.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {TRIP_FEATURES.map((feature) => (
            <div
              key={feature.title}
              data-trip-card
              className="group relative overflow-hidden p-7 rounded-[20px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#91cbb7]/35 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1"
            >
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#91cbb7]/25 bg-[#91cbb7]/[0.08] text-[11px] font-semibold tracking-[0.15em] text-[#91cbb7] transition-colors duration-300 group-hover:bg-[#91cbb7] group-hover:text-black">
                {feature.number}
              </span>
              <h3 className="text-lg font-semibold text-white mb-2.5">
                {feature.title}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed font-normal">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
