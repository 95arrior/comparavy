import { guideTopics } from "@/data/guideTopics";
import { toolsBySlug, type ToolSlug } from "@/data/tools";

export interface InvalidGuideTopicToolSlug {
  readonly topicSlug: string;
  readonly toolSlug: string;
}

export function getInvalidGuideTopicToolSlugs(): InvalidGuideTopicToolSlug[] {
  const invalid: InvalidGuideTopicToolSlug[] = [];

  for (const topic of guideTopics) {
    for (const toolSlug of topic.suggestedToolSlugs) {
      if (!toolsBySlug.has(toolSlug as ToolSlug)) {
        invalid.push({ topicSlug: topic.slug, toolSlug });
      }
    }
  }

  return invalid;
}

export function logGuideTopicToolSlugWarnings(): InvalidGuideTopicToolSlug[] {
  const invalid = getInvalidGuideTopicToolSlugs();

  for (const entry of invalid) {
    console.warn(
      `[guideTopics] Warning: ${entry.topicSlug} suggests unknown tool slug "${entry.toolSlug}".`,
    );
  }

  return invalid;
}
