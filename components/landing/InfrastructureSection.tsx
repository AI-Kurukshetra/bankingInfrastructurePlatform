import { Database, Fingerprint, Landmark, Repeat2, ServerCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blocks = [
  { title: "Accounts Layer", description: "Create and manage digital accounts with clear ledger visibility and control settings.", icon: Landmark },
  { title: "Payments Engine", description: "Move funds with internal transfers and ACH-style payment orchestration.", icon: Repeat2 },
  { title: "Card Programs", description: "Issue debit cards, apply spend controls, and monitor card activity at scale.", icon: Database },
  { title: "Compliance Layer", description: "Automate verification, transaction monitoring, and risk review workflows.", icon: Fingerprint },
  { title: "Developer APIs", description: "Integrate financial capabilities with consistent REST endpoints and clear contracts.", icon: ServerCog }
];

export function InfrastructureSection() {
  return (
    <section id="platform" className="border-y border-slate-200 bg-white/70 px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Core infrastructure</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">Composable capabilities for account, payment, card, and compliance programs</h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {blocks.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  <CardTitle className="pt-4 text-base text-slate-950 sm:text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
