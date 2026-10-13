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
      id="login"
      className="relative bg-[#050505] min-h-screen flex flex-col justify-center py-24 sm:py-32 overflow-hidden z-20"
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/85 via-[#050505]/95 to-[#050505]/85 backdrop-blur-sm flex flex-col items-center justify-center px-6">
            <div className="max-w-md text-center flex flex-col items-center gap-6">
              {/* Lock icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#d4a853]/[0.08] border border-[#d4a853]/20 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#d4a853]"
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
                <button
                  id="login-gate-google"
                  className="flex items-center justify-center gap-3 w-full py-3.5 px-6 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 rounded-full transition-all duration-300"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  id="login-gate-signup"
                  className="w-full py-3.5 px-6 text-sm font-semibold text-black bg-[#d4a853] hover:bg-[#c49a48] rounded-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(212,168,83,0.35)]"
                >
                  Sign up
                </button>

                <button
                  id="login-gate-login"
                  className="w-full py-2.5 px-6 text-sm font-medium text-white/50 hover:text-white transition-colors duration-300"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
