"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

type MobileNavProps = {
  activeHref: string;
  userEmail?: string;
  signOut?: () => Promise<void | never>;
};

export function MobileNav({ activeHref, userEmail, signOut }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative flex h-full w-64 flex-col shadow-xl">
            <DashboardSidebar
              activeHref={activeHref}
              userEmail={userEmail}
              signOut={signOut}
              mobile
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
