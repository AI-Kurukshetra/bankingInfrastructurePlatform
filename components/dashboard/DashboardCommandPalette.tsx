"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth/rbac";
import { Bell, CommandIcon, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";

const allItems: Array<{ label: string; path: string; roles?: AppRole[] }> = [
  { label: "Dashboard Overview", path: "/dashboard" },
  { label: "Onboarding", path: "/onboarding" },
  { label: "Accounts", path: "/dashboard/accounts" },
  { label: "Payments", path: "/dashboard/payments" },
  { label: "Cards", path: "/dashboard/cards" },
  { label: "Monitoring", path: "/dashboard/monitoring", roles: ["admin", "analyst", "developer"] },
  { label: "Activity Log", path: "/dashboard/activity", roles: ["admin", "analyst", "developer"] },
  { label: "KYC / KYB Review", path: "/dashboard/kyc-review", roles: ["admin", "analyst", "developer"] },
  { label: "Account Security", path: "/account/reset-password" },
  { label: "Forgot Password", path: "/forgot-password" }
];

type DashboardCommandPaletteProps = {
  userRole?: AppRole;
};

export function DashboardCommandPalette({ userRole }: DashboardCommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = useMemo(() => allItems.filter((item) => !item.roles || (userRole ? item.roles.includes(userRole) : true)), [userRole]);

  function goTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  function toggleTheme() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    setIsDark(nextDark);
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" onClick={() => setOpen(true)} title="Command palette (Ctrl+K)">
          <CommandIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" title="Notifications">
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search actions, views, and utilities..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {items.map((item) => <CommandItem key={item.path} onSelect={() => goTo(item.path)}>{item.label}</CommandItem>)}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={toggleTheme}>{isDark ? "Switch to light mode" : "Switch to dark mode"}</CommandItem>
            <CommandItem onSelect={() => goTo("/login")}>Return to Login</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
