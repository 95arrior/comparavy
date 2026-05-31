import type { Metadata } from "next";
import ActionLinks from "@/components/ActionLinks";
import SiteHeader from "@/components/SiteHeader";
import ToolsDirectory from "@/components/ToolsDirectory";
import { tools } from "@/data/tools";

export const metadata: Metadata = {
  title: "AI Tools",
  description:
    "Browse AI tools when you need a specific app for an AteFlo shortcut or workflow.",
};

export default function ToolsPage() {
  return (
    <main className="ateflo-page-shell min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="tools" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm ateflo-reveal sm:px-10 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
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
