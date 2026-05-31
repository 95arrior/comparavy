import type { Metadata } from "next";
import Link from "next/link";
import ActionLinks from "@/components/ActionLinks";
import Logo from "@/components/Logo";
import ToolsDirectory from "@/components/ToolsDirectory";
import { tools } from "@/data/tools";

export const metadata: Metadata = {
  title: "AI Tools",
  description:
    "Browse AI tools when you need a specific app for an AteFlo shortcut or workflow.",
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm comparavy-reveal sm:px-10 sm:py-10">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <Logo />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/guides"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-teal-800"
              >
                Shortcuts
              </Link>
              <Link
                href="/finder"
                className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
              >
                Finder
              </Link>
            </div>
          </nav>

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            AI Tools
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Find a tool after you know what you are trying to finish.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            The tools catalog stays available for comparison, but AteFlo starts
            with the shortcut and uses tools as support for the work.
          </p>
          <ActionLinks
            className="mt-8"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/guides", label: "Browse Shortcuts" },
            ]}
          />
        </header>

        <ToolsDirectory tools={tools} />
      </div>
    </main>
  );
}
