import type { Metadata } from "next";
import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import Logo from "@/components/Logo";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { getPublishedGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "AI Tool Guides | Comparavy",
  description:
    "Practical AI tool comparisons for creators, solopreneurs, and small businesses.",
};

export default function GuidesPage() {
  const guides = getPublishedGuides();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-14">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <Logo />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tools"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-teal-800"
              >
                Tools
              </Link>
              <Link
                href="/finder"
                className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
              >
                Use the finder
              </Link>
            </div>
          </nav>
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            AI Tool Guides
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Practical guides for choosing tools by workflow.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Compare realistic starting options, tradeoffs, and budget-conscious
            decision paths before testing a tool yourself.
          </p>
          <div className="mt-9 rounded-2xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
            <p className="max-w-xl text-sm leading-7 text-slate-300">
              Not sure which guide fits? Answer five questions and get a shortlist
              matched to your use case, budget, and experience level.
            </p>
            <Link
              href="/finder"
              className="mt-5 inline-flex shrink-0 rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 sm:mt-0"
            >
              Find my tool
            </Link>
          </div>
        </header>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Published guides</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Start with a use case
              </h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">
              {guides.length} guides available
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {guides.map((guide) => {
              const primaryTool = toolsBySlug.get(
                guide.recommendedToolSlugs[0] as ToolSlug,
              );

              return (
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
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="transition hover:text-teal-700"
                    >
                      {guide.title}
                    </Link>
                  </h3>
                  <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        For
                      </dt>
                      <dd className="mt-1 font-medium text-slate-800">
                        {guide.persona}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Use case
                      </dt>
                      <dd className="mt-1 leading-6 text-slate-700">{guide.useCase}</dd>
                    </div>
                  </dl>
                  {primaryTool && (
                    <div className="mt-5 flex items-center gap-3">
                      <ToolIcon {...primaryTool} size={26} />
                      <div>
                        <p className="text-xs text-slate-500">Recommended start</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {primaryTool.name}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="mt-5 flex-1 text-sm leading-7 text-slate-600">
                    {guide.quickVerdict}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      Read guide
                    </Link>
                    <Link
                      href="/finder"
                      className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
                    >
                      Use finder
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
