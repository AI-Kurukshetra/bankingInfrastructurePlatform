import { ArrowUpRight, ShieldCheck, Webhook, Wallet2 } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";

const authHighlights = [
  {
    title: "Compliant onboarding",
    description: "Run customer onboarding, verification, and approvals from one operator workflow.",
    icon: ShieldCheck
  },
  {
    title: "Unified money movement",
    description: "Manage accounts, ACH, internal transfers, and cards with a consistent control plane.",
    icon: Wallet2
  },
  {
    title: "Event-driven operations",
    description: "Track webhooks, transaction alerts, and operational reviews with full audit context.",
    icon: Webhook
  }
];

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthPageShell({ eyebrow, title, description, children }: AuthPageShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_20%,rgba(37,99,235,0.18),rgba(37,99,235,0.04),rgba(248,250,252,0))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50" />
        <div className="absolute right-[-10rem] top-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-7xl items-center px-6 py-12 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.78fr] lg:items-center">
          <section className="hidden lg:block">
            <BrandLogo href="/" subtitle="Launch, monitor, and operate banking products in one workspace." />
            <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>
            <h1 className="mt-5 max-w-3xl text-balance text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {authHighlights.map((highlight) => {
                const Icon = highlight.icon;

                return (
                  <div
                    key={highlight.title}
                    className="rounded-[1.75rem] border border-blue-100/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(37,99,235,0.10)] backdrop-blur"
                  >
                    <span className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-slate-950">{highlight.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{highlight.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur">
              <ArrowUpRight className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Secure workspace access with consistent controls across onboarding, accounts, and monitoring.
            </div>
          </section>

          <div className="mx-auto w-full max-w-[520px]">{children}</div>
        </div>
      </div>
    </main>
  );
}
