"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { buttonVariants } from "@/components/ui/button";
import TextField from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

type LoginCardProps = {
  redirectTo?: string;
  initialMode?: "login" | "signup";
};

const REMEMBER_EMAIL_KEY = "bip.rememberedEmail";

export default function LoginCard({
  redirectTo = "/dashboard",
  initialMode = "login"
}: LoginCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthMessage(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ fullName, email, password })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setAuthMessage(data.error ?? "Authentication failed.");
        return;
      }

      if (mode === "signup") {
        setAuthMessage("Account created. Check your email if verification is enabled, then sign in.");
        setMode("login");
        return;
      }

      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setAuthMessage("Unable to connect to auth service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCardShell
      title={mode === "login" ? "Sign in to your workspace" : "Create your workspace account"}
      description={
        mode === "login"
          ? "Access onboarding, accounts, payments, cards, and compliance operations from one control plane."
          : "Create an operator account to manage onboarding, accounts, transfers, cards, and monitoring."
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4">
          {mode === "signup" ? (
            <TextField label="Full name" name="fullName" autoComplete="name" required />
          ) : null}

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <div className="relative">
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mode === "login" ? (
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-200"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-800 hover:decoration-blue-300"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(buttonVariants({ size: "lg" }), "w-full rounded-2xl bg-blue-600 hover:bg-blue-700")}
        >
          {isSubmitting
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Continue"
              : "Create account"}
        </button>

        {authMessage ? <p className="text-center text-[13px] text-slate-600">{authMessage}</p> : null}

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setAuthMessage(null);
          }}
          className="w-full text-center text-[13px] font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 transition hover:text-blue-800 hover:decoration-blue-300"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </AuthCardShell>
  );
}

