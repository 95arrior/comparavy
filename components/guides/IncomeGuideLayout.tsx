import ActionLinks from "@/components/ActionLinks";
import CommonMistakes from "@/components/guides/CommonMistakes";
import ToolsYouCanUse from "@/components/guides/ToolsYouCanUse";
import WorkflowSteps from "@/components/guides/WorkflowSteps";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeading from "@/components/SectionHeading";
import type { Guide, GuideWorkflowStep } from "@/lib/guides";

function fallbackSteps(guide: Guide): readonly GuideWorkflowStep[] {
  if (guide.steps && guide.steps.length > 0) {
    return guide.steps;
  }

  return guide.decisionPath.slice(0, 4).map((step) => ({
    title: step.situation,
    detail: step.reason,
    why: "Income workflows need repeatable service delivery, not tool hype.",
    output: step.recommendation,
    toolName: step.recommendation,
  }));
}

export default function IncomeGuideLayout({ guide }: { readonly guide: Guide }) {
  const steps = fallbackSteps(guide);
  const faqItems = guide.faq ?? guide.faqs;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-100 bg-amber-50/80 p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Reality check">AI supports the workflow, not guaranteed income</SectionHeading>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">
          {guide.realityCheck ?? "AI can help you draft, organize, and deliver work faster, but it does not guarantee clients, revenue, sales, or repeat demand."}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="What you can offer">Realistic service shape</SectionHeading>
          <p className="mt-4 text-sm leading-7 text-slate-600">{guide.useCase}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {guide.exampleWorkflow ?? "Start with one small, reviewable deliverable such as captions, product descriptions, client recaps, basic content calendars, or cleaned-up initial versions."}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Skill needed">What you still need to know</SectionHeading>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {guide.skillNeeded ?? "You still need basic editing judgment, prompt clarity, client communication, and enough domain knowledge to reject weak or inaccurate output."}
          </p>
        </div>
      </section>

      <WorkflowSteps
        steps={steps}
        title="Step-by-step workflow"
        description="Use AI for structure and draft speed, then use your own judgment before delivering anything to a client or customer."
      />

      <ToolsYouCanUse
        guide={guide}
        title="Tools that help"
        description="These tools are useful only when they make the service workflow easier to deliver and review."
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="First realistic step">Start with one real example</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.firstStep ?? "Create one sample deliverable from real source material, review it manually, and use that result to decide whether the service is worth offering."}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Time, cost, difficulty">Set expectations before selling</SectionHeading>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Time</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{guide.timeEstimate ?? "Start with one small deliverable before offering packages."}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Cost</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{guide.pricingCaveat}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Difficulty</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{guide.skillLevel} workflow with manual review required.</p>
          </div>
        </div>
      </section>

      <CommonMistakes
        eyebrow="Mistakes to avoid"
        title="Keep the offer honest"
        mistakes={guide.mistakesToAvoid ?? guide.commonMistakes}
        fallback={[
          "Do not promise guaranteed income, sales, rankings, clients, or business results.",
          "Do not sell AI output you have not reviewed for accuracy, tone, and client fit.",
          "Do not package a service until one real example is good enough to show privately.",
        ]}
      />

      {faqItems.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="FAQ">Practical questions</SectionHeading>
          <div className="mt-6">
            <FaqAccordion items={faqItems} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Final recommendation">Stay realistic</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a specific shortlist?</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{guide.finderCTA || guide.ctaToFinder}</p>
          </div>
          <ActionLinks
            className="mt-5 sm:mt-0"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/guides", label: "Back to Shortcuts" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
