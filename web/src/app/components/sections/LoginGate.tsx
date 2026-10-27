import Link from "next/link";

export default function LoginGate() {
  return (
    <section id="account" className="login-gate relative z-20 flex min-h-screen items-center overflow-hidden bg-[#11131b] py-20 text-[#f4f0e8] sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_45%,rgba(155,223,225,0.09),transparent_45%),radial-gradient(ellipse_at_14%_80%,rgba(193,181,239,0.07),transparent_40%)]" />
      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-10 px-6 md:px-10 lg:grid-cols-[1fr_0.8fr] lg:gap-16 lg:px-12">
        <div className="max-w-2xl">
          <p className="mb-5 font-mono text-[10px] font-semibold tracking-[0.25em] text-[#9bdfe1]">READY FOR THE NEXT TRIP?</p>
          <h2 className="font-serif text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">Give the group one less thing <em className="text-[#c1b5ef]">to figure out.</em></h2>
          <p className="mt-6 max-w-lg text-sm leading-7 text-white/60">Bring trip plans and shared expenses together, so everyone can enjoy the journey.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link id="login-gate-signup" href="/auth?mode=signup" className="inline-flex min-h-12 items-center rounded-full bg-[#9bdfe1] px-6 text-sm font-semibold text-[#11131b] transition hover:bg-[#c9f3f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c1b5ef]">Create your account <span className="ml-3" aria-hidden="true">↗</span></Link>
            <Link id="login-gate-login" href="/auth?mode=login" className="inline-flex min-h-12 items-center rounded-full border border-white/15 px-6 text-sm font-medium text-white/75 transition hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c1b5ef]">Log in</Link>
          </div>
        </div>
        <div aria-hidden="true" className="relative mx-auto grid aspect-square w-full max-w-[390px] place-items-center">
          <div className="absolute inset-[8%] rounded-full border border-[#c1b5ef]/20 shadow-[0_0_0_26px_rgba(193,181,239,.025),0_0_0_58px_rgba(155,223,225,.018)]" />
          <div className="absolute inset-[24%] rounded-full border border-[#9bdfe1]/25" />
          <div className="relative w-[68%] rounded-2xl border border-white/15 bg-[#1b202b]/90 p-5 shadow-[0_28px_75px_rgba(0,0,0,.32)] backdrop-blur-md">
            <div className="flex items-center justify-between text-[9px] tracking-[0.16em] text-white/45"><span>WEEKEND IN COORG</span><span className="text-[#9bdfe1]">● ● ●</span></div>
            <div className="mt-6 border-t border-white/10 pt-4"><div className="flex justify-between text-xs text-white/65"><span>Shared dinner</span><span>₹2,400</span></div><div className="mt-4 flex justify-between text-xs text-white/65"><span>Each person</span><span className="text-[#9bdfe1]">₹800</span></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
