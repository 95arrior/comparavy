import type { Metadata } from "next";
import KitsInlineCta from "@/components/kits/KitsInlineCta";
import SiteHeader from "@/components/SiteHeader";
import ShortcutsDiscovery from "@/components/guides/ShortcutsDiscovery";
import { getPublishedShortcutDiscoveryItems } from "@/lib/publishedShortcuts";

export const metadata: Metadata = {
  title: "Free AI Shortcuts",
  description:
    "Free AteFlo sample shortcuts for trying structured AI workflows before choosing a full kit.",
  alternates: {
    canonical: "/shortcuts",
  },
  openGraph: {
    title: "Free AI Shortcuts | AteFlo",
    description:
      "Free AteFlo sample shortcuts for trying structured AI workflows before choosing a full kit.",
    url: "/shortcuts",
  },
  twitter: {
    card: "summary",
    title: "Free AI Shortcuts | AteFlo",
    description:
      "Free AteFlo sample shortcuts for trying structured AI workflows before choosing a full kit.",
  },
};

export const revalidate = 0;

export default function ShortcutsPage() {
  const shortcuts = getPublishedShortcutDiscoveryItems();

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="shortcuts" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm ateflo-reveal sm:px-7 sm:py-7">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Free AI Shortcuts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Try a free sample workflow before choosing a full AteFlo kit.
            Shortcuts stay useful, but kits are the complete paid workflow.
          </p>
        </header>

        <ShortcutsDiscovery shortcuts={shortcuts} />
        <div className="mt-6">
          <KitsInlineCta sourcePage="shortcuts" />
        </div>
      </div>
    </main>
  );
}
