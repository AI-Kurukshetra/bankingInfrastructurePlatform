import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";

const footerLinks = [
  { label: "Product", href: "/#product" },
  { label: "Platform", href: "/#platform" },
  { label: "Developers", href: "/#developers" },
  { label: "Security", href: "/#security" },
  { label: "Documentation", href: "/developers" },
  { label: "Support", href: "/login" }
];

const socials = [
  { label: "GitHub", href: "#", icon: Github },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "X", href: "#", icon: Twitter }
];

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 px-6 py-10 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandLogo href="/" compact className="mb-3" />
          <p className="text-sm text-slate-500">Copyright 2026 {BRAND_NAME}. All rights reserved.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-5">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm text-slate-600 transition hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <Link key={social.label} href={social.href} aria-label={social.label} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
