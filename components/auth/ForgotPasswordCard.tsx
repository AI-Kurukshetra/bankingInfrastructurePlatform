"use client";

import { useState } from "react";
import TextField from "@/components/ui/TextField";

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
    <section className="w-full rounded-3xl border border-slate-200/70 bg-white/70 p-7 shadow-soft backdrop-blur-xl">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
        Forgot password
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
        Enter your account email and we will send a password reset link.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <TextField label="Email" name="email" type="email" autoComplete="email" required />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>

        {message ? <p className="text-center text-[13px] text-slate-600">{message}</p> : null}
      </form>
    </section>
  );
}
