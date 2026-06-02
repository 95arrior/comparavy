"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";

type NavKey = "finder" | "kits" | "online-sales-kit" | "other-kits" | "tools";

interface SiteHeaderProps {
  readonly active?: NavKey;
  readonly className?: string;
}

const navItems: readonly {
  readonly key: NavKey;
  readonly href: string;
  readonly label: string;
  readonly primary?: boolean;
}[] = [
  { key: "kits", href: "/kits", label: "Kits", primary: true },
  {
    key: "online-sales-kit",
    href: "/kits/online-sales-setup-kit",
    label: "온라인 영업 세팅",
  },
  { key: "other-kits", href: "/kits#kit-boxes", label: "Other Kits" },
  { key: "tools", href: "/tools", label: "Tools" },
];

function navClass(active: boolean, primary = false): string {
  if (active) {
    return "rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800";
  }

  if (primary) {
    return "rounded-full border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100";
  }

  return "rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-teal-800";
}

export default function SiteHeader({ active, className }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={`border-b border-slate-200/80 bg-[#FBFAF7]/95 ${className ?? ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-2 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(active === item.key, item.primary)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:hidden"
          >
            Menu
          </button>
        </div>

        {open && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active === item.key
                    ? "bg-teal-700 text-white"
                    : item.primary
                      ? "bg-teal-50 text-teal-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
