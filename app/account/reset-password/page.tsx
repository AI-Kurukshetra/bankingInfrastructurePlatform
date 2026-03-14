import { redirect } from "next/navigation";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountResetPasswordPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/account/reset-password");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_60%_40%,rgba(14,165,233,0.14),rgba(99,102,241,0.06),rgba(248,250,252,0))]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-[520px] items-center px-6 py-16">
        <ResetPasswordCard />
      </div>
    </main>
  );
}
