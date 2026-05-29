import Link from "next/link";
import ActionLinks from "@/components/ActionLinks";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeading from "@/components/SectionHeading";
import ToolCard from "@/components/ToolCard";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { Guide } from "@/lib/guides";

function formatBudgetLabel(freePlan: boolean, slug?: string): string {
  if (freePlan) {
    return "Free plan";
  }

  return slug ? "Paid" : "Pricing varies";
}

function formatSetupLabel(easeOfUse: string): string {
  return easeOfUse;
}

function getTool(toolSlug: string) {
  return toolsBySlug.get(toolSlug as ToolSlug);
}

export default function ToolDecisionGuideLayout({ guide }: { readonly guide: Guide }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Quick verdict" marker="⚡">
          The shortest path to a decision
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.quickVerdict}
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          eyebrow="Best picks by situation"
          marker="🎯"
          description="Each card points to the fastest fit for a specific use case."
        >
          Pick the right starting point
        </SectionHeading>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {guide.bestPicksBySituation.map((pick, index) => {
            const tool = getTool(pick.toolSlug);

            if (!tool) {
              return null;
            }

            const visitUrl = tool.affiliateUrl ?? tool.officialUrl;

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

                <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
                  {pick.situation}
                </p>
                <p className="comparavy-clamp-2 mt-2 text-sm leading-7 text-slate-600">
                  {pick.why}
                </p>

                <ActionLinks
                  className="mt-auto pt-4 justify-start sm:justify-end"
                  items={[
                    { href: visitUrl, label: "Visit Site", external: true, tone: "primary" },
                    { href: `/tools/${tool.slug}`, label: "View Tool Page" },
                  ]}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          eyebrow="Comparison"
          marker="📊"
          description="Scan the shortlist side by side before you test anything."
        >
          Side-by-side comparison
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
                    <td className="px-4 py-3 leading-6 text-slate-700">
                      {tool ? formatBudgetLabel(tool.freePlan, tool.slug) : "Paid or free"}
                    </td>
                    <td className="px-4 py-3 leading-6 text-slate-700">
                      {tool ? formatSetupLabel(tool.setupDifficulty) : row.easeOfUse}
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
          marker="🧰"
          description="Keep the shortlist compact and easy to scan."
        >
          Detailed recommendations
        </SectionHeading>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {guide.recommendedToolSlugs
            .map((slug) => getTool(slug))
            .filter((tool): tool is NonNullable<ReturnType<typeof getTool>> => Boolean(tool))
            .map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Who should use this" marker="👤">
            Good fit
          </SectionHeading>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {guide.whoShouldUseThis.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Who should avoid this" marker="⛔">
            Not a fit
          </SectionHeading>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            {guide.whoShouldAvoidThis.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Final verdict" marker="🏁">
          Make the call
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a personalized shortcut?</p>
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
