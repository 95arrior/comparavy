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

export function scoreToolsForTopic(topic: GuideTopic): TopicToolScore[] {
  const topicTerms = terms(
    [topic.title, topic.useCase, topic.persona, ...topic.secondaryKeywords].join(" "),
  );

  return tools
    .map((tool) => {
      const reasons: string[] = [];
      const preferredIndex = topic.preferredToolSlugs.indexOf(tool.slug);
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
        addReason(reasons, "Selected for this guide's core workflow.");
      }

      if (topic.targetCategories.includes(tool.category)) {
        score += 42;
        addReason(reasons, `Matches the ${topic.category.toLowerCase()} category.`);
      }

      if (tool.personas.includes(topic.persona) || tool.personas.includes("creator")) {
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

      if (reasons.length === 0) {
        addReason(reasons, "Relevant catalog match for the stated use case.");
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
