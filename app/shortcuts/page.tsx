import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ShortcutsDiscovery from "@/components/guides/ShortcutsDiscovery";
import { getPublishedGuides } from "@/lib/guides";
import { toDiscoveryItem } from "@/lib/shortcutDiscovery";

export const metadata: Metadata = {
  title: "AI Shortcuts",
  description:
    "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
  alternates: {
    canonical: "/shortcuts",
  },
  openGraph: {
    title: "AI Shortcuts | AteFlo",
    description:
      "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
    url: "/shortcuts",
  },
  twitter: {
    card: "summary",
    title: "AI Shortcuts | AteFlo",
    description:
      "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
  },
};

export default function ShortcutsPage() {
  const guides = getPublishedGuides();
  const shortcuts = guides.map(toDiscoveryItem);

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="shortcuts" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm ateflo-reveal sm:px-7 sm:py-7">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            AI Shortcuts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Search for a shortcut and open the one that matches the task you
            want to finish with AI.
          </p>
        </header>

        <ShortcutsDiscovery shortcuts={shortcuts} />
      </div>
    </main>
  );
}
