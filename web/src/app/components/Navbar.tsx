"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it works", href: "https://youtu.be/thXUz7isjfc?si=PksxUcOnV9_cPiYf", external: true },
  { label: "For Trips", href: "#for-trips" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0b1212]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-12">
        <div className="flex h-16 items-center justify-between lg:h-20">
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
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
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
              Sign up
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
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
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#0b1212]/95 backdrop-blur-xl border-t border-white/[0.04] px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
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
              Sign up
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
