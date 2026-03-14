"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { buttonVariants } from "@/components/ui/button";
import TextField from "@/components/ui/TextField";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
    <AuthCardShell
      title="Set your new password"
      description="Complete recovery from your email link and return to the FinStack workspace."
      footer={
        <div className="text-center text-[13px] text-slate-600">
          Already reset it?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-800"
          >
            Sign in now
          </Link>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
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
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            onClick={() => setShowConfirmPassword((value) => !value)}
            aria-pressed={showConfirmPassword}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(buttonVariants({ size: "lg" }), "w-full rounded-2xl bg-blue-600 hover:bg-blue-700")}
        >
          {isSubmitting ? "Updating..." : "Reset password"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </AuthCardShell>
  );
}
