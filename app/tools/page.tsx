import type { Metadata } from "next";
import ActionLinks from "@/components/ActionLinks";
import SiteHeader from "@/components/SiteHeader";
import ToolsDirectory from "@/components/ToolsDirectory";
import { tools } from "@/data/tools";

export const metadata: Metadata = {
  title: "AI Tools for AteFlo Shortcuts",
  description:
    "Browse AI tools that can help you run AteFlo shortcuts and finish specific AI-assisted tasks.",
  openGraph: {
    title: "AI Tools for AteFlo Shortcuts | AteFlo",
    description:
      "Browse AI tools that can help you run AteFlo shortcuts and finish specific AI-assisted tasks.",
    url: "/tools",
  },
  twitter: {
    card: "summary",
    title: "AI Tools for AteFlo Shortcuts | AteFlo",
    description:
      "Browse AI tools that can help you run AteFlo shortcuts and finish specific AI-assisted tasks.",
  },
};

export default function ToolsPage() {
  return (
    <main className="ateflo-page-shell min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="tools" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm ateflo-reveal sm:px-10 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Shortcut-friendly AI tools
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Choose tools based on the output you need.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            AteFlo starts with the shortcut. Use this catalog when you need to
            pick the AI tool that best supports the prompt and finished result.
          </p>
          <ActionLinks
            className="mt-8"
            items={[
              {
                href: "/finder",
                label: "Use Finder",
                tone: "primary",
                eventName: "finder_cta_click",
                eventParams: {
                  source_page: "tools",
                  action_location: "tools_header",
                },
              },
              { href: "/shortcuts", label: "Browse Shortcuts" },
            ]}
          />
        </header>

        <ToolsDirectory tools={tools} />
      </div>
    </main>
  );
}
