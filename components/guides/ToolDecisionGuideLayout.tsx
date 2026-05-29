import ActionLinks from "@/components/ActionLinks";
import DecisionTree from "@/components/guides/DecisionTree";
import GuideToolCard from "@/components/guides/GuideToolCard";
import SectionHeading from "@/components/SectionHeading";
import ToolIcon from "@/components/ToolIcon";
import type { Guide, GuideDecisionStep } from "@/lib/guides";
import { resolveGuideTool } from "@/lib/guideTools";
import Link from "next/link";

function formatBudgetLabel(freePlan: boolean, slug?: string): string {
  if (freePlan) {
    return "Free plan";
  }

  return slug ? "Paid" : "Pricing varies";
}

function getTool(toolSlug: string, toolName?: string) {
  return resolveGuideTool(toolSlug, toolName);
}

function decisionSteps(guide: Guide): readonly GuideDecisionStep[] {
  if (guide.decisionTree && guide.decisionTree.length > 0) {
    return guide.decisionTree;
  }

  if (guide.decisionPath.length > 0) {
    return guide.decisionPath;
  }

  return guide.bestPicksBySituation.map((pick) => ({
    situation: pick.situation,
    recommendation: pick.toolName,
    reason: pick.why,
  }));
}

export default function ToolDecisionGuideLayout({ guide }: { readonly guide: Guide }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-teal-100 bg-teal-50/80 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Quick verdict">The shortest path to a decision</SectionHeading>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
          {guide.quickVerdict}
        </p>
      </section>

      <DecisionTree steps={decisionSteps(guide)} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          eyebrow="Best picks by situation"
          description="Start with the situation that sounds most like your real workflow."
        >
          Match the tool to the job
        </SectionHeading>
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
                <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{pick.situation}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{pick.why}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          eyebrow="Comparison table"
          description="The table is scrollable on mobile so the page stays readable."
        >
          Compare the shortlist
        </SectionHeading>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Tool</th>
                <th className="px-4 py-3 font-semibold">Best for</th>
                <th className="px-4 py-3 font-semibold">Pricing</th>
                <th className="px-4 py-3 font-semibold">Setup</th>
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
                    <td className="px-4 py-3 leading-6 text-slate-700">
                      {tool ? formatBudgetLabel(tool.freePlan, tool.slug) : "Paid or free"}
                    </td>
                    <td className="px-4 py-3 leading-6 text-slate-700">
                      {tool?.setupDifficulty ?? row.easeOfUse}
                    </td>
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
        <SectionHeading
          eyebrow="Tool cards"
          description="Use these details to confirm the choice you already narrowed down above."
        >
          Detailed recommendations
        </SectionHeading>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {guide.recommendedTools.map((tool, index) => {
            const comparison = guide.comparisonRows.find((row) => row.toolSlug === tool.toolSlug);

            return (
              <GuideToolCard
                key={tool.toolSlug}
                toolSlug={tool.toolSlug}
                toolName={tool.toolName}
                role={tool.summary}
                bestUseCase={tool.bestFor}
                useItWhen={comparison?.whyConsider}
                avoidItIf={tool.avoidIf}
                watchFor={comparison?.watchFor}
                practicalExample={`Use it for one real ${guide.useCase} test before you commit to a repeatable workflow.`}
                highlight={index === 0}
              />
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Who should use this">Good fit</SectionHeading>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {guide.whoShouldUseThis.map((item) => (
              <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Who should avoid this">Not a fit</SectionHeading>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {guide.whoShouldAvoidThis.map((item) => (
              <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Final verdict">Make the call</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a personalized shortcut?</p>
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
