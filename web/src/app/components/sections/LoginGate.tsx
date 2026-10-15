"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function LoginGate() {
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
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="account"
      className="relative bg-[#0b1212] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
    >
      <div className="section-gold-glow absolute inset-0 pointer-events-none" />

      <div
        ref={contentRef}
        className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12 relative z-10 transform-gpu"
      >
        {/* Blurred background preview card */}
        <div className="relative rounded-[24px] overflow-hidden border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Fake blurred preview behind */}
          <div className="p-8 md:p-14 lg:p-20 filter blur-[8px] pointer-events-none select-none opacity-25 bg-white/[0.01]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                />
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                />
              ))}
            </div>
          </div>

          {/* Dark overlay with lock and login options */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1212]/85 via-[#0b1212]/95 to-[#0b1212]/85 backdrop-blur-sm flex flex-col items-center justify-center px-6">
            <div className="max-w-md text-center flex flex-col items-center gap-6">
              {/* Lock icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#91cbb7]/[0.08] border border-[#91cbb7]/20 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#91cbb7]"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Login to see the full experience
              </h3>
              <p className="text-sm text-white/50 leading-relaxed font-normal">
                Access your dashboard, manage active trips, split expenses, and settle up with your crew.
              </p>

              {/* Auth buttons */}
              <div className="flex flex-col gap-3.5 w-full max-w-xs mt-2">
                <a
                  id="login-gate-signup"
                  href="/auth?mode=signup"
                  className="w-full py-3.5 px-6 text-sm font-semibold text-black bg-[#91cbb7] hover:bg-[#6e9d8e] rounded-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(145,203,183,0.3)]"
                >
                  Sign up
                </a>

                <a
                  id="login-gate-login"
                  href="/auth?mode=login"
                  className="w-full py-2.5 px-6 text-sm font-medium text-white/50 hover:text-white transition-colors duration-300"
                >
                  Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
