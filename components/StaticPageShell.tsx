import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";

interface StaticPageShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly children: ReactNode;
}

export default function StaticPageShell({
  eyebrow,
  title,
  intro,
  children,
}: StaticPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <SiteHeader className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
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
