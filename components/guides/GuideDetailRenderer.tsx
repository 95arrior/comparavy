import BeforeAfterProofCard from "@/components/guides/BeforeAfterProofCard";
import GuideExecutionShortcut from "@/components/guides/GuideExecutionShortcut";
import HelpfulFeedback from "@/components/guides/HelpfulFeedback";
import HowToGuideLayout from "@/components/guides/HowToGuideLayout";
import IncomeGuideLayout from "@/components/guides/IncomeGuideLayout";
import RelatedShortcuts, {
  type RelatedShortcutItem,
} from "@/components/guides/RelatedShortcuts";
import ShortcutBrief from "@/components/guides/ShortcutBrief";
import ToolDecisionGuideLayout from "@/components/guides/ToolDecisionGuideLayout";
import TrendDecisionGuideLayout from "@/components/guides/TrendDecisionGuideLayout";
import ViewShortcutsCta from "@/components/guides/ViewShortcutsCta";
import { resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides, type Guide } from "@/lib/guides";
import {
  guideWorksWithTools,
  selectRelatedShortcuts,
} from "@/lib/shortcutDiscovery";

interface GuideDetailRendererProps {
  readonly guide: Guide;
}

function actionIntro(guide: Guide): {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly supportTitle: string;
  readonly supportDescription: string;
} {
  switch (guide.slug) {
    case "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai":
      return {
        eyebrow: "Transcript first",
        title: "Turn messy spoken notes into clear actions.",
        description:
          "Paste the transcript, add the context you know, then copy a prompt that pulls out tasks, deadlines, owners, quick wins, and unclear items.",
        supportTitle: "Then review the task list.",
        supportDescription:
          "The lower sections help you check deadlines, choose a tool, and avoid turning loose ideas into confirmed work.",
      };
    case "how-to-write-google-business-profile-posts-with-ai":
      return {
        eyebrow: "Local update",
        title: "Start with the update you want local customers to see.",
        description:
          "Add the business facts, offer or announcement, and restrictions. The prompt creates review-ready post options without inventing risky claims.",
        supportTitle: "Then check the business facts.",
        supportDescription:
          "The lower sections cover owner review, tool choices, and common mistakes before a post goes public.",
      };
    case "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic":
      return {
        eyebrow: "Real details",
        title: "Start with real details so the bio still sounds like you.",
        description:
          "You are not trying to sound perfect. Add true interests, tone, and things to avoid, then copy a prompt that gives you natural options to edit.",
        supportTitle: "Then make it sound like yourself.",
        supportDescription:
          "The lower sections help you spot cliches, remove anything untrue, and keep the final bio easy to reply to.",
      };
    default:
      return {
        eyebrow: "Prompt first",
        title: "Build the prompt before reading the full guide.",
        description:
          "Add the details you have, copy the generated prompt, and check the example before using the result.",
        supportTitle: "Then review the workflow.",
        supportDescription:
          "The lower sections explain the steps, tools, mistakes, and FAQs for this shortcut.",
      };
  }
}

function toRelatedShortcutItem(guide: Guide): RelatedShortcutItem {
  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.quickAnswer ?? guide.quickVerdict ?? guide.metaDescription,
    category: guide.category,
    skillLevel: guide.skillLevel,
    worksWithTools: guideWorksWithTools(guide),
  };
}

export default function GuideDetailRenderer({ guide }: GuideDetailRendererProps) {
  const relatedSelection = selectRelatedShortcuts(guide, getPublishedGuides());
  const intro = actionIntro(guide);
  const guideType = resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[2rem] border-2 border-teal-100 bg-teal-50/40 p-3 shadow-sm sm:p-4">
        <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            {intro.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {intro.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            {intro.description}
          </p>
        </div>
        <div className="mt-3 space-y-5 sm:mt-4">
          <BeforeAfterProofCard
            before={guide.exampleWorkflow}
            after={guide.exampleResult}
          />
          <ShortcutBrief guide={guide} />
          <GuideExecutionShortcut guide={guide} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
          Supporting guide
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {intro.supportTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          {intro.supportDescription}
        </p>
      </section>

      {guideType === "how-to" ? (
        <HowToGuideLayout guide={guide} />
      ) : guideType === "income" ? (
        <IncomeGuideLayout guide={guide} />
      ) : guideType === "trend-led" ? (
        <TrendDecisionGuideLayout guide={guide} />
      ) : (
        <ToolDecisionGuideLayout guide={guide} />
      )}

      <HelpfulFeedback
        guideSlug={guide.slug}
        guideTitle={guide.title}
        topicCluster={guide.topicCluster}
      />
      <ViewShortcutsCta />
      <RelatedShortcuts
        guide={guide}
        guides={relatedSelection.guides.map(toRelatedShortcutItem)}
        sectionTitle={relatedSelection.sectionTitle}
        sectionSubtitle={relatedSelection.sectionSubtitle}
      />
    </div>
  );
}
