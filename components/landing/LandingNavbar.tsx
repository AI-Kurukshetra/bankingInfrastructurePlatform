import Link from "next/link";
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
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
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

        <Link
          href={isAuthenticated ? "/dashboard" : "/signup"}
          className={cn(buttonVariants({ size: "sm" }), "bg-blue-600 hover:bg-blue-700 md:hidden")}
        >
          {isAuthenticated ? "Dashboard" : "Get Started"}
        </Link>
      </div>
    </header>
  );
}
