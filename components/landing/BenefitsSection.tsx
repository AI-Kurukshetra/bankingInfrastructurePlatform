import { Gauge, Layers2, Rocket, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  { title: "Faster product launches", icon: Rocket, description: "Go from concept to pilot quickly with a ready-to-integrate infrastructure foundation." },
  { title: "Reduced regulatory complexity", icon: Scale, description: "Move compliance from manual effort to automated workflows and review queues." },
  { title: "Unified infrastructure", icon: Layers2, description: "Run onboarding, accounts, payments, cards, and controls from one platform surface." },
  { title: "Scalable architecture", icon: Gauge, description: "Support growth with composable services and operational tooling built for expansion." }
];

export function BenefitsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Benefits</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">Designed to accelerate fintech teams while keeping operational control</h2>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="pb-2">
                <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
                <CardTitle className="pt-3 text-base text-slate-950 sm:text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-600">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
