import ActionLinks from "@/components/ActionLinks";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeading from "@/components/SectionHeading";
import ToolStackCard from "@/components/guides/ToolStackCard";
import WorkflowSteps from "@/components/guides/WorkflowSteps";
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

export default function IncomeGuideLayout({ guide }: { readonly guide: Guide }) {
  const steps = fallbackSteps(guide);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Reality check" marker="🧭">
          What AI can help with
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
          {guide.realityCheck ?? guide.quickVerdict}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="What this can help you offer" marker="💼">
            Service shape
          </SectionHeading>
          <p className="mt-4 text-sm leading-7 text-slate-600">{guide.useCase}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {guide.exampleWorkflow ?? guide.contentGap}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Skill needed" marker="🎓">
            What you still need to do
          </SectionHeading>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {guide.skillNeeded ?? guide.budgetAngle}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Time and cost stay tied to your own review process, revisions, and the tools you pick.
          </p>
        </div>
      </section>

      <WorkflowSteps
        steps={steps}
        title="Step-by-step AI workflow"
        description="Use AI to draft, structure, and polish the work, then review the final output yourself."
      />

      <ToolStackCard
        title="Recommended tools"
        description="These are the tools most likely to help you deliver the workflow faster."
        tools={
          guide.toolsYouCanUse ??
          guide.recommendedTools.slice(0, 3).map((tool) => ({
            toolSlug: tool.toolSlug,
            toolName: tool.toolName,
            why: tool.summary,
          }))
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="First realistic step" marker="➡️">
          Start with one real example
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.firstStep ?? guide.finalVerdict}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Mistakes to avoid" marker="⚠️">
          Keep the workflow honest
        </SectionHeading>
        <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
          {(guide.mistakesToAvoid ?? guide.commonMistakes ?? []).map((item) => (
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
        <SectionHeading eyebrow="Final recommendation" marker="🏁">
          Stay practical
        </SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a specific shortlist?</p>
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
