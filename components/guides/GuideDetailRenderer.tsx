import HowToGuideLayout from "@/components/guides/HowToGuideLayout";
import IncomeGuideLayout from "@/components/guides/IncomeGuideLayout";
import ToolDecisionGuideLayout from "@/components/guides/ToolDecisionGuideLayout";
import TrendDecisionGuideLayout from "@/components/guides/TrendDecisionGuideLayout";
import { resolveGuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";

interface GuideDetailRendererProps {
  readonly guide: Guide;
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
      {guideType === "how-to" ? (
        <HowToGuideLayout guide={guide} />
      ) : guideType === "income" ? (
        <IncomeGuideLayout guide={guide} />
      ) : guideType === "trend-led" ? (
        <TrendDecisionGuideLayout guide={guide} />
      ) : (
        <ToolDecisionGuideLayout guide={guide} />
      )}
    </div>
  );
}
