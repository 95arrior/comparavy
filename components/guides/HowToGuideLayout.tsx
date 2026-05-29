import ActionLinks from "@/components/ActionLinks";
import CommonMistakes from "@/components/guides/CommonMistakes";
import DeviceUseCaseBlock from "@/components/guides/DeviceUseCaseBlock";
import ExampleResultBlock from "@/components/guides/ExampleResultBlock";
import QuickAnswerBox from "@/components/guides/QuickAnswerBox";
import RealWorldScenario from "@/components/guides/RealWorldScenario";
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
    why: "This keeps the workflow tied to the job instead of turning it into a tool ranking.",
    output: step.recommendation,
    toolName: step.recommendation,
  }));
}

function whatYouNeedItems(guide: Guide): readonly string[] {
  if (Array.isArray(guide.whatYouNeed) && guide.whatYouNeed.length > 0) {
    return guide.whatYouNeed;
  }

  if (typeof guide.whatYouNeed === "string" && guide.whatYouNeed.trim()) {
    return [guide.whatYouNeed];
  }

  return [
    `Source material for ${guide.useCase}.`,
    "A clear output format and audience.",
    guide.timeEstimate ?? "Enough time to check names, dates, numbers, and commitments before using the result.",
  ];
}

export default function HowToGuideLayout({ guide }: { readonly guide: Guide }) {
  const steps = fallbackSteps(guide);
  const faqItems = guide.faq ?? guide.faqs;

  return (
    <div className="space-y-6">
      <QuickAnswerBox
        answer={guide.quickAnswer ?? guide.quickVerdict}
        fallback={`Start with the real source material, create one draft for ${guide.useCase}, then check the result before you send, post, or save it.`}
      />

      <RealWorldScenario
        scenario={guide.realWorldScenario}
        audience={guide.audience}
        useCase={guide.useCase}
        userPain={guide.userPain}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="What you need">A short starting checklist</SectionHeading>
        <ul className="mt-5 grid gap-3 text-sm leading-7 text-slate-700 sm:grid-cols-2">
          {whatYouNeedItems(guide).map((item) => (
            <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <WorkflowSteps
        steps={steps}
        title="Step-by-step workflow"
        description="Do the work in order: source material first, AI draft second, human review before anything reaches another person."
      />

      <DeviceUseCaseBlock
        desktopUseCase={guide.desktopUseCase}
        mobileUseCase={guide.mobileUseCase}
        desktopSearchAngle={guide.desktopSearchAngle}
        mobileSearchAngle={guide.mobileSearchAngle}
        desktopFallback="Use a computer when you need files, long documents, transcripts, side-by-side review, or a careful final edit."
        mobileFallback="Use your phone for voice notes, quick cleanup, short drafts, and fast checks that do not require heavy file handling."
      />

      <ToolsYouCanUse guide={guide} />

      <ExampleResultBlock
        before={guide.exampleWorkflow ?? guide.contentGap}
        result={guide.exampleResult}
        fallback={`A checked result for ${guide.useCase}: clear structure, preserved facts, next actions, and no unchecked names, dates, numbers, or commitments.`}
      />

      <CommonMistakes
        mistakes={guide.commonMistakes ?? guide.mistakesToAvoid}
        fallback={[
          "Do not send AI summaries without checking names, dates, numbers, and commitments.",
          "Do not ask for polish before the facts and structure are correct.",
          "Do not paste sensitive client, student, or business information into a tool your organization has not approved.",
        ]}
      />

      {faqItems.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="FAQ">Search-intent questions</SectionHeading>
          <div className="mt-6">
            <FaqAccordion items={faqItems} />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading eyebrow="Next step">Run one real example</SectionHeading>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          {guide.finalVerdict}
        </p>
        <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-lg font-semibold text-white">Need a faster starting point?</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              {guide.finderCTA || guide.ctaToFinder}
            </p>
          </div>
          <ActionLinks
            className="mt-5 sm:mt-0"
            items={[
              { href: "/finder", label: "Use Finder", tone: "primary" },
              { href: "/guides", label: "Related Guides" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
