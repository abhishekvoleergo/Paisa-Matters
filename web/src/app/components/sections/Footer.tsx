export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0b1212] px-4 pb-4 pt-20 sm:px-6 sm:pb-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[460px] bg-[radial-gradient(ellipse_at_bottom,rgba(145,203,183,0.09),transparent_62%)]" />
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#111c1d] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 border-b border-white/[0.08] px-6 py-10 sm:px-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:px-14 lg:py-14">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.28em] text-[#91cbb7]">PAISAMATTERS / TRAVEL TOGETHER</p>
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The trip is better when the money feels simple.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <a href="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-full border border-[#91cbb7]/40 bg-[#91cbb7] px-6 py-3 text-sm font-semibold text-black transition-all duration-300 hover:scale-[1.02] hover:bg-[#6e9d8e]">
              Start a trip <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="grid gap-10 px-6 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-14 lg:py-14">
          <div className="max-w-xs">
            <a href="#" className="inline-flex items-center gap-2 text-base font-bold uppercase tracking-[0.18em] text-white">
              Paisa <span className="text-[#91cbb7]">Matters</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Fair splits, clear balances, and more time for the journey.
            </p>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-white/35">EXPLORE</p>
            <div className="flex flex-col gap-3">
              {["How it works", "For Trips", "Features", "Pricing"].map((link) => (
                <a key={link} href={link === "How it works" ? "https://youtu.be/thXUz7isjfc?si=PksxUcOnV9_cPiYf" : `#${link.toLowerCase().replaceAll(" ", "-")}`} target={link === "How it works" ? "_blank" : undefined} rel={link === "How it works" ? "noopener noreferrer" : undefined} className="text-sm text-white/60 transition-colors hover:text-[#91cbb7]">
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-white/35">ACCOUNT</p>
            <div className="flex flex-col gap-3">
              <a href="/auth?mode=signup" className="text-sm text-white/60 transition-colors hover:text-[#91cbb7]">Create account</a>
              <a href="/auth?mode=login" className="text-sm text-white/60 transition-colors hover:text-[#91cbb7]">Log in</a>
              <a href="#support" className="text-sm text-white/60 transition-colors hover:text-[#91cbb7]">Support</a>
            </div>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-white/35">LEGAL</p>
            <div className="flex flex-col gap-3">
              {["Privacy", "Terms", "Contact"].map((link) => (
                <a key={link} href={`#${link.toLowerCase()}`} className="text-sm text-white/60 transition-colors hover:text-[#91cbb7]">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] px-6 py-5 text-[11px] text-white/30 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14">
          <p>© {new Date().getFullYear()} PaisaMatters. Built for shared journeys.</p>
          <p className="tracking-[0.16em] text-white/20">MAKE THE MEMORIES. WE&apos;LL HANDLE THE MATH.</p>
        </div>
      </div>
    </footer>
  );
}


