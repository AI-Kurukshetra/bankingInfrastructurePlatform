import { DeveloperSection } from "@/components/landing/DeveloperSection";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DevelopersPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-dvh bg-[#f8fafc] text-slate-900">
      <LandingNavbar isAuthenticated={Boolean(user)} />
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-16 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Developer docs</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-slate-950">
            Build on the FinStack with API-first primitives.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Explore integration patterns for onboarding, accounts, transfers, cards, monitoring, and event-driven workflows.
          </p>
        </div>
      </section>
      <DeveloperSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}