import type { Metadata } from "next";
import Link from "next/link";
import FactoryAssemblyVisual from "@/components/kits/FactoryAssemblyVisual";
import KitCard from "@/components/kits/KitCard";
import KitCtaLink from "@/components/kits/KitCtaLink";
import KitPreviewBuilder from "@/components/kits/KitPreviewBuilder";
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
  "AteFlo is an AI Workflow Kit Store with packaged prompts, examples, checklists, and action plans for tasks worth finishing.";

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

const boxContents = [
  "Input Worksheet",
  "Prompt Sequences",
  "Example Outputs",
  "Review Checklists",
  "Website Copy",
  "Social Captions",
  "30-Day Plan",
  "Setup Checklist",
] as const;

const scratchVsKit = [
  {
    title: "Asking AI from scratch",
    items: [
      "Scattered prompts",
      "Missing steps",
      "Generic drafts",
      "Easy to forget review checks",
    ],
  },
  {
    title: "Using an AteFlo kit",
    items: [
      "Structured inputs",
      "Ordered prompt sequence",
      "Example outputs",
      "Review rules and action plan",
    ],
  },
] as const;

export default function Home() {
  const featuredKit = getFeaturedKit();
  const featuredKitHref = getKitHref(featuredKit);
  const featuredKitCtaHref = getKitCtaHref(featuredKit);
  const hasCheckout = kitHasCheckout(featuredKit);
  const otherKits = getKits().filter((kit) => kit.slug !== featuredKit.slug);

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="kits" />

      <section className="px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
        <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 sm:text-sm">
              Premium AI Workflow Kit Store
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Build ready-to-use AI workflow kits for real work.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              AteFlo turns your details into structured prompts, example
              outputs, checklists, and action plans you can use with ChatGPT,
              Claude, Gemini, Copilot, or another AI tool.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#build-sample-kit"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Build a sample kit
              </a>
              <Link
                href="/kits"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Explore kits
              </Link>
            </div>
            <p className="mt-5 rounded-2xl border border-teal-100 bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
              Flagship product: <span className="font-semibold text-teal-900">Local Business AI Visibility Kit</span>.
              Enter business details, generate a sample, then unlock the full
              workflow package. No ranking, lead, sales, customer, income, or
              business growth guarantees.
            </p>
          </div>
          <FactoryAssemblyVisual />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <KitPreviewBuilder
            kitSlug={featuredKit.slug}
            ctaHref={featuredKitCtaHref}
            hasCheckout={hasCheckout}
            sourcePage="homepage"
            variant="compact"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-teal-700">What comes in the box</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A packaged workflow, not loose prompts.
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boxContents.map((item, index) => (
              <article
                key={item}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-950">
                  {item}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
          <div className="rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Flagship kit
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Local Business AI Visibility Kit
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Built for local owners who need review-ready posts, review
              replies, page copy, social captions, setup checklists, and a
              30-day local visibility plan.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <KitCtaLink
                href={featuredKitCtaHref}
                kitSlug={featuredKit.slug}
                sourcePage="homepage"
                actionLocation="homepage_flagship_cta"
                hasCheckout={hasCheckout}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {featuredKit.ctaLabel}
              </KitCtaLink>
              <Link
                href={featuredKitHref}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                View product page
              </Link>
            </div>
          </div>
          <KitCard kit={featuredKit} sourcePage="homepage_featured" />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Other kit boxes</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Productized workflows for other high-value tasks.
              </h2>
            </div>
            <Link
              href="/kits"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Browse the shelf
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {otherKits.map((kit) => (
              <KitCard key={kit.slug} kit={kit} sourcePage="homepage" compact />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Why not just ask AI?
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {scratchVsKit.map((column) => (
              <article
                key={column.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5"
              >
                <h2 className="text-lg font-semibold text-slate-950">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            AteFlo does not replace AI tools or claim to be smarter than them.
            It helps you use AI more practically by packaging the inputs,
            sequence, examples, checks, and final action plan.
          </p>
        </div>
      </section>

      <section className="px-4 pb-16 pt-10 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-teal-100 bg-teal-50 p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Start the factory line
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Build your first sample kit.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Try the sample builder, then unlock the full workflow if the kit
              matches the work you need to finish.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:mt-0 sm:flex-row">
            <a
              href="#build-sample-kit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Build sample kit
            </a>
            <Link
              href="/kits"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Explore kits
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
