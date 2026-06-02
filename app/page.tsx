import type { Metadata } from "next";
import Link from "next/link";
import KitCard from "@/components/kits/KitCard";
import KitCtaLink from "@/components/kits/KitCtaLink";
import LocalBusinessKitPreview from "@/components/kits/LocalBusinessKitPreview";
import SiteHeader from "@/components/SiteHeader";
import {
  getFeaturedKit,
  getKitCtaHref,
  getKitHref,
  getKits,
  kitHasCheckout,
} from "@/data/kits";

const HOME_TITLE = "AteFlo | AI Workflow Kits for Real Work";
const HOME_DESCRIPTION =
  "AteFlo sells AI workflow kits for creating review-ready business assets, job application materials, profile drafts, and other high-value outputs.";

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

const whatYouGet = [
  {
    title: "Posts",
    copy: "Google Business Profile updates, offers, events, and local promotions.",
  },
  {
    title: "Review replies",
    copy: "Careful response workflows without fake customer details or promises.",
  },
  {
    title: "Website copy",
    copy: "Homepage, service page, FAQ, and local page copy from real business facts.",
  },
  {
    title: "Social captions",
    copy: "Instagram and Facebook captions for services, updates, and seasonal offers.",
  },
  {
    title: "Setup checklist",
    copy: "Guided visibility checks for profiles, analytics, search, and pixel basics.",
  },
  {
    title: "30-day plan",
    copy: "A repeatable local visibility plan with owner review steps.",
  },
] as const;

const paidReasons = [
  {
    title: "Not a prompt dump",
    copy: "The kit organizes inputs, prompt sequences, templates, examples, and review steps.",
  },
  {
    title: "Built around local outputs",
    copy: "Posts, review replies, page copy, captions, setup checks, and a 30-day plan.",
  },
  {
    title: "Includes review safeguards",
    copy: "Check prices, dates, claims, hours, availability, and platform wording before use.",
  },
] as const;

const freeSamples = [
  "Google Business Profile post prompt",
  "Dating app bio prompt",
  "Voice memo to task list prompt",
] as const;

export default function Home() {
  const featuredKit = getFeaturedKit();
  const featuredKitHref = getKitHref(featuredKit);
  const featuredKitCtaHref = getKitCtaHref(featuredKit);
  const hasCheckout = kitHasCheckout(featuredKit);
  const otherKits = getKits().filter((kit) => kit.slug !== featuredKit.slug).slice(0, 3);

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="kits" />

      <section className="px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 sm:text-sm">
              Flagship paid kit
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Local Business AI Visibility Kit
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-700 sm:text-lg">
              Turn your business details into Google Business Profile posts,
              review replies, website copy, social captions, visibility
              checklists, and a 30-day action plan.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#preview-kit"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Preview the kit
              </a>
              <KitCtaLink
                href={featuredKitCtaHref}
                kitSlug={featuredKit.slug}
                sourcePage="homepage"
                actionLocation="homepage_hero_secondary"
                hasCheckout={hasCheckout}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {featuredKit.ctaLabel}
              </KitCtaLink>
            </div>
            <p className="mt-5 rounded-2xl border border-teal-100 bg-white/70 p-4 text-sm leading-6 text-slate-700">
              No ranking or sales guarantees. Built for review-ready marketing
              assets you can edit before publishing.
            </p>
          </div>

          <LocalBusinessKitPreview
            kitSlug={featuredKit.slug}
            ctaHref={featuredKitCtaHref}
            hasCheckout={hasCheckout}
            sourcePage="homepage"
            variant="compact"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">What you get</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                The local visibility assets owners usually need.
              </h2>
            </div>
            <Link
              href={featuredKitHref}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              See full kit
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whatYouGet.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Why it is worth paying for
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {paidReasons.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <h3 className="text-base font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Other kits</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                More workflow kits for high-value tasks.
              </h2>
            </div>
            <Link
              href="/kits"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Explore kits
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {otherKits.map((kit) => (
              <KitCard key={kit.slug} kit={kit} sourcePage="homepage" compact />
            ))}
          </div>
        </div>
      </section>

      <section id="free-samples" className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Free samples
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Try free samples before choosing a full kit.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Free samples are supporting workflows. The paid kits are the
                complete products with worksheets, templates, examples, and
                review checklists.
              </p>
            </div>
            <Link
              href="/kits"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Compare full kits
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {freeSamples.map((sample) => (
              <div
                key={sample}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm font-semibold text-slate-700"
              >
                {sample}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
