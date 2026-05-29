import ActionLinks from "@/components/ActionLinks";
import CommonMistakes from "@/components/guides/CommonMistakes";
import SectionHeading from "@/components/SectionHeading";
import ToolIcon from "@/components/ToolIcon";
import type { Guide } from "@/lib/guides";
import { resolveGuideTool } from "@/lib/guideTools";
import Link from "next/link";

function getTool(toolSlug: string, toolName?: string) {
  return resolveGuideTool(toolSlug, toolName);
}

export default function TrendDecisionGuideLayout({ guide }: { readonly guide: Guide }) {
  const whatChanged = guide.whatChanged ?? guide.uniqueAngle;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Why people are comparing this">What is driving the decision</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{guide.contentGap}</p>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-teal-50/80 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Quick decision">Choose a path fast</SectionHeading>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
          {guide.quickDecision ?? guide.quickVerdict}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Best for each situation">Match the tool to the trend</SectionHeading>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {guide.bestPicksBySituation.map((pick, index) => {
            const tool = getTool(pick.toolSlug, pick.toolName);

            return (
              <article
                key={pick.toolSlug}
                className={`rounded-2xl border p-4 ${
                  index === 0 ? "border-teal-200 bg-teal-50/40" : "border-slate-100 bg-slate-50/70"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {tool ? <ToolIcon {...tool} size={24} /> : <ToolIcon name={pick.toolName} slug={pick.toolSlug} size={24} />}
                  <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-base font-semibold text-slate-900">
                    <Link href={`/tools/${tool?.slug ?? pick.toolSlug}`} className="block truncate transition hover:text-teal-700">
                      {tool?.name ?? pick.toolName}
                    </Link>
                  </h3>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{pick.situation}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{pick.why}</p>
              </article>
            );
          })}
        </div>
      </section>

      {whatChanged && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="What changed or why it matters">The practical shift</SectionHeading>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{whatChanged}</p>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Comparison">Shortlist at a glance</SectionHeading>
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
                const tool = getTool(row.toolSlug, row.toolName);

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
                        <p className="max-w-44 truncate whitespace-nowrap font-semibold text-slate-900">
                          <Link href={`/tools/${tool?.slug ?? row.toolSlug}`} className="block truncate transition hover:text-teal-700">
                            {tool?.name ?? row.toolName}
                          </Link>
                        </p>
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

      <CommonMistakes
        eyebrow="What to avoid"
        title="Keep the comparison honest"
        mistakes={guide.whatToAvoid ?? guide.mistakesToAvoid ?? guide.commonMistakes ?? guide.whoShouldAvoidThis}
        fallback={[
          "Do not treat trend interest as proof that a tool fits your actual workflow.",
          "Do not claim breaking news unless the guide data explicitly supports it.",
          "Do not choose a tool before checking the source material, output format, and review effort.",
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Recommended workflow">Test the best option in context</SectionHeading>
        <ol className="mt-5 grid gap-3 lg:grid-cols-2">
          {guide.decisionPath.map((step, index) => (
            <li key={`${step.situation}-${index}`} className="rounded-2xl bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{step.situation}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{step.reason}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Final recommendation">Decide and move on</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a different shortlist?</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{guide.finderCTA || guide.ctaToFinder}</p>
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
    </div>
  );
}
