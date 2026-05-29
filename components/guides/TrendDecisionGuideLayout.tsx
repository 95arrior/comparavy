import ActionLinks from "@/components/ActionLinks";
import FaqAccordion from "@/components/FaqAccordion";
import GuideToolActions from "@/components/guides/GuideToolActions";
import SectionHeading from "@/components/SectionHeading";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { Guide } from "@/lib/guides";
import Link from "next/link";

function getTool(toolSlug: string) {
  return toolsBySlug.get(toolSlug as ToolSlug);
}

export default function TrendDecisionGuideLayout({ guide }: { readonly guide: Guide }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Quick decision" marker="⚡">
          Choose a path fast
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.quickDecision ?? guide.quickVerdict}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Why people compare these tools" marker="❓">
          What is driving the decision
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{guide.contentGap}</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{guide.uniqueAngle}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Best for each situation" marker="🎯">
          Match the tool to the job
        </SectionHeading>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {guide.bestPicksBySituation.map((pick, index) => {
            const tool = getTool(pick.toolSlug);

            if (!tool) {
              return null;
            }

            return (
              <article
                key={pick.toolSlug}
                className={`flex h-full flex-col rounded-3xl border p-4 shadow-sm sm:p-5 ${
                  index === 0 ? "border-teal-200 bg-teal-50/40" : "border-slate-200 bg-slate-50/70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ToolIcon {...tool} size={24} />
                  <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
                    <Link href={`/tools/${tool.slug}`} className="transition hover:text-teal-700">
                      {tool.name}
                    </Link>
                  </h3>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{pick.situation}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{pick.why}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tool.primaryTags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <GuideToolActions
                  className="mt-4"
                  slug={tool.slug}
                  name={tool.name}
                  officialUrl={tool.officialUrl}
                  affiliateUrl={tool.affiliateUrl}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Comparison" marker="📊">
          Shortlist at a glance
        </SectionHeading>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Tool</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
                <th className="px-4 py-3 font-semibold">Ease</th>
                <th className="px-4 py-3 font-semibold">Why consider</th>
                <th className="px-4 py-3 font-semibold">Watch for</th>
              </tr>
            </thead>
            <tbody>
              {guide.comparisonRows.map((row, index) => {
                const tool = getTool(row.toolSlug);

                return (
                  <tr
                    key={row.toolSlug}
                    className={`border-t border-slate-200 align-top ${
                      index === 0 ? "bg-teal-50/35" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {tool ? (
                          <ToolIcon {...tool} size={26} />
                        ) : (
                          <ToolIcon name={row.toolName} slug={row.toolSlug} size={26} />
                        )}
                        <div className="min-w-0">
                          <p className="max-w-44 truncate whitespace-nowrap font-semibold text-slate-900">
                            {tool ? (
                              <Link
                                href={`/tools/${tool.slug}`}
                                className="block truncate transition hover:text-teal-700"
                              >
                                {row.toolName}
                              </Link>
                            ) : (
                              row.toolName
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 leading-6 text-slate-700">{row.bestFor}</td>
                    <td className="px-4 py-3 leading-6 text-slate-700">{row.easeOfUse}</td>
                    <td className="px-4 py-3 leading-6 text-slate-700">{row.whyConsider}</td>
                    <td className="px-4 py-3 leading-6 text-slate-700">{row.watchFor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="What to avoid" marker="⛔">
          Keep your shortlist honest
        </SectionHeading>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
          {[...guide.whoShouldAvoidThis, ...(guide.commonMistakes ?? [])].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Recommended workflow" marker="🧭">
          Test the best option in context
        </SectionHeading>
        <ol className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
          {guide.decisionPath.map((step, index) => (
            <li key={step.situation} className="rounded-2xl bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">Step {index + 1}</p>
              <p className="mt-2">{step.situation}</p>
              <p className="mt-2">{step.reason}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Final recommendation" marker="🏁">
          Decide and move on
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a different shortlist?</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{guide.ctaToFinder}</p>
          </div>
          <ActionLinks
            className="mt-5 sm:mt-0"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/guides", label: "Back to Guides" },
            ]}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="FAQ" marker="🔎">
          Common questions
        </SectionHeading>
        <div className="mt-6">
          <FaqAccordion items={guide.faq ?? guide.faqs} />
        </div>
      </section>
    </div>
  );
}
