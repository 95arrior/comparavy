import type { Metadata } from "next";
import Link from "next/link";
import HomeShortcutSearch from "@/components/HomeShortcutSearch";
import HomeShortcutStrip from "@/components/HomeShortcutStrip";
import SiteHeader from "@/components/SiteHeader";
import TrackedLink from "@/components/TrackedLink";
import { getPublishedGuides } from "@/lib/guides";
import { toDiscoveryItem } from "@/lib/shortcutDiscovery";

const HOME_TITLE = "AteFlo | AI Prompts for Real Work";
const HOME_DESCRIPTION =
  "Find copy-ready AI prompts for meeting notes, Etsy listings, PDFs, small business content, and other tasks you need to finish.";

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

const howItWorks = [
  {
    step: "Fill in details",
    detail: "Add the task facts you already have. Empty fields are okay.",
  },
  {
    step: "Copy the prompt",
    detail: "AteFlo turns those details into one structured prompt.",
  },
  {
    step: "Paste into your AI tool",
    detail: "Use ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.",
  },
  {
    step: "Review the result",
    detail: "Check facts, missing details, and anything sensitive before using it.",
  },
] as const;

export default function Home() {
  const shortcuts = getPublishedGuides().map(toDiscoveryItem);

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="shortcuts" />

      <section className="px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 sm:text-sm">
            AteFlo AI Shortcut Engine
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Get the right AI prompt for the task you need to finish.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Search AteFlo shortcuts, fill in a few details, copy the prompt, and
            paste it into your AI tool.
          </p>
        </div>
      </section>

      <HomeShortcutSearch shortcuts={shortcuts} />

      <HomeShortcutStrip shortcuts={shortcuts} />

      <section className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-teal-700">How AteFlo works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              From task to copy-ready prompt in a few steps.
            </h2>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, index) => (
              <article
                key={item.step}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-base font-semibold leading-6 text-slate-950">
                  {item.step}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-teal-100 bg-teal-50 px-5 py-7 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Need a broader path?
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Browse shortcuts or use Finder.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Browse every published AteFlo shortcut, or use Finder when you
              know the workflow but still need help choosing a tool.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:mt-0 sm:flex-row">
            <Link
              href="/shortcuts"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Browse all shortcuts
            </Link>
            <TrackedLink
              href="/finder"
              eventName="finder_cta_click"
              eventParams={{
                source_page: "homepage",
                action_location: "homepage_secondary_cta",
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Use Finder
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
