import CollapsedGuideSection from "@/components/guides/CollapsedGuideSection";
import GuideToolCard from "@/components/guides/GuideToolCard";
import type { Guide, GuideToolUse } from "@/lib/guides";

interface ToolsYouCanUseProps {
  readonly guide: Guide;
  readonly title?: string;
  readonly description?: string;
  readonly compact?: boolean;
}

function toolsForGuide(guide: Guide): readonly GuideToolUse[] {
  if (guide.toolsYouCanUse && guide.toolsYouCanUse.length > 0) {
    return guide.toolsYouCanUse;
  }

  return guide.recommendedTools.slice(0, 3).map((tool) => ({
    toolSlug: tool.toolSlug,
    toolName: tool.toolName,
    why: tool.summary,
  }));
}

export default function ToolsYouCanUse({
  guide,
  title = "Tools you can use",
  description = "These tools support the workflow. Pick the one that fits the step you are doing.",
  compact = true,
}: ToolsYouCanUseProps) {
  const tools = toolsForGuide(guide);

  if (tools.length === 0) {
    return null;
  }

  return (
    <CollapsedGuideSection
      eyebrow="Tool support"
      title={title}
      description={description}
    >
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {tools.map((tool) => {
          const recommendation = guide.recommendedTools.find(
            (item) => item.toolSlug === tool.toolSlug,
          );

          return (
            <GuideToolCard
              key={tool.toolSlug}
              toolSlug={tool.toolSlug}
              toolName={tool.toolName}
              role={tool.why}
              bestUseCase={recommendation?.bestFor}
              sourcePage="shortcut_detail"
              guideSlug={guide.slug}
              compact={compact}
            />
          );
        })}
      </div>
    </CollapsedGuideSection>
  );
}
