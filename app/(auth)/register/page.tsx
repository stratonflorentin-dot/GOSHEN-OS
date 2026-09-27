"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Leaf, MapPinned, ShieldCheck, Sprout } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: fullName.trim(),
      });
      if (result.error) {
        const code = result.error.code;
        setError(
          code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "An account with this email already exists. Sign in instead."
            : code === "PASSWORD_TOO_SHORT"
              ? "Choose a password with at least 8 characters."
              : code === "PASSWORD_TOO_LONG"
                ? "Choose a password with no more than 72 characters."
                : code === "INVALID_EMAIL"
                  ? "Enter a valid email address."
                  : "We couldn't create your account. Please try again.",
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the sign-up service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f2] text-[#17231c] dark:bg-[#0b120e] dark:text-[#e6eee8]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] p-0 sm:p-5 lg:p-8">
        <section className="relative hidden flex-1 flex-col justify-between overflow-hidden rounded-[28px] bg-[#123c2b] p-10 text-white lg:flex xl:p-14">
          <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
            <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
              <defs><pattern id="field-lines" width="84" height="84" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><path d="M0 0H84M0 18H84M0 36H84M0 54H84M0 72H84" fill="none" stroke="white" strokeOpacity=".18" strokeWidth="1" /></pattern></defs>
              <rect width="800" height="900" fill="url(#field-lines)" />
              <path d="M-80 680C100 520 210 790 390 620S640 470 900 560M-70 760C120 600 220 870 430 690S680 560 900 650M-60 840C140 690 260 940 470 770S710 650 920 740" fill="none" stroke="#b5d3a7" strokeOpacity=".45" strokeWidth="2" />
            </svg>
            <div className="absolute -right-24 -top-24 h-[440px] w-[440px] rounded-full bg-emerald-300/15 blur-3xl" />
            <div className="absolute -bottom-36 -left-24 h-[440px] w-[440px] rounded-full bg-lime-200/10 blur-3xl" />
          </div>

          <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10"><Leaf className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold tracking-[.16em]">GOSHEN OS</span><span className="mt-0.5 block text-xs text-emerald-100/75">Agricultural operations</span></span>
          </Link>

          <div className="relative z-10 max-w-xl py-12">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs font-medium text-emerald-50"><Sprout className="h-3.5 w-3.5" /> A clearer view of your operation</p>
            <h2 className="max-w-lg text-4xl font-semibold leading-[1.12] tracking-tight xl:text-[52px]">Bring every part of your farm into focus.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/75">Plan field work, map your land, and keep your team’s records in one dependable workspace.</p>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-black/10 p-4"><MapPinned className="h-5 w-5 text-emerald-200" /><p className="mt-4 text-sm font-semibold">Land & boundaries</p><p className="mt-1 text-xs leading-5 text-emerald-50/65">Keep farm locations and field boundaries together.</p></div>
              <div className="rounded-2xl border border-white/15 bg-black/10 p-4"><ShieldCheck className="h-5 w-5 text-emerald-200" /><p className="mt-4 text-sm font-semibold">One secure workspace</p><p className="mt-1 text-xs leading-5 text-emerald-50/65">Your operation’s records, organized in one place.</p></div>
            </div>
          </div>
          <p className="relative z-10 text-xs text-emerald-50/55">Built for the people who grow our future.</p>
        </section>

        <section className="flex w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-[520px] lg:shrink-0 lg:px-12 xl:w-[600px] xl:px-16">
          <div className="w-full max-w-[400px]">
            <Link href="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#155337] text-white"><Leaf className="h-5 w-5" /></span><span className="text-sm font-bold tracking-[.14em]">GOSHEN OS</span></Link>
            <div className="mb-8">
              <p className="eyebrow text-primary-700 dark:text-primary-200">Get started</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[34px]">Create your account</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Start a workspace for your farm and team.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label htmlFor="fullName" className="text-[13px]">Full name</Label>
                <Input id="fullName" autoComplete="name" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1 h-12 rounded-xl border-border bg-card px-3.5" />
              </div>
              <div>
                <Label htmlFor="email" className="text-[13px]">Work email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@farm.com" className="mt-1 h-12 rounded-xl border-border bg-card px-3.5" />
              </div>
              <div>
                <Label htmlFor="password" className="text-[13px]">Password</Label>
                <div className="relative mt-1">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-12 rounded-xl border-border bg-card px-3.5 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Use 8–72 characters.</p>
              </div>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" className="h-12 w-full justify-between rounded-xl px-4 font-semibold" disabled={pending}>
                <span>{pending ? "Creating your account…" : "Create account"}</span><ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">Your account gives your farm team one place to organize daily operations.</p>
            </form>

            <div className="my-7 flex items-center gap-4"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or</span><span className="h-px flex-1 bg-border" /></div>
            <Link href="/" className="flex h-11 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted">Continue without an account</Link>
            <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-200">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
