"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For Trips", href: "#for-trips" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const updateScrollAppearance = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const progress = reduceMotion.matches ? 0 : Math.min(1, Math.max(0, window.scrollY / 520));
        const nav = navRef.current;
        nav?.style.setProperty("--nav-scroll-progress", String(progress));
        nav?.style.setProperty("--nav-opacity", String(1 - progress * 0.16));
        nav?.style.setProperty("--nav-bg-alpha", String(0.94 - progress * 0.42));
        nav?.style.setProperty("--nav-blur", `${14 - progress * 4}px`);
      });
    };
    updateScrollAppearance();
    window.addEventListener("scroll", updateScrollAppearance, { passive: true });
    reduceMotion.addEventListener("change", updateScrollAppearance);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollAppearance);
      reduceMotion.removeEventListener("change", updateScrollAppearance);
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <nav
      ref={navRef}
      id="navbar"
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12">
        <div className="flex h-14 items-center justify-between lg:h-14">
          {/* Logo */}
          <Link
            href="/"
            id="logo"
            className="flex items-center gap-2 select-none"
          >
            <span className="text-lg font-bold tracking-[0.2em] uppercase text-white">
              Paisa
            </span>
            <span className="text-lg font-bold tracking-[0.2em] uppercase text-[#91cbb7]">
              Matters
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                id={`nav-${link.href.replace("#", "")}`}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="/auth?mode=login"
              id="nav-login"
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors duration-300"
            >
              Login
            </a>
            <a
              href="/auth?mode=signup"
              id="nav-signup"
              className="px-6 py-2.5 text-sm font-semibold text-black bg-[#91cbb7] hover:bg-[#6e9d8e] rounded-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(145,203,183,0.3)] hover:scale-[1.02]"
            >
              Sign Up
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            type="button"
            className="lg:hidden flex flex-col gap-1.5 p-2"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span
              className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-[4.5px]" : ""
              }`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-white/70 transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-[4.5px]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-navigation"
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="bg-[#0b1212]/95 backdrop-blur-xl border-t border-white/[0.04] px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 text-sm font-medium text-white/60 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <a
              href="/auth?mode=login"
              className="px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white text-center transition-colors"
            >
              Login
            </a>
            <a
              href="/auth?mode=signup"
              className="px-4 py-2.5 text-sm font-semibold text-black bg-[#91cbb7] hover:bg-[#6e9d8e] rounded-full text-center transition-all"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

