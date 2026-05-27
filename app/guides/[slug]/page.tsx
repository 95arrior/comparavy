import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublishedGuideBySlug,
  getPublishedGuides,
  type Guide,
} from "@/lib/guides";

interface GuidePageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getPublishedGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    return { title: "Guide Not Found | Comparavy" };
  }

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    keywords: [guide.primaryKeyword, ...guide.secondaryKeywords],
  };
}

function SectionHeading({
  eyebrow,
  children,
}: {
  readonly eyebrow: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {children}
      </h2>
    </div>
  );
}

function ComparisonTable({ guide }: { readonly guide: Guide }) {
  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-5 py-4 font-semibold">Tool</th>
            <th className="px-5 py-4 font-semibold">Best for</th>
            <th className="px-5 py-4 font-semibold">Free plan listed</th>
            <th className="px-5 py-4 font-semibold">Ease</th>
            <th className="px-5 py-4 font-semibold">Watch for</th>
          </tr>
        </thead>
        <tbody>
          {guide.comparisonRows.map((row) => (
            <tr key={row.toolSlug} className="border-t border-slate-200 align-top">
              <td className="px-5 py-5">
                <p className="font-semibold text-slate-900">{row.toolName}</p>
                <p className="mt-2 text-xs leading-5 text-teal-700">
                  {row.whyConsider}
                </p>
              </td>
              <td className="px-5 py-5 leading-6 text-slate-600">{row.bestFor}</td>
              <td className="px-5 py-5 text-slate-600">
                {row.freePlan ? "Yes" : "Not listed"}
              </td>
              <td className="px-5 py-5 leading-6 text-slate-600">{row.easeOfUse}</td>
              <td className="px-5 py-5 leading-6 text-slate-600">{row.watchFor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-5xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/guides"
            className="text-sm font-semibold tracking-[0.18em] text-teal-700"
          >
            COMPARAVY GUIDES
          </Link>
          <Link
            href="/finder"
            className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            Find my tool
          </Link>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-800">
              {guide.category}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-slate-700">
              {guide.skillLevel} friendly
            </span>
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            For {guide.persona} focused on {guide.useCase}.
          </p>
          <dl className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-900">Budget angle</dt>
              <dd className="mt-2 leading-6 text-slate-600">{guide.budgetAngle}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Primary keyword</dt>
              <dd className="mt-2 leading-6 text-slate-600">
                {guide.primaryKeyword}
              </dd>
            </div>
          </dl>
        </header>

        <section className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/60 p-6 sm:p-8">
          <SectionHeading eyebrow="Quick verdict">Where to start</SectionHeading>
          <p className="mt-5 text-base leading-8 text-slate-700">
            {guide.quickVerdict}
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Key takeaways">What matters most</SectionHeading>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {guide.keyTakeaways.map((takeaway) => (
              <li
                key={takeaway}
                className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"
              >
                {takeaway}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Comparison table">
            Shortlisted tools
          </SectionHeading>
          <ComparisonTable guide={guide} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <SectionHeading eyebrow="Decision path">
              Match your priority
            </SectionHeading>
            <div className="mt-6 space-y-4">
              {guide.decisionPath.map((step) => (
                <div key={step.situation} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-600">{step.situation}</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    Choose {step.recommendation}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {step.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Money-saving tips
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {guide.moneySavingTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-3xl border border-teal-100 bg-teal-50/60 p-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Pricing note
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {guide.pricingNote}
              </p>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="FAQ">Common questions</SectionHeading>
          <div className="mt-6 divide-y divide-slate-200">
            {guide.faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="cursor-pointer list-none pr-4 font-semibold text-slate-900">
                  {faq.question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Final verdict">Make the decision</SectionHeading>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
            {guide.finalVerdict}
          </p>
          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
            <p className="max-w-xl text-sm leading-7 text-slate-200">
              {guide.ctaToFinder}
            </p>
            <Link
              href="/finder"
              className="mt-5 inline-flex shrink-0 rounded-full bg-teal-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 sm:mt-0"
            >
              Use the finder
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
