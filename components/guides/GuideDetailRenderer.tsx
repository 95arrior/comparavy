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
import type { ShortcutWorksWithTool } from "@/components/guides/ShortcutsDiscovery";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
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

function guideWorksWithTools(guide: Guide): readonly ShortcutWorksWithTool[] {
  const tools = guide.recommendedToolSlugs.flatMap((slug) => {
    const tool = toolsBySlug.get(slug as ToolSlug);
    return tool ? [tool] : [];
  });

  return tools.slice(0, 3).map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    officialUrl: tool.officialUrl,
    iconPath: tool.iconPath,
    iconDomain: tool.iconDomain,
    brandColor: tool.brandColor,
  }));
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
      <RelatedShortcuts
        guide={guide}
        guides={relatedGuides(guide).map(toRelatedShortcutItem)}
      />
    </div>
  );
}
