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
      <ShortcutBrief guide={guide} />
      <GuideExecutionShortcut guide={guide} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
          Need the full workflow?
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Read this after you have the prompt.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          The sections below explain workflow steps, tool choices, common
          mistakes, and FAQs. They stay here for review and SEO, but the prompt
          builder above is the fastest path to using the shortcut.
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
