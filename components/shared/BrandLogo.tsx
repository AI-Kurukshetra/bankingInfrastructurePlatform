import Link from "next/link";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_CONSOLE_LABEL, BRAND_NAME } from "@/lib/brand";

type BrandLogoProps = {
  href?: string;
  className?: string;
  subtitle?: string;
  compact?: boolean;
};

export function BrandLogo({
  href,
  className,
  subtitle = BRAND_CONSOLE_LABEL,
  compact = false
}: BrandLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200/70">
        <Landmark className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{BRAND_NAME}</p>
        {!compact ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex max-w-full items-center text-left text-slate-950">
      {content}
    </Link>
  );
}
