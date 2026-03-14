import LoginCard from "@/components/auth/LoginCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function SignupPage() {
  return (
    <AuthPageShell
      eyebrow="Create account"
      title="Set up your team workspace and launch faster with the same operating system used across the product."
      description="Create an operator account for the FinStack and move directly into onboarding, account controls, transfer workflows, and monitoring."
    >
      <LoginCard initialMode="signup" />
    </AuthPageShell>
  );
}
