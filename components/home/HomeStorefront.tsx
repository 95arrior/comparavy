import Link from "next/link";
import HomeHeroKitConsole from "@/components/home/HomeHeroKitConsole";
import HomeSampleKitConsole from "@/components/home/HomeSampleKitConsole";
import KitCtaLink from "@/components/kits/KitCtaLink";
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

const shelfKitSlugs = [
  "local-business-ai-visibility-kit",
  "job-application-ai-kit",
  "dating-profile-rewrite-kit",
  "content-repurposing-kit",
] as const;

const comparison = [
  {
    title: "Asking AI from scratch",
    items: ["scattered prompts", "missing steps", "generic drafts"],
  },
  {
    title: "Using an AteFlo kit",
    items: [
      "structured inputs",
      "ordered workflow",
      "review checklist",
      "action plan",
    ],
  },
] as const;

const productCopy: Record<
  string,
  {
    readonly forLabel: string;
    readonly produces: string;
    readonly modules: readonly string[];
  }
> = {
  "local-business-ai-visibility-kit": {
    forLabel: "Local owners",
    produces: "Posts, review replies, page copy, social captions, setup checks.",
    modules: [
      "30 Post Workflows",
      "Review Response Pack",
      "Website Copy Builder",
      "30-Day Plan",
    ],
  },
  "job-application-ai-kit": {
    forLabel: "Job seekers",
    produces: "Resume bullets, cover letters, interview answers, follow-ups.",
    modules: [
      "Job Post Analyzer",
      "Resume Bullet Builder",
      "Cover Letter Builder",
      "Final Checklist",
    ],
  },
  "dating-profile-rewrite-kit": {
    forLabel: "Profile rewrites",
    produces: "Bio options, prompt answers, opening lines, truth checks.",
    modules: ["Input Worksheet", "Bio Builder", "Cliche Check"],
  },
  "content-repurposing-kit": {
    forLabel: "Creators",
    produces: "Captions, outlines, newsletter ideas, platform-ready snippets.",
    modules: ["Source Worksheet", "Prompt Sequence", "Platform Checklist"],
  },
};

function ProductBox({
  kit,
  featured = false,
}: {
  readonly kit: AteFloKit;
  readonly featured?: boolean;
}) {
  const copy = productCopy[kit.slug];
  const href = getKitHref(kit);
  const ctaHref = getKitCtaHref(kit);
  const hasCheckout = kitHasCheckout(kit);
  const active = kit.status === "active";

  return (
    <article
      id={kit.slug}
      className={`ateflo-card-lift relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white shadow-sm ${
        featured
          ? "border-teal-200 p-5 ring-1 ring-teal-100 sm:p-6 lg:col-span-2"
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
          {kit.productLabel ?? "Kit box"}
        </span>
        <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          {kit.status === "active" ? kit.priceLabel : "Coming soon"}
        </span>
      </div>

      <h3
        className={`mt-5 font-semibold tracking-tight text-slate-950 ${
          featured ? "text-3xl sm:text-4xl" : "text-xl"
        }`}
      >
        {kit.title}
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            For
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {copy.forLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Produces
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {copy.produces}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Inside
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {copy.modules.map((module) => (
            <span
              key={module}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {module}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
        {active ? (
          <KitCtaLink
            href={ctaHref}
            kitSlug={kit.slug}
            sourcePage="homepage"
            actionLocation={featured ? "homepage_featured_box" : "homepage_product_box"}
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
              ? "homepage_featured_box_details"
              : "homepage_product_box_details",
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          View kit
        </TrackedLink>
      </div>
    </article>
  );
}

export default function HomeStorefront() {
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

      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid min-h-[calc(100svh-104px)] w-full max-w-6xl gap-5 overflow-hidden rounded-[2.25rem] border border-slate-800 bg-slate-950 p-4 shadow-sm sm:p-5 lg:grid-cols-[0.35fr_0.65fr] lg:items-center lg:p-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 text-white sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">
              AI Workflow Kit Store
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build AI workflow kits for work worth finishing.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">
              AteFlo turns your details into packaged prompts, examples,
              checklists, and action plans you can use with your AI tool.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <a
                href="#build-sample-kit"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Build sample kit
              </a>
              <Link
                href="/kits"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Explore kits
              </Link>
            </div>
          </div>
          <HomeHeroKitConsole kitSlug={featuredKit.slug} />
        </div>
      </section>

      <HomeSampleKitConsole
        kitSlug={featuredKit.slug}
        ctaHref={featuredKitCtaHref}
        hasCheckout={hasCheckout}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              Product shelf
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Pick a kit box.
            </h2>
          </div>
          <Link
            href="/kits"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Explore kits
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ProductBox kit={featuredKit} featured />
          {secondaryKits.map((kit) => (
            <ProductBox key={kit.slug} kit={kit} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                Why not just ask AI?
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Use the AI tool. Bring the workflow.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">
              AteFlo helps users organize the work before they paste anything
              into ChatGPT, Claude, Gemini, Copilot, or another AI tool.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {comparison.map((column, index) => (
              <article
                key={column.title}
                className={`rounded-3xl border p-4 ${
                  index === 1
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
                      className="rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
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
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-teal-100 bg-teal-700 p-6 text-white shadow-sm sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-100">
                Start with a sample kit
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Build the sample, then unlock the workflow.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
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
