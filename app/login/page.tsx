import LoginCard from "@/components/auth/LoginCard";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

type LoginPageProps = {
  searchParams?: {
    redirectTo?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectTo =
    searchParams?.redirectTo && searchParams.redirectTo.startsWith("/")
      ? searchParams.redirectTo
      : "/dashboard";

  return (
    <AuthPageShell
      eyebrow="Workspace access"
      title="Operate onboarding, accounts, and payments from one consistent workspace."
      description="Sign in to the FinStack to manage compliant customer onboarding, money movement, cards, and operational monitoring."
    >
      <LoginCard redirectTo={redirectTo} />
    </AuthPageShell>
  );
}
