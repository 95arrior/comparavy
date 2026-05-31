import type { Metadata } from "next";
import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import Logo from "@/components/Logo";
import { getPublishedGuides, type Guide } from "@/lib/guides";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Finish Real Work Faster with AI",
  description:
    "Copy practical AI workflows for turning messy notes, PDFs, blog posts, product ideas, and small business tasks into finished outputs.",
  openGraph: {
    title: `${SITE_NAME} | Finish real work faster with AI`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    title: `${SITE_NAME} | Finish real work faster with AI`,
    description: SITE_DESCRIPTION,
  },
};

const needs = [
  {
    title: "Summarize a document",
    detail: "Turn PDFs, notes, and transcripts into useful briefs.",
    href: "/guides",
  },
  {
    title: "Ship content",
    detail: "Make blog posts, carousels, captions, and newsletters easier to finish.",
    href: "/guides",
  },
  {
    title: "Polish client work",
    detail: "Clean up emails, recaps, proposals, and small business assets.",
    href: "/guides",
  },
  {
    title: "Pick a tool",
    detail: "Use the finder when the workflow is clear but the tool is not.",
    href: "/finder",
  },
] as const;

const whyPoints = [
  {
    title: "Built around outputs",
    detail: "Start with what you need to finish, not a generic list of AI apps.",
  },
  {
    title: "Practical prompts and steps",
    detail: "Each shortcut gives you a workflow you can copy into real work.",
  },
  {
    title: "Tool choice stays secondary",
    detail: "Tools support the job. The shortcut explains when each one actually fits.",
  },
  {
    title: "Published quality bar",
    detail: "Only published shortcuts appear publicly; drafts and approvals stay hidden.",
  },
] as const;

function guideSummary(guide: Guide): string {
  return guide.quickAnswer ?? guide.quickDecision ?? guide.quickVerdict ?? guide.metaDescription;
}

function ShortcutCard({
  guide,
  label = "Open shortcut",
}: {
  readonly guide: Guide;
  readonly label?: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <BadgeRow
        badges={[
          { label: guide.category, tone: "teal" },
          { label: guide.skillLevel },
        ]}
      />
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
        <Link href={`/guides/${guide.slug}`} className="transition hover:text-teal-700">
          {guide.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
        {guideSummary(guide)}
      </p>
      <Link
        href={`/guides/${guide.slug}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
      >
        {label} <span aria-hidden="true">&rarr;</span>
      </Link>
    </article>
  );
}

function pickMoneyWorkflows(guides: readonly Guide[]): readonly Guide[] {
  const moneyTerms = ["business", "client", "etsy", "proposal", "real estate", "selling", "service", "product"];
  const matches = guides.filter((guide) => {
    const text = `${guide.title} ${guide.useCase} ${guide.persona} ${guide.category}`.toLowerCase();
    return moneyTerms.some((term) => text.includes(term));
  });

  return (matches.length >= 3 ? matches : guides.slice(3)).slice(0, 3);
}

export default function Home() {
  const guides = getPublishedGuides();
  const popularShortcuts = guides.slice(0, 3);
  const moneyWorkflows = pickMoneyWorkflows(guides);
  const latestShortcuts = guides.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-slate-900">
      <header className="border-b border-slate-200/80 bg-[#FBFAF7]/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo />
          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/guides"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-teal-800"
            >
              Shortcuts
            </Link>
            <Link
              href="/tools"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-teal-800"
            >
              Tools
            </Link>
            <Link
              href="/finder"
              className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
            >
              Finder
            </Link>
          </nav>
        </div>
      </header>

      <section className="px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              {SITE_TAGLINE}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Finish real work faster with AI.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Copy practical AI workflows for turning messy notes, PDFs, blog
              posts, product ideas, and small business tasks into finished outputs.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/guides"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Browse Shortcuts <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/finder"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-teal-200 hover:bg-teal-50"
              >
                Find the Right AI Tool <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-teal-700">AI Shortcut Engine</p>
            <div className="mt-6 space-y-5">
              {[
                ["01", "Paste the messy input"],
                ["02", "Follow a practical workflow"],
                ["03", "Leave with a finished output"],
              ].map(([step, label]) => (
                <div key={step} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs font-semibold text-teal-700">
                    {step}
                  </span>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/guides"
              className="mt-7 flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Start with shortcuts <span aria-hidden="true">&rarr;</span>
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-teal-700">Popular AI shortcuts</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Copy a workflow and finish the task.
              </h2>
            </div>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              View all shortcuts <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {popularShortcuts.map((guide) => (
              <ShortcutCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-teal-700">Choose what you need to finish</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Start from the output, then pick the path.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {needs.map((choice) => (
              <Link
                key={choice.title}
                href={choice.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-slate-950 group-hover:text-teal-800">
                    {choice.title}
                  </h3>
                  <span className="text-slate-400 transition group-hover:text-teal-700" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{choice.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-slate-950 px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-teal-300">Money workflows</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white">
            Practical shortcuts for client, product, and small business work.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {moneyWorkflows.map((guide) => (
              <article key={guide.slug} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                  {guide.category}
                </p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                  <Link href={`/guides/${guide.slug}`} className="transition hover:text-teal-200">
                    {guide.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{guide.useCase}</p>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-200 transition hover:text-white"
                >
                  Open workflow <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-teal-700">Why AteFlo</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
            Useful shortcuts, clear limits, and fewer decisions.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyPoints.map((point) => (
              <div key={point.title} className="rounded-2xl border border-slate-200 bg-[#FBFAF7] p-5">
                <h3 className="text-base font-semibold text-slate-950">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{point.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-teal-700">Latest shortcuts</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Recently published workflows.
              </h2>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestShortcuts.map((guide) => (
              <ShortcutCard key={guide.slug} guide={guide} label="Read shortcut" />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-2xl border border-teal-100 bg-teal-50 px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Finder CTA
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Not sure which shortcut or tool fits?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Answer one practical question first: what are you trying to finish?
              The finder will narrow the tool options from there.
            </p>
          </div>
          <Link
            href="/finder"
            className="mt-6 inline-flex shrink-0 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 sm:mt-0"
          >
            Find the Right AI Tool
          </Link>
        </div>
      </section>
    </main>
  );
}
