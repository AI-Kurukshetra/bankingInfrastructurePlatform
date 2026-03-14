import { Eye, FileSearch, Lock, ShieldCheck, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const securityItems = [
  { title: "Encrypted data", icon: Lock, description: "Protect sensitive information in transit and at rest with strong cryptographic controls." },
  { title: "Audit logging", icon: FileSearch, description: "Track operational actions with immutable logs for internal and regulatory review." },
  { title: "Role-based access control", icon: UserCog, description: "Apply granular permissions across operations, compliance, and engineering teams." },
  { title: "Risk monitoring", icon: Eye, description: "Detect unusual transaction patterns with configurable monitoring and alert pipelines." },
  { title: "Compliance workflows", icon: ShieldCheck, description: "Automate policy checks, review queues, and exception handling processes." }
];

export function SecuritySection() {
  return (
    <section id="security" className="border-y border-slate-200 bg-white/70 px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Security and compliance</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">Controls designed for regulated financial operations</h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {securityItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
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
      </div>
    </section>
  );
}
