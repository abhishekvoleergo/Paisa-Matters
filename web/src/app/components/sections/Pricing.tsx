"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for casual trips with friends.",
    features: [
      "Up to 3 active trips",
      "Unlimited expenses per trip",
      "Basic split options",
      "Settle up reminders",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹99",
    period: "/month",
    description: "For frequent travellers and large groups.",
    features: [
      "Unlimited active trips",
      "Multi-currency support",
      "Photo receipts",
      "Export reports (PDF/CSV)",
      "Smart categories",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "₹249",
    period: "/month",
    description: "For organizations and travel groups.",
    features: [
      "Everything in Pro",
      "Team dashboard",
      "Admin controls",
      "API access",
      "Custom branding",
      "Dedicated support",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

export default function Pricing() {
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
      id="pricing"
      className="relative bg-[#050505] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
    >
      <div className="section-gold-glow absolute inset-0 pointer-events-none" />

      <div
        ref={contentRef}
        className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12 relative z-10 transform-gpu"
      >
        <div className="text-center mb-16 md:mb-20">
          <p className="text-xs font-semibold tracking-[0.35em] uppercase text-[#d4a853] mb-3">
            04 / PRICING
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Simple, Honest Pricing
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-white/50 leading-relaxed">
            Start free, upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-[20px] border transition-all duration-500 hover:-translate-y-1 ${
                plan.highlighted
                  ? "border-[#d4a853]/30 bg-[#d4a853]/[0.04] shadow-[0_0_50px_-10px_rgba(212,168,83,0.15)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 text-[10px] font-bold tracking-[0.2em] uppercase text-black bg-[#d4a853] rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <h3 className="text-sm font-semibold tracking-wider text-white/60 uppercase mb-4">
                {plan.name}
              </h3>

              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-4xl font-bold text-white tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-white/40">{plan.period}</span>
              </div>

              <p className="text-sm text-white/45 mb-8 leading-relaxed">
                {plan.description}
              </p>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-white/60"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={plan.highlighted ? "#d4a853" : "currentColor"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#signup"
                className={`block text-center py-3 text-sm font-semibold rounded-full transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-[#d4a853] text-black hover:bg-[#c49a48] hover:shadow-[0_0_25px_rgba(212,168,83,0.35)]"
                    : "border border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-white/[0.02]"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
