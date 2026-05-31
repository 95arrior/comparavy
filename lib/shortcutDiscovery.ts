import type { ShortcutDiscoveryItem, ShortcutWorksWithTool } from "@/components/guides/ShortcutsDiscovery";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";

export type { ShortcutDiscoveryItem, ShortcutWorksWithTool };

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstGuideInput(guide: Guide): string {
  const whatYouNeed = guide.whatYouNeed;

  if (Array.isArray(whatYouNeed)) {
    return whatYouNeed[0] ?? guide.userPain;
  }

  return typeof whatYouNeed === "string" ? whatYouNeed : guide.userPain;
}

function guideOutput(guide: Guide): string {
  return (
    guide.steps
      ?.filter((step) => step.output)
      .at(-1)
      ?.output ??
    guide.exampleResult ??
    guide.visualSummary.headline
  );
}

export function guideWorksWithTools(guide: Guide): readonly ShortcutWorksWithTool[] {
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

export function guideSearchAliases(guide: Guide): readonly string[] {
  const guideAliases = [
    ...(guide.searchAliases ?? []),
    ...(guide.searchKeywords ?? []),
  ];

  switch (guide.slug) {
    case "how-to-turn-meeting-notes-into-a-client-recap-with-ai":
      return [
        ...guideAliases,
        "meeting notes",
        "client recap",
        "follow-up email",
        "follow up email",
        "action items",
        "meeting summary",
        "client email",
        "call notes",
        "owners",
        "deadlines",
        "open questions",
      ];
    case "best-ai-tools-for-etsy-product-descriptions":
      return [
        ...guideAliases,
        "Etsy",
        "Etsy listing",
        "product description",
        "product title",
        "listing copy",
        "tags",
        "keywords",
        "handmade product",
        "shop",
        "seller",
      ];
    case "how-to-summarize-a-pdf-into-study-notes-with-ai":
      return [
        ...guideAliases,
        "PDF",
        "PDF summary",
        "summarize PDF",
        "study notes",
        "quiz questions",
        "flashcards",
        "review questions",
        "student notes",
        "class notes",
        "document summary",
        "exam prep",
        "textbook chapter",
        "lecture notes",
      ];
    case "best-ai-tools-for-small-business-content-calendars":
      return [
        ...guideAliases,
        "small business",
        "content calendar",
        "social media planning",
        "social media plan",
        "content planning",
        "Instagram posts",
        "Facebook posts",
        "local business marketing",
        "weekly content plan",
        "marketing calendar",
        "content ideas",
        "social posts",
        "business promotion",
        "local service business",
        "small business marketing",
      ];
    default:
      return guideAliases;
  }
}

export function shortcutSearchValues(guide: Guide): readonly string[] {
  const guideTypeLabel = formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType));
  const worksWithTools = guideWorksWithTools(guide);

  return [
    guide.title,
    guide.metaDescription,
    guide.quickAnswer,
    guide.quickDecision,
    guide.quickVerdict,
    guide.category,
    guide.persona,
    guide.useCase,
    firstGuideInput(guide),
    guideOutput(guide),
    guide.topicCluster,
    guide.audience,
    guideTypeLabel,
    ...worksWithTools.map((tool) => tool.name),
    ...guideSearchAliases(guide),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export function toDiscoveryItem(guide: Guide): ShortcutDiscoveryItem {
  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.quickAnswer ?? guide.quickVerdict ?? guide.metaDescription,
    category: guide.category,
    skillLevel: guide.skillLevel,
    timeEstimate: guide.timeEstimate,
    guideTypeLabel: formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType)),
    topicCluster: guide.topicCluster,
    worksWithTools: guideWorksWithTools(guide),
    searchText: shortcutSearchValues(guide).join(" ").toLowerCase(),
  };
}

function tokenSet(values: readonly string[]): Set<string> {
  const ignored = new Set([
    "the",
    "and",
    "for",
    "with",
    "into",
    "from",
    "this",
    "that",
    "your",
    "using",
    "guide",
    "shortcut",
    "shortcuts",
    "tools",
    "tool",
    "ai",
  ]);

  return new Set(
    values
      .join(" ")
      .split(" ")
      .map((value) => normalizeSearch(value))
      .filter((value) => value.length >= 4 && !ignored.has(value)),
  );
}

function overlapCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  left.forEach((value) => {
    if (right.has(value)) {
      count += 1;
    }
  });
  return count;
}

function relatedScore(source: Guide, candidate: Guide): number {
  let score = 0;

  if (source.topicCluster && source.topicCluster === candidate.topicCluster) {
    score += 100;
  }

  if (source.category === candidate.category) {
    score += 40;
  }

  const sourceUseCaseTokens = tokenSet([source.useCase, source.persona, source.category]);
  const candidateUseCaseTokens = tokenSet([candidate.useCase, candidate.persona, candidate.category]);
  score += Math.min(overlapCount(sourceUseCaseTokens, candidateUseCaseTokens) * 8, 24);

  const sourceAliasTokens = tokenSet(guideSearchAliases(source));
  const candidateAliasTokens = tokenSet(guideSearchAliases(candidate));
  score += Math.min(overlapCount(sourceAliasTokens, candidateAliasTokens) * 10, 40);

  const sourceTools = new Set(source.recommendedToolSlugs);
  const candidateTools = new Set(candidate.recommendedToolSlugs);
  score += Math.min(overlapCount(sourceTools, candidateTools) * 3, 9);

  return score;
}

export function selectRelatedShortcuts(
  guide: Guide,
  publishedGuides: readonly Guide[],
): {
  readonly sectionTitle: string;
  readonly sectionSubtitle: string;
  readonly guides: readonly Guide[];
} {
  const candidates = publishedGuides.filter((item) => item.slug !== guide.slug);
  const scored = candidates
    .map((candidate) => ({
      guide: candidate,
      score: relatedScore(guide, candidate),
    }))
    .sort((left, right) => right.score - left.score);

  const strongMatches = scored.filter((item) => item.score >= 20);

  if (strongMatches.length > 0) {
    return {
      sectionTitle: "Related shortcuts",
      sectionSubtitle:
        "Open another AteFlo shortcut that overlaps with this task, category, tools, or search intent.",
      guides: strongMatches.slice(0, 3).map((item) => item.guide),
    };
  }

  return {
    sectionTitle: "Explore more shortcuts",
    sectionSubtitle:
      "No close match is published yet. Browse another AteFlo shortcut if your next task starts somewhere else.",
    guides: candidates.slice(0, 3),
  };
}
