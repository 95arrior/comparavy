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

const TOPIC_WORKS_WITH_SLUGS: Record<string, readonly string[]> = {
  "best-ai-tools-for-etsy-product-descriptions": ["canva-magic-studio", "chatgpt", "claude"],
  "best-ai-tools-for-small-business-content-calendars": ["canva-magic-studio", "chatgpt", "claude"],
  "how-to-summarize-a-pdf-into-study-notes-with-ai": ["chatgpt", "claude", "gemini"],
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": ["canva-magic-studio", "chatgpt", "claude"],
  "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai": ["chatgpt", "notion-ai", "otter-ai"],
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": ["otter-ai", "chatgpt", "claude"],
  "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic": ["chatgpt", "claude", "gemini"],
  "how-to-write-google-business-profile-posts-with-ai": ["chatgpt", "gemini", "canva-magic-studio"],
  "blog-to-instagram-carousel": ["canva-magic-studio", "chatgpt", "claude"],
  "dating-app-bio": ["chatgpt", "claude", "gemini"],
  "etsy-product-descriptions": ["canva-magic-studio", "chatgpt", "claude"],
  "google-business-profile-posts": ["chatgpt", "gemini", "canva-magic-studio"],
  "meeting-notes-client-recaps": ["otter-ai", "chatgpt", "claude"],
  "pdf-study-notes": ["chatgpt", "claude", "gemini"],
  "small-business-content-calendar": ["canva-magic-studio", "chatgpt", "claude"],
  "voice-memo-to-task-list": ["chatgpt", "notion-ai", "otter-ai"],
};

const FALLBACK_WORKS_WITH_SLUGS = ["chatgpt", "claude", "gemini"] as const;

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

function validToolSlugs(slugs: readonly string[]): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];

  for (const slug of slugs) {
    if (seen.has(slug) || !toolsBySlug.has(slug as ToolSlug)) {
      continue;
    }

    seen.add(slug);
    valid.push(slug);
  }

  return valid;
}

function stringArrayValue(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function toolObjectSlugs(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const slug = (item as { readonly toolSlug?: unknown; readonly slug?: unknown }).toolSlug ??
      (item as { readonly toolSlug?: unknown; readonly slug?: unknown }).slug;

    return typeof slug === "string" && slug.trim().length > 0 ? [slug] : [];
  });
}

function explicitWorksWithSlugs(guide: Guide): string[] {
  const metadata = guide as unknown as {
    readonly worksWithToolSlugs?: unknown;
    readonly worksWithTools?: unknown;
    readonly toolSlugs?: unknown;
    readonly tools?: unknown;
  };

  return validToolSlugs([
    ...stringArrayValue(metadata.worksWithToolSlugs),
    ...stringArrayValue(metadata.worksWithTools),
    ...stringArrayValue(metadata.toolSlugs),
    ...stringArrayValue(metadata.tools),
    ...toolObjectSlugs(metadata.worksWithTools),
  ]);
}

function topicWorksWithSlugs(guide: Guide): string[] {
  return validToolSlugs([
    ...(TOPIC_WORKS_WITH_SLUGS[guide.slug] ?? []),
    ...(guide.topicCluster ? TOPIC_WORKS_WITH_SLUGS[guide.topicCluster] ?? [] : []),
  ]);
}

function fallbackWorksWithSlugs(guide: Guide): string[] {
  return validToolSlugs([
    ...guide.recommendedToolSlugs,
    ...toolObjectSlugs(guide.recommendedTools),
    ...toolObjectSlugs(guide.toolsYouCanUse),
    ...toolObjectSlugs(guide.bestPicksBySituation),
    ...toolObjectSlugs(guide.comparisonRows),
    ...toolObjectSlugs(guide.steps),
    ...FALLBACK_WORKS_WITH_SLUGS,
  ]);
}

function resolveWorksWithSlugs(guide: Guide): string[] {
  const explicit = explicitWorksWithSlugs(guide);

  if (explicit.length > 0) {
    return explicit;
  }

  const topic = topicWorksWithSlugs(guide);

  if (topic.length > 0) {
    return topic;
  }

  return fallbackWorksWithSlugs(guide);
}

export function guideWorksWithTools(
  guide: Guide,
  limit = 3,
): readonly ShortcutWorksWithTool[] {
  const tools = resolveWorksWithSlugs(guide).flatMap((slug) => {
    const tool = toolsBySlug.get(slug as ToolSlug);
    return tool ? [tool] : [];
  });

  return tools.slice(0, limit).map((tool) => ({
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
    case "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai":
      return [
        ...guideAliases,
        "voice memo to do list",
        "voice memo task list",
        "voice note to tasks",
        "turn voice memo into tasks",
        "AI to do list from voice note",
        "action items from voice memo",
        "messy notes to task list",
        "phone voice memo tasks",
        "reminder list from voice memo",
        "to do list",
      ];
    case "how-to-write-google-business-profile-posts-with-ai":
      return [
        ...guideAliases,
        "Google Business Profile posts",
        "Google Business Profile post ideas",
        "Google business posts AI",
        "local business post ideas",
        "GBP posts",
        "Google Maps business posts",
        "small business update post",
        "local business promotion post",
        "AI Google business post",
      ];
    case "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic":
      return [
        ...guideAliases,
        "AI dating app bio",
        "dating app bio with AI",
        "Hinge bio AI",
        "Bumble bio AI",
        "Tinder bio AI",
        "dating profile bio",
        "dating app prompt answers",
        "write dating profile",
        "dating bio not generic",
        "dating app bio ideas",
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

export function shortcutSearchRelevance(shortcut: ShortcutDiscoveryItem, normalizedQuery: string): number {
  if (!normalizedQuery) {
    return 0;
  }

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  let score = 0;
  const title = normalizeSearch(shortcut.title);
  const summary = normalizeSearch(shortcut.summary);
  const category = normalizeSearch(shortcut.category);
  const topicCluster = normalizeSearch(shortcut.topicCluster ?? "");
  const aliases = shortcut.searchAliases.map(normalizeSearch);
  const tools = shortcut.worksWithTools.map((tool) => normalizeSearch(tool.name));
  const allTermsMatch = queryTerms.every((term) => shortcut.searchText.includes(term));

  if (title === normalizedQuery) score += 180;
  if (title.includes(normalizedQuery)) score += 120;
  if (title.startsWith(normalizedQuery)) score += 40;
  if (aliases.some((alias) => alias === normalizedQuery)) score += 110;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 85;
  if (summary.includes(normalizedQuery)) score += 55;
  if (category.includes(normalizedQuery)) score += 35;
  if (topicCluster.includes(normalizedQuery)) score += 35;
  if (tools.some((tool) => tool.includes(normalizedQuery))) score += 30;
  if (allTermsMatch) score += 20;
  if (shortcut.searchText.includes(normalizedQuery)) score += 10;

  return score;
}

function discoverySummary(guide: Guide): string {
  switch (guide.slug) {
    case "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai":
      return "Turn a messy voice memo transcript into tasks, priorities, deadlines, and next actions.";
    case "how-to-write-google-business-profile-posts-with-ai":
      return "Create review-ready Google Business Profile posts for updates, offers, and local promotions.";
    case "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic":
      return "Write dating app bio options that sound specific, natural, and not AI-generated.";
    default:
      return guide.quickAnswer ?? guide.quickVerdict ?? guide.metaDescription;
  }
}

export function toDiscoveryItem(guide: Guide): ShortcutDiscoveryItem {
  const searchAliases = guideSearchAliases(guide);

  return {
    slug: guide.slug,
    title: guide.title,
    summary: discoverySummary(guide),
    category: guide.category,
    skillLevel: guide.skillLevel,
    timeEstimate: guide.timeEstimate,
    guideTypeLabel: formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType)),
    topicCluster: guide.topicCluster,
    worksWithTools: guideWorksWithTools(guide),
    compactWorksWithTools: guideWorksWithTools(guide, 5),
    searchAliases,
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

  const strongMatches = scored.filter((item) => item.score >= 60);

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
