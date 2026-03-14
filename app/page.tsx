import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { PlatformFeatures } from "@/components/landing/PlatformFeatures";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { OperationsPreview } from "@/components/landing/OperationsPreview";
import { DeveloperSection } from "@/components/landing/DeveloperSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-dvh bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <LandingNavbar isAuthenticated={Boolean(user)} />
      <HeroSection />
      <PlatformFeatures />
      <InfrastructureSection />
      <HowItWorks />
      <OperationsPreview />
      <DeveloperSection />
      <SecuritySection />
      <BenefitsSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
