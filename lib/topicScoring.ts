import { tools } from "@/data/tools";
import type { GuideTopic } from "@/data/guideTopics";
import type { AiTool } from "@/types/tool";

export interface TopicToolScore {
  readonly tool: AiTool;
  readonly score: number;
  readonly reasons: readonly string[];
}

function terms(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((term) => term.length > 2),
  );
}

function overlap(left: Set<string>, right: Set<string>): number {
  let count = 0;

  for (const term of left) {
    if (right.has(term)) {
      count += 1;
    }
  }

  return count;
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

const TIER_BONUS: Record<NonNullable<AiTool["recommendationTier"]>, number> = {
  core: 14,
  alternative: 6,
  catalog: 0,
};

export function scoreToolsForTopic(topic: GuideTopic): TopicToolScore[] {
  const topicTerms = terms(
    [
      topic.title,
      topic.audience ?? topic.persona,
      topic.searchIntent ?? topic.useCase,
      topic.notes ?? topic.selectionContext,
      ...(topic.relatedKeywords ?? topic.secondaryKeywords),
    ].join(" "),
  );

  return tools
    .map((tool) => {
      const reasons: string[] = [];
      const preferredIndex = topic.suggestedToolSlugs.indexOf(tool.slug);
      const toolTerms = terms(
        [
          tool.category,
          tool.description,
          ...tool.useCases,
          ...tool.bestFor,
          ...tool.primaryTags,
        ].join(" "),
      );
      let score = overlap(topicTerms, toolTerms) * 7;

      if (preferredIndex >= 0) {
        score += 100 - preferredIndex * 5;
        addReason(
          reasons,
          `${tool.name} is one of the topic's preferred tools for ${topic.searchIntent}.`,
        );
      }

      if (topic.toolCategories.includes(tool.category)) {
        score += 42;
        addReason(reasons, `Matches the ${topic.category.toLowerCase()} category.`);
      }

      if (tool.personas.includes(topic.audience) || tool.personas.includes(topic.persona) || tool.personas.includes("creator")) {
        score += 8;
      }

      if (topic.budgetAngle.toLowerCase().includes("free") && tool.freePlan) {
        score += 12;
        addReason(reasons, "A free plan is listed in the catalog for testing the workflow.");
      }

      if (topic.skillLevel === "beginner" && tool.beginnerScore >= 8) {
        score += 8;
        addReason(reasons, "Catalog data indicates a beginner-friendly setup.");
      }

      const tier = tool.recommendationTier ?? "catalog";
      const confidence = tool.confidenceScore ?? 5;

      score += TIER_BONUS[tier];

      if (tier === "core") {
        addReason(reasons, "Marked as a core catalog recommendation.");
      } else if (tier === "alternative") {
        addReason(reasons, "Marked as a useful alternative when the workflow shifts.");
      }

      if (confidence > 5) {
        score += Math.min((confidence - 5) * 2, 8);
      }

      if (topic.suggestedToolSlugs[0] === tool.slug) {
        score += 18;
      }

      if (reasons.length === 0) {
        addReason(
          reasons,
          `${tool.name} is a catalog match for ${topic.searchIntent} and the surrounding workflow.`,
        );
      }

      return { tool, score, reasons };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.tool.qualityScore - left.tool.qualityScore ||
        left.tool.name.localeCompare(right.tool.name),
    );
}

export function getTopicRecommendations(
  topic: GuideTopic,
  count = 3,
): TopicToolScore[] {
  return scoreToolsForTopic(topic).slice(0, count);
}
