import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
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
    <AuthPageShell
      eyebrow="Account security"
      title="Keep your workspace secure with the same design and controls used across the platform."
      description="Update your password without leaving the FinStack experience and return to operations when you are done."
    >
      <ResetPasswordCard />
    </AuthPageShell>
  );
}
