"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { buttonVariants } from "@/components/ui/button";
import TextField from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

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
    <AuthCardShell
      title="Update your password"
      description="Choose a new password for your workspace account and keep access secure."
      footer={
        <div className="text-center text-[13px] text-slate-600">
          Need to go back?{" "}
          <Link
            href="/dashboard"
            className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-800"
          >
            Return to dashboard
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
          {isSubmitting ? "Updating..." : "Update password"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </AuthCardShell>
  );
}
