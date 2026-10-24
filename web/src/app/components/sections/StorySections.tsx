"use client";

import { useEffect } from "react";

const steps = [["01", "Create a trip", "Your people, one shared journey."], ["02", "Log expenses", "Say what was paid, naturally."], ["03", "See the balance", "Every share, clear at a glance."], ["04", "Settle up", "The fewest payments possible."]];

export default function StorySections() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting)), { threshold: 0.18 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(".hero-scene, .editorial-section"));
    const updateScene = () => {
      const center = window.innerHeight * 0.5;
      const active = scenes.reduce<HTMLElement | null>((nearest, scene) => {
        const bounds = scene.getBoundingClientRect();
        if (bounds.top <= center && bounds.bottom >= center) return scene;
        if (!nearest) return scene;
        const nearestBounds = nearest.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - center) < Math.abs(nearestBounds.top + nearestBounds.height / 2 - center) ? scene : nearest;
      }, null);
      if (active) document.documentElement.dataset.scene = active.dataset.scene || active.id || (active.classList.contains("ai-section") ? "voice" : active.classList.contains("payment-section") ? "payment-section" : "hero");
    };
    const sceneObserver = new IntersectionObserver(updateScene, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    scenes.forEach((scene) => sceneObserver.observe(scene));
    window.addEventListener("resize", updateScene, { passive: true });
    updateScene();
    return () => {
      observer.disconnect();
      sceneObserver.disconnect();
      window.removeEventListener("resize", updateScene);
      delete document.documentElement.dataset.scene;
    };
  }, []);
  return <>
    <section id="how-it-works" className="editorial-section how-section"><div className="section-kicker">01 — THE ROUTE</div><div className="reveal"><h2>How PaisaMatters<br /><em>works.</em></h2><p className="section-intro">Four simple steps from trip creation to settlement. No spreadsheets. No arguments.</p></div><div className="route-line reveal">{steps.map(([number,title,copy]) => <article key={number} className="route-step"><span>{number}</span><div className="route-dot" /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section id="for-trips" className="editorial-section expense-section"><div className="section-kicker">02 — ON THE ROAD</div><div className="expense-copy reveal"><h2>The trip is easy.<br /><em>The math isn&apos;t.</em></h2><p>Every dinner, detour, and late-night cab — collected in one calm, shared place.</p></div><div className="expense-stage reveal"><div className="paper-card hotel"><small>STAY / 02 NIGHTS</small><b>HOTEL</b><strong>₹6,000</strong></div><div className="paper-card fuel"><small>NH 48 / 07:30</small><b>FUEL</b><strong>₹3,200</strong></div><div className="paper-card dinner"><small>TABLE 12 / 21:14</small><b>DINNER</b><strong>₹2,400</strong></div><span className="scribble">all part of<br />the story ↗</span></div></section>
    <section id="features" className="editorial-section split-section"><div className="split-top reveal"><div><div className="section-kicker">03 — FAIR BY DESIGN</div><h2>Everyone pays.<br /><em>Nobody keeps score.</em></h2></div><p>A single expense becomes a clean, shared moment. No mental arithmetic required.</p></div><div className="split-board reveal"><div className="receipt"><small>DINNER / SPLIT EQUALLY</small><b>₹2,400</b><span>Paid by Rahul</span></div><div className="split-arrow">÷</div><div className="people"><p><i>R</i> Rahul <strong>₹800</strong></p><p><i>A</i> Abhi <strong>₹800</strong></p><p><i>A</i> Arun <strong>₹800</strong></p></div></div></section>
    <section className="editorial-section ai-section"><div className="ai-panel reveal"><div className="section-kicker">04 — SPEAK NATURALLY</div><h2>Just say<br /><em>what happened.</em></h2><div className="voice-line"><span>✦</span> Rahul paid ₹2400 for dinner for me, Rahul and Arun.</div><div className="parsed"><small>UNDERSTOOD</small><b>Dinner <strong>₹2,400</strong></b><p>Paid by Rahul · split between 3 people</p></div></div></section>
    <section id="pricing" className="editorial-section settle-section"><div className="section-kicker">05 — CLEAR THE TAB</div><div className="settle-layout reveal"><div><h2>We do<br /><em>the math.</em></h2><p>One useful route from a tangled group bill to a few simple payments.</p></div><div className="settlement"><div className="balance-row"><span>Abhi</span><b>−₹250</b></div><div className="balance-row"><span>Rahul</span><b className="positive">+₹500</b></div><div className="balance-row"><span>Adish</span><b>−₹250</b></div><div className="payment"><span>Abhi</span><i>→</i><span>Rahul</span><strong>₹250</strong></div><div className="payment"><span>Adish</span><i>→</i><span>Rahul</span><strong>₹250</strong></div></div></div></section>
    <section className="editorial-section payment-section"><div className="section-kicker">06 — RIGHT HERE</div><div className="payment-layout reveal"><div><h2>Settle it.<br /><em>Right here.</em></h2><p>When the road ends, there&apos;s one less thing to carry home.</p></div><div className="phone"><div className="phone-top">PAISAMATTERS <span>•••</span></div><small>YOU OWE ADISH</small><b>₹250</b><div className="phone-rule"/><p>Weekend in Coorg</p><button>Pay ₹250 <i>↗</i></button></div></div></section>
  </>;
}
