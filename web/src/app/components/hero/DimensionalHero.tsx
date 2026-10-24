"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function DimensionalHero() {
  const visualRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
        visual.style.setProperty("--hero-drift", `${progress * 28}px`);
        visual.style.setProperty("--hero-tilt-x", `${progress * 2.2}deg`);
        visual.style.setProperty("--hero-tilt-y", `${progress * -3.2}deg`);
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <section id="hero" className="hero-scene" aria-label="PaisaMatters introduction">
    <div className="hero-viewport">
      <div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" />
      <div ref={visualRef} className="hero-object" aria-label="A dimensional arrangement of shared trip expenses">
        <div className="hero-object-halo" />
        <div className="hero-expense-card card-back"><small>WEEKEND IN COORG</small><span>You owe Adish</span><b>₹250</b><i>Settle up</i></div>
        <div className="hero-expense-card card-front"><small>DINNER / SPLIT EQUALLY</small><span>Paid by Rahul</span><b>₹2,400</b><i>Split equally <em>✓</em></i></div>
        <div className="hero-coin">₹</div><span className="hero-object-caption">EVERY SHARE, IN ITS PLACE</span>
      </div>
      <div className="hero-content">
        <p className="hero-eyebrow">TRAVEL TOGETHER <span>✳</span> SETTLE FAIRLY</p>
        <h1><span>Every Trip</span><span>Deserves</span><em>Fair Splits</em></h1>
        <p className="hero-description">Track group expenses in real time, settle debts instantly, and keep the adventure stress-free.</p>
        <div className="hero-actions"><Link href="/auth?mode=signup" id="hero-cta-primary" className="hero-button hero-button-primary">Get Started Free <span aria-hidden="true">↗</span></Link><a href="#how-it-works" id="hero-cta-secondary" className="hero-button hero-button-secondary">See How It Works <span aria-hidden="true">↓</span></a></div>
      </div>
      <div className="hero-index" aria-hidden="true"><span>01</span> / SHARED JOURNEYS</div>
      <div className="hero-scroll-cue" aria-hidden="true"><span /> SCROLL TO EXPLORE</div>
    </div>
  </section>;
}
