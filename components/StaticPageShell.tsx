import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";

interface StaticPageShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly children: ReactNode;
}

const topLinks = [
  { href: "/finder", label: "Finder" },
  { href: "/guides", label: "Shortcuts" },
  { href: "/tools", label: "Tools" },
] as const;

export default function StaticPageShell({
  eyebrow,
  title,
  intro,
  children,
}: StaticPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <Logo />
            <div className="flex flex-wrap items-center gap-2">
              {topLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-teal-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {intro}
          </p>
        </header>

        <div className="mt-8 space-y-4">{children}</div>
      </div>
    </main>
  );
}
