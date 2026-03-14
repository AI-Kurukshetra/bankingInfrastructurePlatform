import LoginCard from "@/components/auth/LoginCard";

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
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_60%_40%,rgba(14,165,233,0.14),rgba(99,102,241,0.06),rgba(248,250,252,0))]" />
        <div className="absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(15,23,42,0.10),rgba(15,23,42,0.00)_60%)] blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.20]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-[520px] items-center px-6 py-16">
        <LoginCard redirectTo={redirectTo} />
      </div>
    </main>
  );
}
