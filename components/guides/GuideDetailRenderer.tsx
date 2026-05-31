import GuideExecutionShortcut from "@/components/guides/GuideExecutionShortcut";
import HelpfulFeedback from "@/components/guides/HelpfulFeedback";
import HowToGuideLayout from "@/components/guides/HowToGuideLayout";
import IncomeGuideLayout from "@/components/guides/IncomeGuideLayout";
import RelatedShortcuts from "@/components/guides/RelatedShortcuts";
import ShortcutBrief from "@/components/guides/ShortcutBrief";
import ToolDecisionGuideLayout from "@/components/guides/ToolDecisionGuideLayout";
import TrendDecisionGuideLayout from "@/components/guides/TrendDecisionGuideLayout";
import ViewShortcutsCta from "@/components/guides/ViewShortcutsCta";
import { resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides, type Guide } from "@/lib/guides";

interface GuideDetailRendererProps {
  readonly guide: Guide;
}

function relatedGuides(guide: Guide): readonly Guide[] {
  const guides = getPublishedGuides().filter((item) => item.slug !== guide.slug);
  const related = guides.filter(
    (item) => item.category === guide.category || item.skillLevel === guide.skillLevel,
  );

  return (related.length >= 3 ? related : guides).slice(0, 3);
}

export default function GuideDetailRenderer({ guide }: GuideDetailRendererProps) {
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
      <RelatedShortcuts guide={guide} guides={relatedGuides(guide)} />
    </div>
  );
}
