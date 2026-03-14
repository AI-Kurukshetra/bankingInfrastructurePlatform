"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import TextField from "@/components/ui/TextField";

export default function ResetPasswordCard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to reset password.");
        return;
      }

      setMessage("Password updated successfully.");
      event.currentTarget.reset();
    } catch {
      setMessage("Unable to connect to auth service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full rounded-3xl border border-slate-200/70 bg-white/70 p-7 shadow-soft backdrop-blur-xl">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
        Reset password
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
        Set a new password for your account.
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
          {isSubmitting ? "Updating..." : "Update password"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </section>
  );
}
