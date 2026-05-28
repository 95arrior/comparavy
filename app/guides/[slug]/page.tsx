import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionLinks from "@/components/ActionLinks";
import FaqAccordion from "@/components/FaqAccordion";
import Logo from "@/components/Logo";
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

function formatBudgetLabel(tool: AiTool): string {
  if (tool.freePlan) {
    return "Free plan";
  }

  switch (tool.budgetLevel) {
    case "under20":
      return "Under $20";
    case "under50":
      return "Under $50";
    case "premium":
      return "Premium";
    default:
      return "Paid";
  }
}

function scoreLabel(score: number): string {
  if (score >= 9) {
    return "Very strong";
  }

  if (score >= 8) {
    return "Strong";
  }

  if (score >= 7) {
    return "Balanced";
  }

  return "Slower";
}

function formatSetupDifficulty(tool: AiTool): string {
  return `${tool.setupDifficulty} setup`;
}

function getTool(toolSlug: string): AiTool | undefined {
  return toolsBySlug.get(toolSlug as ToolSlug);
}

function formatComparisonValue(
  guideRow: Guide["comparisonRows"][number],
  tool: AiTool | undefined,
): Record<string, string> {
  return {
    bestFor: guideRow.bestFor,
    pricing: tool ? formatBudgetLabel(tool) : guideRow.freePlan ? "Free plan" : "Paid",
    setup: tool ? formatSetupDifficulty(tool) : guideRow.easeOfUse,
    speed: tool ? `${tool.speedScore}/10` : "Varies",
    quality: tool ? `${tool.qualityScore}/10` : "Varies",
    beginner: tool ? `${tool.beginnerScore}/10` : "Varies",
  };
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

function QuickAnswerBlock({ guide }: { readonly guide: Guide }) {
  const firstTool = getTool(guide.recommendedToolSlugs[0] ?? "");
  const secondTool = getTool(guide.recommendedToolSlugs[1] ?? "");
  const thirdTool = getTool(guide.recommendedToolSlugs[2] ?? "");

  const lines = [
    `Start with ${firstTool?.name ?? guide.decisionPath[0]?.recommendation ?? "the top pick"} if you want the shortest route to a decision.`,
    `Compare ${secondTool?.name ?? guide.decisionPath[1]?.recommendation ?? "the second option"} when you need a different workflow.`,
    `Keep ${thirdTool?.name ?? guide.decisionPath[2]?.recommendation ?? "the third option"} in view if you want a stronger tradeoff.`,
  ];

  return (
    <section
      id="quick-answer"
      className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/70 p-5 shadow-sm comparavy-reveal sm:p-6"
    >
      <SectionHeading eyebrow="Quick answer" marker="⚡">
        Scan this first
      </SectionHeading>
      <div className="mt-5 grid gap-3">
        {lines.map((line, index) => (
          <div
            key={line}
            className={`rounded-2xl border border-white/80 bg-white px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm ${
              index === 0 ? "ring-1 ring-teal-100" : ""
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}

function BestPickCards({ guide }: { readonly guide: Guide }) {
  return (
    <section
      id="best-picks"
      className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
    >
      <SectionHeading
        eyebrow="Best picks by situation"
        marker="🎯"
        description="Each card gives you the fastest next decision path for the tools in this guide."
      >
        Pick the strongest fit for your situation
      </SectionHeading>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {guide.comparisonRows.map((row, index) => {
          const tool = getTool(row.toolSlug);

          if (!tool) {
            return null;
          }

          const visitUrl = tool.affiliateUrl ?? tool.officialUrl;

          return (
            <article
              key={row.toolSlug}
              className={`flex h-full flex-col rounded-3xl border bg-slate-50/70 p-4 shadow-sm comparavy-card-lift sm:p-5 ${
                index === 0 ? "border-teal-200" : "border-slate-200"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <ToolIcon {...tool} size={24} />
                <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="block truncate transition hover:text-teal-700"
                  >
                    {tool.name}
                  </Link>
                </h3>
              </div>

              <p className="comparavy-clamp-2 mt-3 text-sm leading-6 text-slate-600">
                {tool.description}
              </p>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
                {row.bestFor}
              </p>
              <p className="comparavy-clamp-2 mt-2 text-sm leading-6 text-slate-600">
                {row.whyConsider}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                  {tool.category.replace(/-/g, " ")}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                  {formatBudgetLabel(tool)}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                  {tool.setupDifficulty} setup
                </span>
              </div>

              <ActionLinks
                className="mt-auto pt-4"
                items={[
                  {
                    href: visitUrl,
                    label: "Visit Site",
                    external: true,
                    tone: "primary",
                  },
                  {
                    href: `/tools/${tool.slug}`,
                    label: "View Tool Page",
                  },
                ]}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ComparisonMatrix({ guide }: { readonly guide: Guide }) {
  return (
    <section
      id="comparison"
      className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
    >
      <SectionHeading
        eyebrow="Comparison"
        marker="📊"
        description="Use this matrix to compare the shortlist at a glance."
      >
        Side-by-side decision matrix
      </SectionHeading>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Tool</th>
              <th className="px-4 py-3 font-semibold">Best for</th>
              <th className="px-4 py-3 font-semibold">Pricing</th>
              <th className="px-4 py-3 font-semibold">Setup</th>
              <th className="px-4 py-3 font-semibold">Speed</th>
              <th className="px-4 py-3 font-semibold">Quality</th>
              <th className="px-4 py-3 font-semibold">Beginner-friendly</th>
            </tr>
          </thead>
          <tbody>
            {guide.comparisonRows.map((row, index) => {
              const tool = getTool(row.toolSlug);
              const values = formatComparisonValue(row, tool);

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
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.bestFor}
                  </td>
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.pricing}
                  </td>
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.setup}
                  </td>
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.speed}
                  </td>
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.quality}
                  </td>
                  <td className="px-4 py-3 leading-6 text-slate-700">
                    {values.beginner}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailedRecommendations({ guide }: { readonly guide: Guide }) {
  const tools = guide.recommendedToolSlugs
    .map((slug) => getTool(slug))
    .filter((tool): tool is AiTool => Boolean(tool));

  return (
    <section
      id="recommendations"
      className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
    >
      <SectionHeading
        eyebrow="Detailed recommendations"
        marker="🧭"
        description="Use these cards when you want the longer explanation behind each choice."
      >
        What each tool is best at
      </SectionHeading>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {tools.map((tool, index) => {
          const visitUrl = tool.affiliateUrl ?? tool.officialUrl;

          return (
          <article
            key={tool.slug}
            className={`flex h-full flex-col rounded-3xl border p-4 shadow-sm comparavy-card-lift sm:p-5 ${
              index === 0 ? "border-teal-200 bg-teal-50/50" : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <ToolIcon {...tool} size={24} />
              <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
                <Link
                  href={`/tools/${tool.slug}`}
                  className="block truncate transition hover:text-teal-700"
                >
                  {tool.name}
                </Link>
              </h3>
            </div>

            <p className="comparavy-clamp-2 mt-3 text-sm leading-6 text-slate-600">
              {tool.description}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Best for</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {tool.bestFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Avoid if</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {tool.avoidIf.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Standout strengths
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tool.primaryTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Tradeoffs</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {tool.notFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ActionLinks
              className="mt-auto pt-4"
              items={[
                {
                  href: visitUrl,
                  label: "Visit Site",
                  external: true,
                  tone: "primary",
                },
                {
                  href: `/tools/${tool.slug}`,
                  label: "View Tool Page",
                },
              ]}
            />
          </article>
          );
        })}
      </div>
    </section>
  );
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getPublishedGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const primaryTool = getTool(guide.recommendedToolSlugs[0] ?? "");

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-6xl">
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
              Use Finder
            </Link>
          </nav>

          <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm comparavy-reveal sm:px-10 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              {guide.category}
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {guide.quickVerdict}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                Best for: {guide.persona}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Beginner-friendly: {guide.skillLevel}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {primaryTool ? formatBudgetLabel(primaryTool) : "Pricing varies"}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {primaryTool ? formatSetupDifficulty(primaryTool) : "Setup varies"}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Speed: {primaryTool ? scoreLabel(primaryTool.speedScore) : "Varies"}
              </span>
            </div>

            <ActionLinks
              className="mt-5"
              items={[
                { href: "/finder", label: "Use Finder", tone: "primary" },
                { href: "#comparison", label: "Jump to Comparison" },
                { href: "/tools", label: "View Tools" },
              ]}
            />
          </header>

          <QuickAnswerBlock guide={guide} />
          <BestPickCards guide={guide} />
          <ComparisonMatrix guide={guide} />

          <section
            id="details"
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
          >
            <SectionHeading
              eyebrow="Detailed recommendations"
              marker="🧱"
              description="These sections explain the tradeoffs behind the shortlist in more depth."
            >
              Read the full rationale
            </SectionHeading>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                <p className="text-sm font-semibold text-slate-900">Key takeaways</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                  {guide.keyTakeaways.map((takeaway) => (
                    <li key={takeaway} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                <p className="text-sm font-semibold text-slate-900">Money-saving tips</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                  {guide.moneySavingTips.map((tip) => (
                    <li key={tip} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm leading-7 text-slate-600 ring-1 ring-slate-200">
                  {guide.pricingNote}
                </p>
              </div>
            </div>
          </section>

          <DetailedRecommendations guide={guide} />

          <section
            id="faq"
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
          >
            <SectionHeading
              eyebrow="FAQ"
              marker="🔎"
              description="Short answers that help searchers and first-time readers move faster."
            >
              Common questions
            </SectionHeading>
            <div className="mt-6">
              <FaqAccordion items={guide.faqs} />
            </div>
          </section>

          <section
            id="final-verdict"
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm comparavy-reveal sm:p-8"
          >
            <SectionHeading eyebrow="Final verdict" marker="🎯">
              Make the decision
            </SectionHeading>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
              {guide.finalVerdict}
            </p>
            <div className="mt-8 rounded-3xl bg-slate-900 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7">
              <div>
                <p className="text-lg font-semibold text-white">
                  Need a recommendation matched to your situation?
                </p>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
                  {guide.ctaToFinder}
                </p>
              </div>
              <ActionLinks
                className="mt-6 sm:mt-0"
                items={[
                  { href: "/finder", label: "Use Finder", tone: "primary" },
                  { href: "/guides", label: "Back to Guides" },
                ]}
              />
            </div>
          </section>
      </article>
    </main>
  );
}
