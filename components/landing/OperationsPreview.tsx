import { BellRing, ShieldAlert, SlidersHorizontal, Users, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const opsCards = [
  { title: "Customer management", icon: Users, value: "2,184 profiles", note: "Review onboarding, status, and identity outcomes." },
  { title: "Account controls", icon: SlidersHorizontal, value: "184 controls", note: "Apply freezes, limits, and permissions instantly." },
  { title: "Transaction monitoring", icon: WalletCards, value: "74 live checks", note: "Track anomalies and payment velocity in real time." },
  { title: "Fraud alerts", icon: ShieldAlert, value: "11 open alerts", note: "Route suspicious activity to investigation queues." },
  { title: "Compliance review", icon: BellRing, value: "96% SLA", note: "Resolve verification and policy exceptions quickly." }
];

export function OperationsPreview() {
  return (
    <section className="border-y border-slate-200 bg-white/70 px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Operations platform</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-slate-950">Built for teams running daily financial operations</h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {opsCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="pb-2">
                  <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                  <CardTitle className="pt-3 text-lg text-slate-950">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
