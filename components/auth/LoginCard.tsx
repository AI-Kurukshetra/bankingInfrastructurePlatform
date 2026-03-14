"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Landmark } from "lucide-react";
import TextField from "@/components/ui/TextField";

type LoginCardProps = {
  redirectTo?: string;
};

const REMEMBER_EMAIL_KEY = "bip.rememberedEmail";

export default function LoginCard({ redirectTo = "/dashboard" }: LoginCardProps) {
  const titleId = useId();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setEmailValue(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

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
        setAuthMessage("Signup successful. Please check your email if confirmation is enabled.");
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
    <section className="w-full">
      <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-7 shadow-soft backdrop-blur-xl">
        <header className="mb-6">
          <div className="mb-5 inline-flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[13px] font-semibold tracking-tight text-slate-900">
                Banking Infrastructure
              </div>
              <div className="text-[12px] text-slate-500">Admin Console</div>
            </div>
          </div>

          <h1
            id={titleId}
            className="text-pretty text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900"
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            {mode === "login"
              ? "Use your workspace email and password to access onboarding, accounts, and monitoring."
              : "Create a new account to access your internal workspace."}
          </p>
        </header>

        <form aria-labelledby={titleId} className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            {mode === "signup" ? (
              <TextField
                label="Full name"
                name="fullName"
                autoComplete="name"
                required
              />
            ) : null}

            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={emailValue}
              onChange={(event) => setEmailValue(event.target.value)}
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
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
                onClick={() => setShowPassword((value) => !value)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
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
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                />
                Remember me
              </label>
              <a
                href="/forgot-password"
                className="text-[13px] font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 hover:decoration-slate-400"
              >
                Forgot password?
              </a>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25 focus-visible:ring-offset-2"
          >
            {isSubmitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Continue"
                : "Create account"}
          </button>

          {authMessage ? (
            <p className="text-center text-[13px] text-slate-600">{authMessage}</p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setMode((current) => (current === "login" ? "signup" : "login"));
              setAuthMessage(null);
            }}
            className="w-full text-center text-[13px] font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900 hover:decoration-slate-400"
          >
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <div className="pt-2 text-center text-[12px] text-slate-500">
            Copyright {year} Banking Infrastructure Platform
          </div>
        </form>
      </div>
    </section>
  );
}
