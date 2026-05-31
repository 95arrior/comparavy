import type { Metadata } from "next";
import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import CopyTextButton from "@/components/CopyTextButton";
import SiteHeader from "@/components/SiteHeader";
import TrackedLink from "@/components/TrackedLink";
import { getPublishedGuides, type Guide } from "@/lib/guides";
import { SITE_TAGLINE } from "@/lib/site";

const HOME_TITLE = "AteFlo | AI Shortcuts for Real Work";
const HOME_DESCRIPTION =
  "Copy practical AI shortcuts for turning notes, documents, product ideas, and business tasks into finished outputs.";

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

const needs = [
  {
    title: "Summarize a document",
    detail: "Turn PDFs, notes, and transcripts into useful briefs.",
    href: "/shortcuts",
  },
  {
    title: "Ship content",
    detail: "Make blog posts, carousels, captions, and newsletters easier to finish.",
    href: "/shortcuts",
  },
  {
    title: "Polish client work",
    detail: "Clean up emails, recaps, proposals, and small business assets.",
    href: "/shortcuts",
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

const starterShortcuts = [
  {
    title: "Turn messy notes into a clear action plan",
    category: "Notes to output",
    detail:
      "Paste raw notes and ask AI for decisions, tasks, owners, dates, and open questions.",
    prompt:
      "Turn these messy notes into a clear action plan. Separate decisions, tasks, owners, deadlines, open questions, and anything I should verify.",
  },
  {
    title: "Summarize a PDF into study or work notes",
    category: "Document workflow",
    detail:
      "Extract the useful points, quotes, definitions, and next actions without losing context.",
    prompt:
      "Summarize this document for practical use. Give me the main points, useful quotes, definitions, risks, and a short checklist of what to do next.",
  },
  {
    title: "Turn one rough idea into a finished first draft",
    category: "Idea to draft",
    detail:
      "Move from a loose idea to an outline, draft, and review checklist you can improve.",
    prompt:
      "Help me turn this rough idea into a finished first draft. Create an outline, draft the first version, then list what I should fact-check and improve.",
  },
] as const;

const moneyStarterWorkflows = [
  {
    title: "Client recap from meeting notes",
    detail:
      "Convert notes into a concise recap with decisions, next steps, and polite follow-up language.",
  },
  {
    title: "One-page offer from a service idea",
    detail:
      "Shape a small business service into audience, promise, deliverables, pricing caveats, and next step.",
  },
  {
    title: "Product description from rough bullets",
    detail:
      "Turn feature notes into clear benefits, use cases, objections, and a polished product draft.",
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
      <h3 className="ateflo-clamp-3 mt-4 text-xl font-semibold leading-7 tracking-tight text-slate-950 md:min-h-[5.25rem]">
        <Link href={`/shortcuts/${guide.slug}`} className="transition hover:text-teal-700">
          {guide.title}
        </Link>
      </h3>
      <p className="ateflo-clamp-4 mt-3 text-sm leading-6 text-slate-600">
        {guideSummary(guide)}
      </p>
      <Link
        href={`/shortcuts/${guide.slug}`}
        className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
      >
        {label} <span aria-hidden="true">&rarr;</span>
      </Link>
    </article>
  );
}

function StarterShortcutCard({
  shortcut,
}: {
  readonly shortcut: (typeof starterShortcuts)[number];
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
        {shortcut.category}
      </p>
      <h3 className="mt-3 text-xl font-semibold leading-7 tracking-tight text-slate-950 md:min-h-[3.5rem]">
        {shortcut.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:min-h-[4.5rem]">
        {shortcut.detail}
      </p>
      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:min-h-[11.5rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Starter prompt
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{shortcut.prompt}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-3 pt-5">
        <CopyTextButton text={shortcut.prompt} />
        <TrackedLink
          href="/finder"
          eventName="finder_cta_click"
          eventParams={{
            source_page: "homepage",
            action_location: "starter_shortcut_card",
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Find a tool
        </TrackedLink>
      </div>
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
    <main className="ateflo-page-shell min-h-screen bg-[#FBFAF7] text-slate-900">
      <SiteHeader active="shortcuts" />

      <section className="px-4 pb-10 pt-9 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 sm:text-sm">
              {SITE_TAGLINE}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:mt-5 sm:text-5xl lg:text-6xl">
              Finish real work faster with AI.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
              Copy practical AI workflows for turning messy notes, PDFs, blog
              posts, product ideas, and small business tasks into finished outputs.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/shortcuts"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Browse Shortcuts <span aria-hidden="true">&rarr;</span>
              </Link>
              <TrackedLink
                href="/finder"
                eventName="finder_cta_click"
                eventParams={{
                  source_page: "homepage",
                  action_location: "hero_secondary",
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-teal-200 hover:bg-teal-50"
              >
                Find the Right AI Tool <span aria-hidden="true">&rarr;</span>
              </TrackedLink>
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
              href="/shortcuts"
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
              href="/shortcuts"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              View all shortcuts <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {popularShortcuts.length > 0
              ? popularShortcuts.map((guide) => (
                  <ShortcutCard key={guide.slug} guide={guide} />
                ))
              : starterShortcuts.map((shortcut) => (
                  <StarterShortcutCard key={shortcut.title} shortcut={shortcut} />
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
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold leading-6 text-slate-950 group-hover:text-teal-800 md:min-h-12">
                    {choice.title}
                  </h3>
                  <span className="text-slate-400 transition group-hover:text-teal-700" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
                <p className="mt-auto pt-2 text-sm leading-6 text-slate-600">{choice.detail}</p>
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
            {moneyWorkflows.length > 0
              ? moneyWorkflows.map((guide) => (
                  <article key={guide.slug} className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                      {guide.category}
                    </p>
                    <h3 className="ateflo-clamp-3 mt-4 text-xl font-semibold leading-7 tracking-tight text-white md:min-h-[5.25rem]">
                      <Link href={`/shortcuts/${guide.slug}`} className="transition hover:text-teal-200">
                        {guide.title}
                      </Link>
                    </h3>
                    <p className="ateflo-clamp-3 mt-3 text-sm leading-6 text-slate-300">{guide.useCase}</p>
                    <Link
                      href={`/shortcuts/${guide.slug}`}
                      className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-teal-200 transition hover:text-white"
                    >
                      Open workflow <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </article>
                ))
              : moneyStarterWorkflows.map((workflow) => (
                  <article key={workflow.title} className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                      Practical workflow
                    </p>
                    <h3 className="mt-4 text-xl font-semibold leading-7 tracking-tight text-white md:min-h-[3.5rem]">
                      {workflow.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{workflow.detail}</p>
                    <TrackedLink
                      href="/finder"
                      eventName="finder_cta_click"
                      eventParams={{
                        source_page: "homepage",
                        action_location: "money_workflow_card",
                      }}
                      className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-teal-200 transition hover:border-teal-200 hover:text-white"
                    >
                      Match a tool <span aria-hidden="true">&rarr;</span>
                    </TrackedLink>
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
              <div key={point.title} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-[#FBFAF7] p-5">
                <h3 className="text-base font-semibold leading-6 text-slate-950 md:min-h-12">{point.title}</h3>
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
          {latestShortcuts.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestShortcuts.map((guide) => (
                <ShortcutCard key={guide.slug} guide={guide} label="Read shortcut" />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold text-slate-950">
                Published shortcuts are queued behind the quality bar.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                AteFlo only shows shortcuts after they pass review. Until then,
                use the starter prompts above or answer the finder questions to
                choose a workflow-safe tool.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-2xl border border-teal-100 bg-teal-50 px-6 py-8 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
              Need a tool shortlist?
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Not sure which shortcut or tool fits?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Answer one practical question first: what are you trying to finish?
              The finder will narrow the tool options from there.
            </p>
          </div>
          <TrackedLink
            href="/finder"
            eventName="finder_cta_click"
            eventParams={{
              source_page: "homepage",
              action_location: "bottom_cta",
            }}
            className="mt-6 inline-flex shrink-0 items-center justify-center rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 sm:mt-0"
          >
            Find the Right AI Tool
          </TrackedLink>
        </div>
      </section>
    </main>
  );
}
