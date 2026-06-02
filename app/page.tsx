import type { Metadata } from "next";
import Link from "next/link";
import HomeShortcutSearch from "@/components/HomeShortcutSearch";
import HomeShortcutStrip from "@/components/HomeShortcutStrip";
import HomeKitsSection from "@/components/kits/HomeKitsSection";
import KitCard from "@/components/kits/KitCard";
import KitCtaLink from "@/components/kits/KitCtaLink";
import SiteHeader from "@/components/SiteHeader";
import TrackedLink from "@/components/TrackedLink";
import {
  getFeaturedKit,
  getKitCtaHref,
  getKitHref,
  kitHasCheckout,
} from "@/data/kits";
import { getPublishedShortcutDiscoveryItems } from "@/lib/publishedShortcuts";

const HOME_TITLE = "AteFlo | AI Workflow Kits for Real Work";
const HOME_DESCRIPTION =
  "Explore AI workflow kits and free sample shortcuts for creating review-ready business assets, job application materials, profile drafts, and other high-value outputs.";

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

export const revalidate = 0;

const kitContents = [
  {
    step: "Input worksheets",
    detail: "Collect the facts, constraints, and details AI should not invent.",
  },
  {
    step: "Prompt sequences",
    detail: "Move through a workflow instead of relying on one vague prompt.",
  },
  {
    step: "Examples and templates",
    detail: "See what useful inputs and review-ready outputs can look like.",
  },
  {
    step: "Review checklists",
    detail: "Check claims, missing details, and risks before using the result.",
  },
  {
    step: "Setup guidance",
    detail: "Use guided checklists for workflows that need platform or tool setup.",
  },
  {
    step: "Revision prompts",
    detail: "Tighten tone, length, structure, and accuracy without starting over.",
  },
] as const;

export default function Home() {
  const shortcuts = getPublishedShortcutDiscoveryItems();
  const featuredKit = getFeaturedKit();
  const featuredKitHref = getKitHref(featuredKit);
  const featuredKitCtaHref = getKitCtaHref(featuredKit);

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="kits" />

      <section className="px-4 pb-7 pt-12 sm:px-6 sm:pb-9 sm:pt-16 lg:pt-18">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 sm:text-sm">
            AteFlo AI Workflow Kits
          </p>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            AI workflow kits for people who need the result, not another vague prompt.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            AteFlo helps you use AI to create review-ready business assets, job
            application materials, personal profile drafts, and other
            high-value outputs with structured kits and free sample shortcuts.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/kits"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Explore kits
            </Link>
            <Link
              href="/shortcuts"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Try free shortcuts
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
                Featured kit
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Local Business AI Visibility Kit
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Turn business details into local posts, website copy, review
                replies, social captions, and visibility checklists you can
                review and use.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <KitCtaLink
                  href={featuredKitCtaHref}
                  kitSlug={featuredKit.slug}
                  sourcePage="homepage"
                  actionLocation="homepage_featured_kit_primary"
                  hasCheckout={kitHasCheckout(featuredKit)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  {featuredKit.ctaLabel}
                </KitCtaLink>
                <Link
                  href={featuredKitHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  View details
                </Link>
              </div>
            </div>
            <KitCard kit={featuredKit} sourcePage="homepage_featured" compact />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-teal-700">What is inside a kit</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A practical workflow system, not a prompt list.
            </h2>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kitContents.map((item, index) => (
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

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-teal-700">Free sample shortcuts</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Try a shortcut before buying a full kit.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Free shortcuts are sample workflows and trust builders. Use them
              to see how AteFlo structures prompts before choosing a full kit.
            </p>
          </div>
        </div>
      </section>

      <HomeShortcutSearch shortcuts={shortcuts} />

      <HomeShortcutStrip shortcuts={shortcuts} />

      <HomeKitsSection />

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-teal-100 bg-teal-50 px-5 py-7 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Need a smaller starting point?
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Try a free shortcut or use Finder.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Shortcuts stay free as samples and entry points. Finder can help
              when you know the task but still need a starting workflow.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:mt-0 sm:flex-row">
            <Link
              href="/shortcuts"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Free shortcuts
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
