import ResetPasswordFromLinkCard from "@/components/auth/ResetPasswordFromLinkCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      eyebrow="Reset password"
      title="Complete account recovery and get back to your operating workflow quickly."
      description="Use the secure recovery link to set a new password and return to the FinStack workspace."
    >
      <ResetPasswordFromLinkCard />
    </AuthPageShell>
  );
}
