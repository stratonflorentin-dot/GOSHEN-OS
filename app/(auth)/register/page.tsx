"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, Eye, EyeOff } from "lucide-react";
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
                  : "We couldn’t create your account. Please try again.",
        );
        return;
      }
      // Email verification is disabled, so successful signup is ready to use.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the sign-up service. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up a secure workspace for your farm.</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Amina Tesha"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <Link href="/" className="mt-3 flex h-11 items-center justify-center rounded-xl border border-[#dfe7df] bg-white text-sm font-semibold text-[#28583a] transition hover:border-[#b9cfbd] hover:bg-[#f8fbf7]">
          Continue without an account
        </Link>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
