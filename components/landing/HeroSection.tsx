import Link from "next/link";
import { ArrowRight, LineChart, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_20%,rgba(37,99,235,0.17),rgba(248,250,252,0))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:64px_64px] opacity-50" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <Badge className="rounded-full bg-blue-100 px-4 py-1 text-blue-700 hover:bg-blue-100">API-first fintech infrastructure</Badge>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl xl:text-6xl">
            Launch Financial Products Without Building Banking Infrastructure
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Build accounts, cards, and payment experiences on one platform while automating verification, risk controls, and operational workflows.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-blue-600 hover:bg-blue-700")}>
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/#platform" className={buttonVariants({ variant: "outline", size: "lg" })}>
              View Platform
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-[0_30px_80px_rgba(37,99,235,0.12)]">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white pb-4">
            <CardTitle className="text-lg text-slate-950 sm:text-xl">Operations command center</CardTitle>
            <p className="text-sm text-slate-600">Live view across onboarding, accounts, cards, and payments.</p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <Wallet className="h-4 w-4 text-blue-700" />
                <p className="mt-2 text-xl font-semibold sm:text-2xl">26.4K</p>
                <p className="text-xs text-slate-600">Active accounts</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <LineChart className="h-4 w-4 text-blue-700" />
                <p className="mt-2 text-xl font-semibold sm:text-2xl">$21.8M</p>
                <p className="text-xs text-slate-600">Monthly flow</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <p className="mt-2 text-xl font-semibold sm:text-2xl">98.9%</p>
                <p className="text-xs text-slate-600">Policy pass rate</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Risk review queue</span>
                <span className="font-medium text-blue-700">14 alerts</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 w-2/3 rounded-full bg-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
