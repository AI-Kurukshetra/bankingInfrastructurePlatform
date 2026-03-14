"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { buttonVariants } from "@/components/ui/button";
import TextField from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

export default function ForgotPasswordCard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to process forgot password request.");
        return;
      }

      setMessage("If the email exists, a reset link has been sent.");
    } catch {
      setMessage("Unable to connect to auth service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCardShell
      title="Reset your password"
      description="Enter the email tied to your workspace and we will send a secure reset link."
      footer={
        <div className="text-center text-[13px] text-slate-600">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-800"
          >
            Back to sign in
          </Link>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(buttonVariants({ size: "lg" }), "w-full rounded-2xl bg-blue-600 hover:bg-blue-700")}
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </AuthCardShell>
  );
}
