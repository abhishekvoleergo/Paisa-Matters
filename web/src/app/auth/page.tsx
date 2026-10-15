"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, getCurrentUser } from "@/lib/api";

type Mode = "login" | "signup";
type AccessMode = "User" | "Admin";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [accessMode, setAccessMode] = useState<AccessMode>("User");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const sync = () => {
      const queryMode = new URLSearchParams(window.location.search).get("mode");
      setMode(queryMode === "signup" ? "signup" : "login");
      setReady(true);
    };
    sync();
    window.addEventListener("popstate", sync);
    void getCurrentUser().then(() => router.replace("/home")).catch(() => undefined);
    return () => window.removeEventListener("popstate", sync);
  }, [router]);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    const url = new URL(window.location.href);
    url.searchParams.set("mode", next);
    window.history.pushState({}, "", url);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("login-email") || "").trim().toLowerCase();
    const password = String(data.get("login-password") || "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) { setError("Enter a valid email and password."); return; }
    setBusy(true);
    try {
      await apiRequest("auth/login", { method: "POST", body: JSON.stringify({ email, password, accessMode }) });
      router.replace("/home");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("full-name") || "").trim();
    const email = String(data.get("signup-email") || "").trim().toLowerCase();
    const password = String(data.get("signup-password") || "");
    const confirm = String(data.get("confirm-password") || "");
    if (!fullName || !email || !password || !confirm) { setError("Complete all fields to create your account."); return; }
    if (fullName.length > 150) { setError("Your name must be 150 characters or fewer."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError("Use 10–128 characters with at least one letter and one number."); return; }
    if (password !== confirm) { setError("The passwords don’t match."); return; }
    setBusy(true);
    try {
      await apiRequest("auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) });
      router.replace("/home");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Account creation failed. Please try again."); }
    finally { setBusy(false); }
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-[#f4eee4] outline-none transition placeholder:text-white/30 focus:border-[#d4a853]/70 focus:ring-2 focus:ring-[#d4a853]/15";
  const labelClass = "mb-2 block text-xs font-medium tracking-wide text-white/70";
  const inactive = !ready;
  const accessSwitch = (
    <div className="mt-5 flex justify-center" role="group" aria-label="Access mode">
      {(["User", "Admin"] as AccessMode[]).map((option) => <button key={option} type="button" onClick={() => mode === "login" && setAccessMode(option)} disabled={mode === "signup" && option === "Admin"} aria-pressed={accessMode === option} className={`min-w-28 border border-white/10 px-5 py-2.5 text-xs transition first:rounded-l-full last:rounded-r-full ${accessMode === option ? "bg-[#d4a853] font-semibold text-[#100d08]" : "bg-white/[0.03] text-white/55 hover:text-white"} disabled:cursor-not-allowed disabled:opacity-40`}>{option}</button>)}
    </div>
  );

  return (
    <main className="auth-scene min-h-screen overflow-x-hidden px-5 py-8 text-[#f4eee4] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-white">Paisa<span className="text-[#d4a853]">Matters</span></Link>
          <Link href="/" className="text-xs text-white/50 transition hover:text-white">Back to home</Link>
        </header>
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_0.92fr] lg:gap-20">
          <section className="mx-auto max-w-lg lg:mx-0">
            <p className="mb-5 font-mono text-[10px] tracking-[0.3em] text-[#d4a853]">TRAVEL TOGETHER · SETTLE FAIRLY</p>
            <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Good trips begin<br /><em className="text-[#d4a853]">with a clear plan.</em></h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/55">Keep the group in sync, split costs fairly, and spend more of the journey making memories.</p>
            <div className="mt-10 hidden grid-cols-3 gap-3 sm:grid">
              {["Shared plans", "Fair splits", "Clear balances"].map((item, index) => <div key={item} className="border-t border-[#d4a853]/35 pt-3"><span className="font-mono text-[10px] text-[#d4a853]/70">0{index + 1}</span><p className="mt-2 text-xs text-white/65">{item}</p></div>)}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[440px]" aria-label="Account access">
            <div className="auth-card-perspective">
              <div className={`auth-card ${mode === "signup" ? "is-flipped" : ""}`}>
                <article aria-hidden={mode !== "login"} inert={mode !== "login"} className="auth-face rounded-[26px] border border-white/10 bg-[#0c0b09]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-9">
                  <p className="font-mono text-[10px] tracking-[0.25em] text-[#d4a853]">WELCOME BACK</p>
                  <h2 className="mt-3 font-serif text-3xl">Log in</h2>
                  <p className="mt-2 text-xs text-white/45">Pick up where your next journey starts.</p>
                  <form className="mt-7 space-y-4" onSubmit={login} noValidate>
                    <div><label className={labelClass} htmlFor="login-email">Email</label><input className={inputClass} id="login-email" name="login-email" type="email" autoComplete="email" maxLength={256} required placeholder="you@example.com" /></div>
                    <div><label className={labelClass} htmlFor="login-password">Password</label><div className="relative"><input className={`${inputClass} pr-16`} id="login-password" name="login-password" type={showLoginPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Your password" /><button type="button" className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label={showLoginPassword ? "Hide password" : "Show password"}>{showLoginPassword ? "Hide" : "Show"}</button></div></div>
                    {error && <p role="alert" className="rounded-lg border border-[#e58e62]/30 bg-[#e58e62]/[0.08] px-3 py-2 text-xs text-[#ffc3a4]">{error}</p>}
                    <button disabled={busy || inactive} className="w-full rounded-full bg-[#d4a853] px-5 py-3.5 text-sm font-semibold text-[#100d08] transition hover:bg-[#e3bc72] disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Login"}</button>
                  </form>
                  <p className="mt-5 text-center text-xs text-white/45">New to PaisaMatters? <button type="button" onClick={() => changeMode("signup")} className="font-semibold text-[#e0b866] hover:text-white">Create an account</button></p>
                  {accessSwitch}
                </article>
                <article aria-hidden={mode !== "signup"} inert={mode !== "signup"} className="auth-face auth-face-back rounded-[26px] border border-white/10 bg-[#0c0b09]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-9">
                  <p className="font-mono text-[10px] tracking-[0.25em] text-[#d4a853]">YOUR NEXT CHAPTER</p>
                  <h2 className="mt-3 font-serif text-3xl">Create account</h2>
                  <p className="mt-2 text-xs text-white/45">A few details, then you’re ready to go.</p>
                  <form className="mt-6 space-y-3.5" onSubmit={signup} noValidate>
                    <div><label className={labelClass} htmlFor="full-name">Full name</label><input className={inputClass} id="full-name" name="full-name" autoComplete="name" maxLength={150} required placeholder="Your name" /></div>
                    <div><label className={labelClass} htmlFor="signup-email">Email</label><input className={inputClass} id="signup-email" name="signup-email" type="email" autoComplete="email" maxLength={256} required placeholder="you@example.com" /></div>
                    <div><label className={labelClass} htmlFor="signup-password">Password</label><div className="relative"><input className={`${inputClass} pr-16`} id="signup-password" name="signup-password" type={showSignupPassword ? "text" : "password"} autoComplete="new-password" required placeholder="10+ characters" /><button type="button" className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white" onClick={() => setShowSignupPassword(!showSignupPassword)} aria-label={showSignupPassword ? "Hide password" : "Show password"}>{showSignupPassword ? "Hide" : "Show"}</button></div><p className="mt-1 text-[10px] text-white/35">At least 10 characters, including a letter and a number.</p></div>
                    <div><label className={labelClass} htmlFor="confirm-password">Confirm password</label><div className="relative"><input className={`${inputClass} pr-16`} id="confirm-password" name="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required placeholder="Repeat your password" /><button type="button" className="absolute inset-y-0 right-3 text-xs text-white/45 hover:text-white" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}>{showConfirmPassword ? "Hide" : "Show"}</button></div></div>
                    {error && <p role="alert" className="rounded-lg border border-[#e58e62]/30 bg-[#e58e62]/[0.08] px-3 py-2 text-xs text-[#ffc3a4]">{error}</p>}
                    <button disabled={busy || inactive} className="w-full rounded-full bg-[#d4a853] px-5 py-3.5 text-sm font-semibold text-[#100d08] transition hover:bg-[#e3bc72] disabled:cursor-wait disabled:opacity-60">{busy ? "Creating account…" : "Sign up"}</button>
                  </form>
                  <p className="mt-4 text-center text-xs text-white/45">Already have an account? <button type="button" onClick={() => changeMode("login")} className="font-semibold text-[#e0b866] hover:text-white">Login</button></p>
                  {accessSwitch}
                  <p className="mt-2 text-center text-[10px] text-white/35">Public registration creates a standard User account.</p>
                </article>
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] leading-5 text-white/30">By continuing, you agree to use PaisaMatters responsibly with your travel group.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
