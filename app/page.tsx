import type { Metadata } from "next";
import Link from "next/link";
import FactoryAssemblyVisual from "@/components/kits/FactoryAssemblyVisual";
import KitCtaLink from "@/components/kits/KitCtaLink";
import KitPreviewBuilder from "@/components/kits/KitPreviewBuilder";
import TrackedLink from "@/components/TrackedLink";
import SiteHeader from "@/components/SiteHeader";
import {
  type AteFloKit,
  getFeaturedKit,
  getKitCtaHref,
  getKitHref,
  getKits,
  kitHasCheckout,
} from "@/data/kits";

const HOME_TITLE = "AteFlo | AI Workflow Kits for Real Work";
const HOME_DESCRIPTION =
  "AteFlo helps you build AI workflow kits with structured prompts, examples, checklists, and action plans for real work.";

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

const shelfKitSlugs = [
  "local-business-ai-visibility-kit",
  "job-application-ai-kit",
  "dating-profile-rewrite-kit",
  "content-repurposing-kit",
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
      "Review rules",
      "Action plan",
    ],
  },
] as const;

function modulePreview(kit: AteFloKit): readonly string[] {
  if (kit.slug === "local-business-ai-visibility-kit") {
    return [
      "30 post workflows",
      "Review Response Pack",
      "Website Copy Builder",
      "30-Day Local Visibility Plan",
    ];
  }

  return kit.modules.slice(0, 4).map((module) => module.title);
}

function ProductBox({
  kit,
  featured = false,
}: {
  readonly kit: AteFloKit;
  readonly featured?: boolean;
}) {
  const href = getKitHref(kit);
  const ctaHref = getKitCtaHref(kit);
  const hasCheckout = kitHasCheckout(kit);
  const active = kit.status === "active";

  return (
    <article
      id={kit.slug}
      className={`ateflo-reveal ateflo-card-lift relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm ${
        featured
          ? "border-teal-200 p-5 ring-1 ring-teal-100 sm:p-6 lg:p-7"
          : "border-slate-200 p-5"
      }`}
    >
      <div
        className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            featured
              ? "bg-teal-700 text-white"
              : "border border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {kit.productLabel ?? "Workflow kit"}
        </span>
        <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          {kit.status === "active" ? kit.priceLabel : "Coming soon"}
        </span>
      </div>

      <div className={featured ? "mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" : "mt-5"}>
        <div>
          <h3
            className={`font-semibold tracking-tight text-slate-950 ${
              featured ? "text-3xl leading-tight sm:text-4xl" : "text-xl leading-7"
            }`}
          >
            {kit.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {kit.oneLinePromise}
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                For
              </p>
              <p className="mt-2 text-slate-700">{kit.audience}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Produces
              </p>
              <p className="mt-2 text-slate-700">{kit.outcome}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Inside the box
            </p>
            <span className="text-xs font-semibold text-teal-700">
              {kit.modules.length} modules
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {modulePreview(kit).map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl border bg-white p-3 text-sm font-semibold ${
                  featured && index === 0
                    ? "border-teal-200 text-teal-900"
                    : "border-slate-100 text-slate-700"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
        {active ? (
          <KitCtaLink
            href={ctaHref}
            kitSlug={kit.slug}
            sourcePage="homepage"
            actionLocation={featured ? "homepage_featured_product" : "homepage_product_shelf"}
            hasCheckout={hasCheckout}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-teal-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {kit.ctaLabel}
          </KitCtaLink>
        ) : (
          <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-500">
            Coming soon
          </span>
        )}
        <TrackedLink
          href={href}
          eventName="kit_card_click"
          eventParams={{
            kit_slug: kit.slug,
            source_page: "homepage",
            action_location: featured
              ? "homepage_featured_product_details"
              : "homepage_product_shelf_details",
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          View product
        </TrackedLink>
      </div>
    </article>
  );
}

export default function Home() {
  const featuredKit = getFeaturedKit();
  const featuredKitCtaHref = getKitCtaHref(featuredKit);
  const hasCheckout = kitHasCheckout(featuredKit);
  const shelfKits = shelfKitSlugs
    .map((slug) => getKits().find((kit) => kit.slug === slug))
    .filter((kit): kit is AteFloKit => Boolean(kit));
  const secondaryKits = shelfKits.filter((kit) => kit.slug !== featuredKit.slug);

  return (
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="kits" />

      <section className="px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-12">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
            <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 sm:text-sm">
                AI Workflow Kit Store
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Build ready-to-use AI workflow kits for real work.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-700">
                AteFlo turns your details into structured prompts, examples,
                checklists, and action plans you can use with your AI tool.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#build-sample-kit"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Build sample kit
                </a>
                <Link
                  href="/kits"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Explore kits
                </Link>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Prompts", "Examples", "Checklists"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm font-semibold text-teal-900"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <FactoryAssemblyVisual />
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <KitPreviewBuilder
            kitSlug={featuredKit.slug}
            ctaHref={featuredKitCtaHref}
            hasCheckout={hasCheckout}
            sourcePage="homepage"
            variant="compact"
            title="Build a sample local visibility kit"
            showLockedAfterGenerateOnly
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          />
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">
                Product shelf
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Workflow kits packaged like products.
              </h2>
            </div>
            <Link
              href="/kits"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Explore all kits
            </Link>
          </div>

          <div className="mt-6">
            <ProductBox kit={featuredKit} featured />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {secondaryKits.map((kit) => (
              <ProductBox key={kit.slug} kit={kit} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Why not just ask AI?
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                AteFlo helps you use AI more practically.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-slate-600">
              It does not replace ChatGPT, Claude, Gemini, Copilot, or any AI
              tool. It packages the workflow so fewer steps are left to memory.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {scratchVsKit.map((column, columnIndex) => (
              <article
                key={column.title}
                className={`rounded-3xl border p-5 ${
                  columnIndex === 1
                    ? "border-teal-100 bg-teal-50"
                    : "border-slate-100 bg-slate-50/80"
                }`}
              >
                <h3 className="text-lg font-semibold text-slate-950">
                  {column.title}
                </h3>
                <div className="mt-4 grid gap-2">
                  {column.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-teal-100 bg-teal-700 p-6 text-white shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-100">
                Start with a sample kit
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Build the free sample, then unlock the full workflow package.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <a
                href="#build-sample-kit"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
              >
                Build sample kit
              </a>
              <Link
                href="/kits"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-teal-200 bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
              >
                Explore kits
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
