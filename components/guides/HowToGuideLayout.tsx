import Link from "next/link";
import ActionLinks from "@/components/ActionLinks";
import BeforeAfterBlock from "@/components/guides/BeforeAfterBlock";
import GuideToolActions from "@/components/guides/GuideToolActions";
import DeviceUseCaseBlock from "@/components/guides/DeviceUseCaseBlock";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeading from "@/components/SectionHeading";
import ToolStackCard from "@/components/guides/ToolStackCard";
import ToolIcon from "@/components/ToolIcon";
import WorkflowSteps from "@/components/guides/WorkflowSteps";
import { resolveGuideTool } from "@/lib/guideTools";
import type { Guide, GuideWorkflowStep } from "@/lib/guides";

function fallbackSteps(guide: Guide): readonly GuideWorkflowStep[] {
  if (guide.steps && guide.steps.length > 0) {
    return guide.steps;
  }

  return guide.decisionPath.slice(0, 4).map((step) => ({
    title: step.situation,
    detail: step.reason,
    toolName: step.recommendation,
  }));
}

export default function HowToGuideLayout({ guide }: { readonly guide: Guide }) {
  const steps = fallbackSteps(guide);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Short answer" marker="⚡">
          Start here
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.quickAnswer ?? guide.quickVerdict}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="What you need" marker="🧰">
          A simple starting kit
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          {guide.firstStep ?? guide.exampleWorkflow ?? guide.useCase}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(guide.toolsYouCanUse ?? guide.recommendedTools.map((tool) => ({
            toolSlug: tool.toolSlug,
            toolName: tool.toolName,
            why: tool.summary,
          }))).map((tool) => {
            const catalogTool = resolveGuideTool(tool.toolSlug, tool.toolName);

            return (
              <div
                key={tool.toolSlug}
                className="flex h-full flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {catalogTool ? (
                    <ToolIcon {...catalogTool} size={24} />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {tool.toolName.charAt(0)}
                    </span>
                  )}
                  <p className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold text-slate-900">
                    {catalogTool ? (
                      <Link
                        href={`/tools/${catalogTool.slug}`}
                        className="block truncate transition hover:text-teal-700"
                      >
                        {catalogTool.name}
                      </Link>
                    ) : (
                      tool.toolName
                    )}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{tool.why}</p>
                {catalogTool && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {catalogTool.primaryTags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <GuideToolActions
                  className="mt-4"
                  slug={catalogTool?.slug}
                  name={catalogTool?.name ?? tool.toolName}
                  officialUrl={catalogTool?.officialUrl}
                  affiliateUrl={catalogTool?.affiliateUrl}
                />
              </div>
            );
          })}
        </div>
      </section>

      <WorkflowSteps
        steps={steps}
        title="Step-by-step workflow"
        description="Do the work first, then use the tools to speed up the parts that usually take the most time."
      />

      <DeviceUseCaseBlock
        desktopUseCase={guide.desktopUseCase}
        mobileUseCase={guide.mobileUseCase}
        desktopSearchAngle={guide.desktopSearchAngle}
        mobileSearchAngle={guide.mobileSearchAngle}
      />

      <ToolStackCard
        title="Tools you can use"
        description="Use these tools as support for the workflow, not as a substitute for the workflow itself."
        tools={
          guide.toolsYouCanUse ??
          guide.recommendedTools.slice(0, 3).map((tool) => ({
            toolSlug: tool.toolSlug,
            toolName: tool.toolName,
            why: tool.summary,
          }))
        }
      />

      <BeforeAfterBlock
        title="Example result"
        before={guide.exampleWorkflow ?? guide.contentGap}
        after={guide.exampleResult ?? guide.finalVerdict}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Common mistakes" marker="⚠️">
          Avoid these
        </SectionHeading>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
          {(guide.commonMistakes ?? guide.mistakesToAvoid ?? []).map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="FAQ" marker="🔎">
          Common questions
        </SectionHeading>
        <div className="mt-6">
          <FaqAccordion items={guide.faq ?? guide.faqs} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Next step" marker="➡️">
          Move to Finder or test one workflow first
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a faster starting point?</p>
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
    </div>
  );
}
