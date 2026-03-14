import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function KycReviewShortcutPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">KYC Review moved</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Use the analyst queue under dashboard to review flagged KYC/KYB applications.
        </p>
        <Link href="/dashboard/kyc-review" className={cn(buttonVariants({ className: "mt-4" }))}>
          Open Analyst Queue
        </Link>
      </div>
    </main>
  );
}
