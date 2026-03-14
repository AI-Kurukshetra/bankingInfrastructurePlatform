import Link from "next/link";
import { Code2, KeyRound, PlaySquare, Webhook } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const devItems = [
  { title: "REST APIs", icon: Code2, description: "Versioned endpoints for onboarding, accounts, transfers, cards, and compliance actions." },
  { title: "Webhook events", icon: Webhook, description: "Consume platform events for status updates, transaction changes, and operational workflows." },
  { title: "Sandbox testing", icon: PlaySquare, description: "Simulate customer flows and payment events safely before production release." },
  { title: "API keys", icon: KeyRound, description: "Manage and rotate credentials with role-aware access controls." }
];

export function DeveloperSection() {
  return (
    <section id="developers" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Developer experience</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">Ship faster with APIs, events, sandbox tooling, and clear docs</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Build and iterate with predictable API contracts while operations teams stay aligned in the same platform.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {devItems.map((item) => {
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

          <Link href="/developers" className={cn(buttonVariants({ variant: "outline" }), "mt-7 border-slate-300")}>Open documentation</Link>
        </div>

        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-slate-950 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-white sm:text-lg">Sample API request</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre className="overflow-x-auto p-4 text-xs leading-6 text-blue-100 sm:p-5 sm:text-sm sm:leading-7">
{`curl -X POST https://api.bip.local/v1/accounts \\
  -H "Authorization: Bearer <api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "cus_82941",
    "account_type": "checking",
    "currency": "USD",
    "metadata": {
      "segment": "consumer"
    }
  }'`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
