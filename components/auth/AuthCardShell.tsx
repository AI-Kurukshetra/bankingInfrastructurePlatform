import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

type AuthCardShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthCardShell({ title, description, children, footer }: AuthCardShellProps) {
  const year = new Date().getFullYear();

  return (
    <section className="w-full rounded-[2rem] border border-blue-100/80 bg-white/90 p-7 shadow-[0_24px_80px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:p-8">
      <header className="mb-6">
        <BrandLogo href="/" />
        <h1 className="mt-6 text-pretty text-[24px] font-semibold leading-tight tracking-[-0.03em] text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </header>

      {children}

      {footer ? <div className="mt-5">{footer}</div> : null}
      <div className="mt-6 border-t border-blue-100/80 pt-4 text-center text-xs text-slate-500">
        Copyright {year} {BRAND_NAME}
      </div>
    </section>
  );
}
