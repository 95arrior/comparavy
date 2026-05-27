import type { Metadata } from "next";
import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import Logo from "@/components/Logo";
import { getPublishedGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Comparavy | Find the Right AI Tool for Your Workflow",
  description:
    "Compare AI tools by use case, budget, skill level, and workflow. Use the AI Tool Finder or browse practical decision guides.",
};

const quickChoices = [
  {
    title: "Make videos",
    detail: "Short clips, captions, and editing workflows",
  },
  {
    title: "Write content",
    detail: "Articles, emails, and clearer English",
  },
  {
    title: "Design images",
    detail: "Social visuals and creative concepts",
  },
  {
    title: "Grow online",
    detail: "SEO, campaigns, and landing pages",
  },
  {
    title: "Automate work",
    detail: "Admin tasks and repeatable processes",
  },
  {
    title: "Start free",
    detail: "Explore options before subscribing",
  },
] as const;

const trustPoints = [
  {
    title: "Quick verdict first",
    detail: "See the recommended starting option before reading the full comparison.",
  },
  {
    title: "Best for / Not for / Avoid if",
    detail: "Understand tradeoffs before putting a tool into your workflow.",
  },
  {
    title: "Pricing notes without fake claims",
    detail: "We direct you to current official plan details before subscribing.",
  },
  {
    title: "Recommendations based on fit, not hype",
    detail: "Use case, budget, and skill level shape every decision path.",
  },
] as const;

export default function Home() {
  const latestGuides = getPublishedGuides().slice(0, 6);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo />
          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/guides"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-teal-800"
            >
              Guides
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

      <section className="px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              AI Tool Decision Engine
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Find the right AI tool for your exact workflow.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Answer a few simple questions or browse practical AI tool guides
              built around real use cases, budgets, and skill levels.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/finder"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Start AI Tool Finder <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-teal-200 hover:bg-teal-50"
              >
                Browse AI Guides <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-teal-700">A faster decision</p>
            <div className="mt-6 space-y-5">
              {[
                ["01", "Choose your real use case"],
                ["02", "Set budget and experience level"],
                ["03", "Compare recommended tools"],
              ].map(([step, label]) => (
                <div key={step} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-700">
                    {step}
                  </span>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                </div>
              ))}
            </div>
            <Link
              href="/finder"
              className="mt-7 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Get my shortlist <span aria-hidden="true">&rarr;</span>
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            What do you need AI to help with?
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Start with your task, then narrow results by budget and skill level.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickChoices.map((choice) => (
              <Link
                key={choice.title}
                href="/finder"
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-slate-900 group-hover:text-teal-800">
                    {choice.title}
                  </h3>
                  <span className="text-slate-400 transition group-hover:text-teal-700" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {choice.detail}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-teal-700">Latest guides</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Practical decisions by workflow
              </h2>
            </div>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              View all guides <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latestGuides.map((guide) => (
              <article
                key={guide.slug}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300"
              >
                <BadgeRow
                  badges={[
                    { label: guide.category, tone: "teal" },
                    { label: guide.skillLevel },
                  ]}
                />
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="transition hover:text-teal-700"
                  >
                    {guide.title}
                  </Link>
                </h3>
                <p className="mt-4 text-sm font-medium text-slate-800">
                  For {guide.persona}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {guide.metaDescription}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Use case
                </p>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-700">
                  {guide.useCase}
                </p>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                >
                  Read guide <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-teal-700">Why Comparavy</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">
            Built for a decision, not endless browsing.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-base font-semibold text-slate-900">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{point.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav aria-label="Footer navigation" className="flex items-center gap-6 text-sm">
            <Link href="/guides" className="text-slate-600 transition hover:text-teal-700">
              Guides
            </Link>
            <Link href="/finder" className="text-slate-600 transition hover:text-teal-700">
              Finder
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
