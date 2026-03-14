import {
  Activity,
  Building2,
  CheckCheck,
  CreditCard,
  Handshake,
  IdCard,
  Layers,
  MonitorSmartphone,
  RefreshCcw,
  Webhook
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { title: "Customer Onboarding", description: "Collect user details and route onboarding journeys with configurable workflows.", icon: Handshake },
  { title: "Identity Verification (KYC / KYB)", description: "Automate identity and business verification with policy-driven checks.", icon: IdCard },
  { title: "Account Infrastructure", description: "Create and manage digital account structures across customer segments.", icon: Building2 },
  { title: "Money Movement", description: "Move funds through internal transfers and external payment rails.", icon: RefreshCcw },
  { title: "Card Issuance", description: "Issue and control debit card programs with lifecycle management tools.", icon: CreditCard },
  { title: "Transaction Monitoring", description: "Observe payment activity in real-time with configurable alert thresholds.", icon: Activity },
  { title: "Compliance Automation", description: "Apply controls for verification, screening, and exception handling.", icon: CheckCheck },
  { title: "Admin Operations Console", description: "Give operations teams one place to manage users, funds, and decisions.", icon: MonitorSmartphone },
  { title: "Developer APIs", description: "Expose platform capabilities through consistent, versioned REST APIs.", icon: Layers },
  { title: "Webhook Event System", description: "Drive event-based workflows with delivery logs and replay support.", icon: Webhook }
];

export function PlatformFeatures() {
  return (
    <section id="product" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Platform overview</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">One infrastructure layer for modern financial products</h2>
        <p className="mt-4 text-lg text-slate-600">Unify onboarding, account controls, payment flows, card management, and compliance operations in a single platform.</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="pb-2">
                <span className="inline-flex w-fit rounded-xl bg-blue-50 p-2 text-blue-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <CardTitle className="pt-4 text-lg leading-6 text-slate-950">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
