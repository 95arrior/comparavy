import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import Logo from "@/components/Logo";
import MetricBars from "@/components/MetricBars";
import QuickSummaryCard from "@/components/QuickSummaryCard";
import SectionHeading from "@/components/SectionHeading";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import {
  getPublishedGuideBySlug,
  getPublishedGuides,
  type Guide,
} from "@/lib/guides";
import type { AiTool } from "@/types/tool";

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

function ComparisonTable({ guide }: { readonly guide: Guide }) {
  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[840px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-5 py-4 font-semibold">Tool</th>
            <th className="px-5 py-4 font-semibold">Best fit</th>
            <th className="w-48 px-5 py-4 font-semibold">Signals</th>
            <th className="px-5 py-4 font-semibold">Watch for</th>
          </tr>
        </thead>
        <tbody>
          {guide.comparisonRows.map((row, index) => {
            const tool: AiTool | undefined = toolsBySlug.get(row.toolSlug as ToolSlug);

            return (
              <tr
                key={row.toolSlug}
                className={`border-t border-slate-200 align-top ${
                  index === 0 ? "bg-teal-50/40" : "bg-white"
                }`}
              >
                <td className="px-5 py-5">
                  <div className="flex items-center gap-3">
                    {tool ? (
                      <ToolIcon {...tool} size={26} />
                    ) : (
                      <ToolIcon name={row.toolName} slug={row.toolSlug} size={26} />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{row.toolName}</p>
                      {index === 0 && (
                        <p className="mt-1 text-xs font-medium text-teal-700">
                          Best first choice
                        </p>
                      )}
                    </div>
                  </div>
                  {row.freePlan && (
                    <div className="mt-3">
                      <BadgeRow badges={[{ label: "Free plan" }]} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-5 leading-6 text-slate-600">
                  <p className="font-medium text-slate-800">{row.bestFor}</p>
                  <p className="mt-2 text-xs leading-5 text-teal-700">
                    {row.whyConsider}
                  </p>
                </td>
                <td className="px-5 py-5">
                  {tool ? (
                    <MetricBars
                      tool={tool}
                      metrics={["easeScore", "qualityScore"]}
                      compact
                    />
                  ) : (
                    <p className="leading-6 text-slate-600">{row.easeOfUse}</p>
                  )}
                </td>
                <td className="px-5 py-5 leading-6 text-slate-600">
                  {row.watchFor}
                </td>
              </tr>
            );
          })}
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

  const primaryTool = toolsBySlug.get(guide.recommendedToolSlugs[0] as ToolSlug);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-5xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Logo />
            <Link
              href="/tools"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Tools
            </Link>
            <Link
              href="/guides"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Guides
            </Link>
          </div>
          <Link
            href="/finder"
            className="rounded-full border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            Find my tool
          </Link>
        </nav>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <BadgeRow
            badges={[
              { label: guide.category, tone: "teal" },
              { label: `${guide.skillLevel} friendly` },
            ]}
          />
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

        <QuickSummaryCard guide={guide} />

        <section className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/70 p-6 sm:p-8">
          <SectionHeading eyebrow="Quick verdict" marker="⚡">
            Where to start
          </SectionHeading>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-700">
            {guide.quickVerdict}
          </p>
        </section>

        {primaryTool && (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
              <SectionHeading eyebrow="Best for" marker="✅">
                Choose {primaryTool.name} when
              </SectionHeading>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
                {primaryTool.bestFor.map((reason) => (
                  <li key={reason} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
              <SectionHeading eyebrow="Avoid if" marker="⚠️">
                Consider another option when
              </SectionHeading>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
                {primaryTool.avoidIf.map((reason) => (
                  <li key={reason} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

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
          <SectionHeading
            eyebrow="Comparison"
            marker="📊"
            description="Scan the shortlist by practical fit and the signals available in the Comparavy catalog."
          >
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
              <SectionHeading eyebrow="Budget" marker="💸">
                Spend deliberately
              </SectionHeading>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                {guide.moneySavingTips.map((tip) => (
                  <li key={tip} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-teal-50 px-4 py-3 text-sm leading-7 text-slate-700">
                {guide.pricingNote}
              </p>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="FAQ" marker="🔎">
            Common questions
          </SectionHeading>
          <div className="mt-6 space-y-3">
            {guide.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 open:bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  <span>{faq.question}</span>
                  <span className="text-lg font-normal text-teal-700 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl border-t border-slate-100 pt-4 text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading eyebrow="Final verdict" marker="🎯">
            Make the decision
          </SectionHeading>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
            {guide.finalVerdict}
          </p>
          <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7">
            <div>
              <p className="text-lg font-semibold text-white">
                Need a choice matched to your constraints?
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
                {guide.ctaToFinder}
              </p>
            </div>
            <Link
              href="/finder"
              className="mt-6 inline-flex shrink-0 rounded-full bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 sm:mt-0"
            >
              Find my best match
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
