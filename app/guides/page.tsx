import type { Metadata } from "next";
import Link from "next/link";
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
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.18em] text-teal-700"
            >
              COMPARAVY
            </Link>
            <Link
              href="/finder"
              className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
            >
              Use the finder
            </Link>
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
            {guides.map((guide) => (
              <article
                key={guide.slug}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap gap-2 text-xs font-medium text-teal-800">
                  <span className="rounded-full bg-teal-50 px-3 py-1.5">
                    {guide.category}
                  </span>
                  <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-600">
                    {guide.skillLevel}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="transition hover:text-teal-700"
                  >
                    {guide.title}
                  </Link>
                </h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  {guide.quickVerdict}
                </p>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    For {guide.persona}
                  </p>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Read guide
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
