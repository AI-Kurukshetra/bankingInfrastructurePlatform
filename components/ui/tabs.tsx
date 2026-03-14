"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// ── Root ──────────────────────────────────────────────────────────────────────

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row gap-4",
        className
      )}
      {...props}
    />
  )
}

// ── List ──────────────────────────────────────────────────────────────────────

const tabsListVariants = cva(
  [
    "group/tabs-list relative inline-flex items-center",
    // Vertical: stack triggers
    "group-data-[orientation=vertical]/tabs:flex-col",
    "group-data-[orientation=vertical]/tabs:items-stretch",
  ].join(" "),
  {
    variants: {
      variant: {
        /**
         * Pill — active tab lifts out of a tinted tray as a white floating chip.
         * Use for primary page-level or section-level tab navigation.
         */
        default: [
          "bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5",
          "group-data-[orientation=vertical]/tabs:w-52",
        ].join(" "),

        /**
         * Line — minimal underline indicator on a hairline divider.
         * Use for secondary content switching inside a card or panel.
         */
        line: [
          "gap-0",
          // Horizontal: full-width with bottom divider
          "group-data-[orientation=horizontal]/tabs:w-full",
          "group-data-[orientation=horizontal]/tabs:border-b",
          "group-data-[orientation=horizontal]/tabs:border-slate-200 dark:group-data-[orientation=horizontal]/tabs:border-slate-800",
          // Vertical: right divider
          "group-data-[orientation=vertical]/tabs:border-r",
          "group-data-[orientation=vertical]/tabs:border-slate-200 dark:group-data-[orientation=vertical]/tabs:border-slate-800",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // ── Base ────────────────────────────────────────────────────────────
        "relative inline-flex items-center justify-center gap-2",
        "text-sm font-medium whitespace-nowrap select-none cursor-pointer",
        "transition-all duration-150 ease-in-out",
        "disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:rounded-lg",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        // ── Default (pill) — inactive ────────────────────────────────────────
        "group-data-[variant=default]/tabs-list:px-3.5",
        "group-data-[variant=default]/tabs-list:py-1.5",
        "group-data-[variant=default]/tabs-list:rounded-[10px]",
        "group-data-[variant=default]/tabs-list:text-slate-500 dark:group-data-[variant=default]/tabs-list:text-slate-400",
        "group-data-[variant=default]/tabs-list:hover:text-slate-700 dark:group-data-[variant=default]/tabs-list:hover:text-slate-200",
        "group-data-[variant=default]/tabs-list:hover:bg-white/70 dark:group-data-[variant=default]/tabs-list:hover:bg-slate-700/80",
        // Vertical: full-width left-aligned
        "group-data-[orientation=vertical]/tabs:group-data-[variant=default]/tabs-list:w-full",
        "group-data-[orientation=vertical]/tabs:group-data-[variant=default]/tabs-list:justify-start",

        // ── Default (pill) — active ──────────────────────────────────────────
        // White chip rises off the tray; blue text marks selection clearly
        "group-data-[variant=default]/tabs-list:data-[active]:bg-white dark:group-data-[variant=default]/tabs-list:data-[active]:bg-slate-900",
        "group-data-[variant=default]/tabs-list:data-[active]:text-blue-700",
        "group-data-[variant=default]/tabs-list:data-[active]:shadow-[0_1px_3px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)]",
        "group-data-[variant=default]/tabs-list:data-[active]:hover:bg-white dark:group-data-[variant=default]/tabs-list:data-[active]:hover:bg-slate-900",

        // ── Line — inactive ──────────────────────────────────────────────────
        "group-data-[variant=line]/tabs-list:px-4",
        "group-data-[variant=line]/tabs-list:py-2.5",
        "group-data-[variant=line]/tabs-list:text-slate-500 dark:group-data-[variant=line]/tabs-list:text-slate-400",
        "group-data-[variant=line]/tabs-list:hover:text-slate-900 dark:group-data-[variant=line]/tabs-list:hover:text-slate-100",
        // Vertical: left-aligned
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:justify-start",
        // Horizontal underline — transparent when inactive
        "group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:border-b-2",
        "group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:border-transparent",
        "group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:mb-[-2px]",
        // Vertical right border — transparent when inactive
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:border-r-2",
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:border-transparent",
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:mr-[-2px]",

        // ── Line — active ────────────────────────────────────────────────────
        "group-data-[variant=line]/tabs-list:data-[active]:text-blue-600",
        "group-data-[variant=line]/tabs-list:data-[active]:font-semibold",
        // Horizontal: blue bottom border
        "group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:data-[active]:border-blue-600",
        // Vertical: blue right border
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:data-[active]:border-blue-600",

        className
      )}
      {...props}
    />
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:rounded-sm",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
