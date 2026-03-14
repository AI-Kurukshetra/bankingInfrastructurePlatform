import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-10 lg:pb-20">
      <div className="overflow-hidden rounded-2xl bg-slate-950 px-5 py-10 text-slate-100 shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:rounded-[2rem] sm:px-8 sm:py-12 lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Final call to action</p>
        <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-4xl">Start Building Financial Products Today</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">Bring your product roadmap onto a single infrastructure platform and launch with confidence.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "bg-blue-600 hover:bg-blue-700")}>
            Create Account
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/developers" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Explore APIs
          </Link>
        </div>
      </div>
    </section>
  );
}
