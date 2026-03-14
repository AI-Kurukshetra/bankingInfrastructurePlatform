import ForgotPasswordCard from "@/components/auth/ForgotPasswordCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Password recovery"
      title="Recover workspace access without leaving the same secure experience."
      description="Request a password reset link and return to the FinStack with the same controls, branding, and security patterns used throughout the app."
    >
      <ForgotPasswordCard />
    </AuthPageShell>
  );
}
