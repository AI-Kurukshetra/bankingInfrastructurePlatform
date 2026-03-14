"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

type LandingNavbarProps = {
  isAuthenticated: boolean;
};

const links = [
  { label: "Product", href: "/#product" },
  { label: "Platform", href: "/#platform" },
  { label: "Developers", href: "/#developers" },
  { label: "Security", href: "/#security" },
  { label: "Documentation", href: "/developers" }
];

export function LandingNavbar({ isAuthenticated }: LandingNavbarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Dashboard" : "Get Started";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
        <BrandLogo href="/" compact />

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Link href="/dashboard" className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700")}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                Login
              </Link>
              <Link href="/signup" className={cn(buttonVariants(), "bg-blue-600 hover:bg-blue-700")}>
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link href={primaryHref} className={cn(buttonVariants({ size: "sm" }), "bg-blue-600 hover:bg-blue-700")}>
            {primaryLabel}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-site-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200/80 bg-white md:hidden">
          <div
            className="fixed inset-0 top-[73px] z-40 bg-slate-950/20 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <nav
            id="mobile-site-navigation"
            className="relative z-50 mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6"
          >
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "ghost" }), "justify-center")}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
