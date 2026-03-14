"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import TextField from "@/components/ui/TextField";

export default function ResetPasswordFromLinkCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function ensureRecoverySession() {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const tokenHash = queryParams.get("token_hash");
    const type = queryParams.get("type");

    if (tokenHash && type === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash
      });

      if (error) {
        return { ok: false, error: error.message } as const;
      }
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        return { ok: false, error: error.message } as const;
      }

      window.history.replaceState({}, "", "/reset-password");
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        ok: false,
        error: "Reset link is invalid or expired. Please request a new one."
      } as const;
    }

    return { ok: true } as const;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const recoveryResult = await ensureRecoverySession();
    if (!recoveryResult.ok) {
      setMessage(recoveryResult.error);
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Password reset successfully. You can now sign in.");
    event.currentTarget.reset();
    setIsSubmitting(false);
  }

  return (
    <section className="w-full rounded-3xl border border-slate-200/70 bg-white/70 p-7 shadow-soft backdrop-blur-xl">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
        Reset password
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
        Set your new password from the reset link.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="relative">
          <TextField
            label="New password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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

        <div className="relative">
          <TextField
            label="Confirm new password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
            onClick={() => setShowConfirmPassword((value) => !value)}
            aria-pressed={showConfirmPassword}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Reset password"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </section>
  );
}
