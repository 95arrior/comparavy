import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { Guide } from "@/lib/guides";

export const PRICING_NOTICE =
  "Pricing can change. Check the official site before subscribing.";

export interface ContentQualityIssue {
  readonly field: string;
  readonly message: string;
}

export interface GuideQualityResult {
  readonly passed: boolean;
  readonly score: number;
  readonly warnings: string[];
  readonly blockers: string[];
}

type GuideWithQualityMetadata = Guide & {
  readonly testData?: unknown;
  readonly uniquenessAngle?: string;
};

const GENERIC_PHRASES = [
  "save time",
  "boost productivity",
  "streamline your workflow",
  "game-changer",
  "revolutionize",
  "cutting-edge",
  "powerful tool",
  "robust solution",
] as const;

const TESTING_CLAIM_PATTERN =
  /\b(?:we tested|i tested|hands-on tested|after testing|our testing)\b/i;
const EXACT_MONTHLY_PRICE_PATTERN =
  /\$\s*\d+(?:[.,]\d{1,2})?\s*(?:\/\s*(?:mo(?:nth)?|month)|per\s+month)\b/i;
const WORDS_TO_IGNORE = new Set([
  "about",
  "adding",
  "and",
  "assistant",
  "best",
  "content",
  "creating",
  "drafting",
  "focused",
  "for",
  "from",
  "into",
  "need",
  "one",
  "people",
  "simple",
  "starting",
  "the",
  "tool",
  "tools",
  "using",
  "want",
  "with",
  "workflow",
  "workflows",
  "your",
]);

const TEXT_FIELDS = [
  "slug",
  "title",
  "metaTitle",
  "metaDescription",
  "category",
  "persona",
  "useCase",
  "budgetAngle",
  "skillLevel",
  "primaryKeyword",
  "quickVerdict",
  "pricingNote",
  "finalVerdict",
  "ctaToFinder",
  "status",
  "createdAt",
  "updatedAt",
] as const;

const ARRAY_FIELDS = [
  "secondaryKeywords",
  "keyTakeaways",
  "recommendedToolSlugs",
  "comparisonRows",
  "decisionPath",
  "moneySavingTips",
  "faqs",
] as const;

const STRING_ARRAY_FIELDS = [
  "secondaryKeywords",
  "keyTakeaways",
  "recommendedToolSlugs",
  "moneySavingTips",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, field: string): boolean {
  return typeof value[field] === "string" && value[field].trim().length > 0;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function textTerms(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((term) => term.length > 2 && !WORDS_TO_IGNORE.has(term)),
  );
}

function includesRelevantText(text: string, value: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length > 0 && normalizedText.includes(normalizedValue)) {
    return true;
  }

  const expected = [...textTerms(value)];

  if (expected.length === 0) {
    return false;
  }

  const actual = textTerms(text);
  const matches = expected.filter((term) => actual.has(term)).length;
  return matches >= Math.min(2, expected.length);
}

function readerFacingText(guide: Guide): string {
  return [
    guide.quickVerdict,
    ...guide.keyTakeaways,
    ...guide.comparisonRows.flatMap((row) => [
      row.toolName,
      row.bestFor,
      row.whyConsider,
      row.watchFor,
    ]),
    ...guide.decisionPath.flatMap((step) => [
      step.situation,
      step.recommendation,
      step.reason,
    ]),
    ...guide.moneySavingTips,
    ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
    guide.finalVerdict,
    guide.ctaToFinder,
    guide.visualSummary.headline,
    ...guide.visualSummary.points,
  ].join(" ");
}

function catalogToolMatchesGuide(slug: string, guide: Guide): boolean {
  const tool = toolsBySlug.get(slug as ToolSlug);

  if (!tool) {
    return false;
  }

  const guideTerms = textTerms(
    [guide.title, guide.category, guide.useCase, guide.primaryKeyword].join(" "),
  );
  const toolTerms = textTerms(
    [
      tool.category,
      tool.description,
      ...tool.bestFor,
      ...tool.useCases,
      ...tool.primaryTags,
    ].join(" "),
  );

  for (const term of guideTerms) {
    if (toolTerms.has(term)) {
      return true;
    }
  }

  return false;
}

export function validateGuideContent(value: unknown): ContentQualityIssue[] {
  const issues: ContentQualityIssue[] = [];

  if (!isRecord(value)) {
    return [{ field: "guide", message: "Guide content must be an object." }];
  }

  for (const field of TEXT_FIELDS) {
    if (!hasString(value, field)) {
      issues.push({ field, message: "A non-empty text value is required." });
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(value[field]) || value[field].length === 0) {
      issues.push({ field, message: "At least one entry is required." });
    }
  }

  for (const field of STRING_ARRAY_FIELDS) {
    if (
      Array.isArray(value[field]) &&
      value[field].some((entry) => typeof entry !== "string" || entry.trim().length === 0)
    ) {
      issues.push({ field, message: "Entries must be non-empty text values." });
    }
  }

  if (value.status !== "draft" && value.status !== "published") {
    issues.push({ field: "status", message: 'Status must be "draft" or "published".' });
  }

  if (
    value.skillLevel !== "beginner" &&
    value.skillLevel !== "intermediate" &&
    value.skillLevel !== "advanced"
  ) {
    issues.push({
      field: "skillLevel",
      message: "Skill level must be beginner, intermediate, or advanced.",
    });
  }

  if (value.pricingNote !== PRICING_NOTICE) {
    issues.push({
      field: "pricingNote",
      message: `Use the standard pricing notice: "${PRICING_NOTICE}"`,
    });
  }

  const guideText = JSON.stringify(value);

  if (
    EXACT_MONTHLY_PRICE_PATTERN.test(guideText) &&
    !(
      guideText.toLowerCase().includes("pricing can change") &&
      guideText.toLowerCase().includes("official site")
    )
  ) {
    issues.push({
      field: "pricing",
      message: "Exact monthly pricing requires a notice to check current pricing on the official site.",
    });
  }

  if (!hasString(value, "ctaToFinder") || !String(value.ctaToFinder).includes("/finder")) {
    issues.push({ field: "ctaToFinder", message: "The CTA must direct readers to /finder." });
  }

  if (Array.isArray(value.recommendedToolSlugs)) {
    for (const slug of value.recommendedToolSlugs) {
      if (typeof slug !== "string" || !toolsBySlug.has(slug as ToolSlug)) {
        issues.push({
          field: "recommendedToolSlugs",
          message: `Unknown catalog tool slug: ${String(slug)}.`,
        });
      }
    }
  }

  if (Array.isArray(value.comparisonRows)) {
    for (const row of value.comparisonRows) {
      if (
        !isRecord(row) ||
        !hasString(row, "toolSlug") ||
        !hasString(row, "toolName") ||
        !hasString(row, "bestFor") ||
        typeof row.freePlan !== "boolean" ||
        !hasString(row, "easeOfUse") ||
        !hasString(row, "whyConsider") ||
        !hasString(row, "watchFor")
      ) {
        issues.push({
          field: "comparisonRows",
          message: "Every row must include complete tool comparison details.",
        });
        break;
      }

      if (!toolsBySlug.has(row.toolSlug as ToolSlug)) {
        issues.push({
          field: "comparisonRows",
          message: `Unknown comparison tool slug: ${row.toolSlug}.`,
        });
      }
    }
  }

  if (
    Array.isArray(value.decisionPath) &&
    value.decisionPath.some(
      (step) =>
        !isRecord(step) ||
        !hasString(step, "situation") ||
        !hasString(step, "recommendation") ||
        !hasString(step, "reason"),
    )
  ) {
    issues.push({
      field: "decisionPath",
      message: "Every decision step must include a situation, recommendation, and reason.",
    });
  }

  if (
    Array.isArray(value.faqs) &&
    value.faqs.some(
      (faq) => !isRecord(faq) || !hasString(faq, "question") || !hasString(faq, "answer"),
    )
  ) {
    issues.push({
      field: "faqs",
      message: "Every FAQ must include a question and answer.",
    });
  }

  if (value.status === "published") {
    const minimums = [
      ["keyTakeaways", 3],
      ["comparisonRows", 3],
      ["decisionPath", 3],
      ["moneySavingTips", 3],
      ["faqs", 3],
    ] as const;

    for (const [field, minimum] of minimums) {
      if (Array.isArray(value[field]) && value[field].length < minimum) {
        issues.push({
          field,
          message: `Published guides need at least ${minimum} entries.`,
        });
      }
    }
  }

  if (!isRecord(value.visualSummary)) {
    issues.push({ field: "visualSummary", message: "A visual summary object is required." });
  } else if (
    !hasString(value.visualSummary, "headline") ||
    !Array.isArray(value.visualSummary.points) ||
    value.visualSummary.points.length === 0 ||
    value.visualSummary.points.some(
      (point) => typeof point !== "string" || point.trim().length === 0,
    )
  ) {
    issues.push({
      field: "visualSummary",
      message: "Visual summary needs a headline and at least one point.",
    });
  }

  return issues;
}

export function assertGuideContentQuality(
  value: unknown,
  source = "guide",
): asserts value is Guide {
  const issues = validateGuideContent(value);

  if (issues.length > 0) {
    const detail = issues.map((issue) => `${issue.field}: ${issue.message}`).join(" ");
    throw new Error(`Invalid guide content in ${source}. ${detail}`);
  }
}

export function checkGuideQuality(
  guide: Guide,
  existingGuides: readonly Guide[] = [],
): GuideQualityResult {
  let score = 100;
  const warnings: string[] = [];
  const blockers: string[] = [];

  function addBlocker(message: string, penalty = 12): void {
    if (!blockers.includes(message)) {
      blockers.push(message);
      score -= penalty;
    }
  }

  function addWarning(message: string, penalty = 4): void {
    if (!warnings.includes(message)) {
      warnings.push(message);
      score -= penalty;
    }
  }

  const validationIssues = validateGuideContent(guide);

  for (const issue of validationIssues) {
    addBlocker(`${issue.field}: ${issue.message}`, 10);
  }

  if (validationIssues.length > 0) {
    return {
      passed: false,
      score: Math.max(0, score),
      warnings,
      blockers,
    };
  }

  if (guide.quickVerdict.trim().length < 80) {
    addBlocker("quickVerdict must contain at least 80 characters.", 12);
  }

  const requiredArrayCounts = [
    ["keyTakeaways", guide.keyTakeaways.length, 5],
    ["recommendedToolSlugs", guide.recommendedToolSlugs.length, 3],
    ["comparisonRows", guide.comparisonRows.length, 3],
    ["decisionPath", guide.decisionPath.length, 3],
    ["moneySavingTips", guide.moneySavingTips.length, 3],
    ["faqs", guide.faqs.length, 4],
  ] as const;

  for (const [field, count, minimum] of requiredArrayCounts) {
    if (count < minimum) {
      addBlocker(`${field} must contain at least ${minimum} items.`, 10);
    }
  }

  if (guide.finalVerdict.trim().length < 120) {
    addBlocker("finalVerdict must contain at least 120 characters.", 12);
  }

  if (!guide.ctaToFinder.includes("/finder")) {
    addBlocker("ctaToFinder must refer readers to /finder.", 12);
  }

  if (guide.pricingNote.trim().length === 0) {
    addBlocker("pricingNote is required.", 10);
  }

  if (
    guide.visualSummary.headline.trim().length === 0 ||
    guide.visualSummary.points.length === 0
  ) {
    addBlocker("visualSummary must include a headline and summary points.", 10);
  }

  const recommendedNames = guide.recommendedToolSlugs
    .map((slug) => toolsBySlug.get(slug as ToolSlug)?.name)
    .filter((name): name is string => Boolean(name));

  if (
    !recommendedNames.some((name) => includesRelevantText(guide.quickVerdict, name)) ||
    !includesRelevantText(guide.quickVerdict, guide.useCase)
  ) {
    addWarning(
      "quickVerdict is too generic; identify a recommended tool and the real use case.",
      8,
    );
  }

  if (!recommendedNames.some((name) => includesRelevantText(guide.finalVerdict, name))) {
    addWarning("finalVerdict should name at least one specifically recommended tool.", 8);
  }

  const clearDecisionSteps = guide.decisionPath.filter((step) => {
    const conditionalSituation = /\b(?:if|when|need|priority|want)\b/i.test(step.situation);
    const knownRecommendation = recommendedNames.some((name) =>
      includesRelevantText(step.recommendation, name),
    );

    return conditionalSituation && knownRecommendation && step.reason.trim().length >= 12;
  }).length;

  if (clearDecisionSteps < Math.min(3, guide.decisionPath.length)) {
    addWarning(
      'decisionPath should use clear "If you need X, choose Y" reasoning for each option.',
      8,
    );
  }

  const matchingRecommendations = guide.recommendedToolSlugs.filter((slug) =>
    catalogToolMatchesGuide(slug, guide),
  ).length;

  if (matchingRecommendations < Math.min(2, guide.recommendedToolSlugs.length)) {
    addWarning("Recommended tools do not show a clear catalog match for this use case.", 8);
  }

  const contentText = readerFacingText(guide);
  const requiredContext = [
    ["persona", guide.persona],
    ["useCase", guide.useCase],
    ["budgetAngle", guide.budgetAngle],
  ] as const;

  for (const [field, value] of requiredContext) {
    if (!includesRelevantText(contentText, value)) {
      addWarning(`Guide content should clearly address its ${field}.`, 4);
    }
  }

  if (!includesRelevantText(contentText, guide.skillLevel)) {
    addWarning("Guide content should clearly address its skillLevel.", 4);
  }

  const fullGuideText = JSON.stringify(guide);
  const qualityMetadata = guide as GuideWithQualityMetadata;

  if (TESTING_CLAIM_PATTERN.test(fullGuideText) && qualityMetadata.testData === undefined) {
    addBlocker(
      'Testing claims such as "we tested" require supporting guide.testData.',
      30,
    );
  }

  if (
    EXACT_MONTHLY_PRICE_PATTERN.test(fullGuideText) &&
    !(
      fullGuideText.toLowerCase().includes("pricing can change") &&
      fullGuideText.toLowerCase().includes("official site")
    )
  ) {
    addBlocker(
      "Exact monthly pricing must say pricing can change and direct readers to the official site.",
      20,
    );
  }

  const genericPhraseCount = GENERIC_PHRASES.reduce((count, phrase) => {
    const occurrences = normalizeText(contentText).split(normalizeText(phrase)).length - 1;
    return count + occurrences;
  }, 0);

  if (genericPhraseCount >= 3) {
    addWarning(
      `Guide uses ${genericPhraseCount} generic marketing phrases; replace them with decision-specific detail.`,
      Math.min(10, genericPhraseCount * 2),
    );
  }

  const guideSlug = normalizeText(guide.slug);
  const guideTitle = normalizeText(guide.title);
  const guideKeyword = normalizeText(guide.primaryKeyword);
  const guideUseCase = normalizeText(guide.useCase);
  const guidePersona = normalizeText(guide.persona);
  const candidateSlugs = new Set(guide.recommendedToolSlugs);
  let greatestRecommendationOverlap: { slug: string; count: number } | undefined;

  for (const existing of existingGuides) {
    if (guideSlug === normalizeText(existing.slug)) {
      addBlocker(`Duplicate slug already used by ${existing.slug}.`, 20);
    }

    if (guideTitle === normalizeText(existing.title)) {
      addBlocker(`Duplicate title already used by ${existing.slug}.`, 15);
    }

    if (guideKeyword === normalizeText(existing.primaryKeyword)) {
      addBlocker(`Duplicate primaryKeyword already used by ${existing.slug}.`, 15);
    }

    if (
      guideUseCase === normalizeText(existing.useCase) &&
      guidePersona === normalizeText(existing.persona)
    ) {
      addBlocker(`Use case and persona already covered by ${existing.slug}.`, 15);
    }

    const overlap = existing.recommendedToolSlugs.filter((slug) =>
      candidateSlugs.has(slug),
    ).length;

    if (!greatestRecommendationOverlap || overlap > greatestRecommendationOverlap.count) {
      greatestRecommendationOverlap = { slug: existing.slug, count: overlap };
    }

    const existingAngle = (existing as GuideWithQualityMetadata).uniquenessAngle;
    if (
      qualityMetadata.uniquenessAngle &&
      existingAngle &&
      normalizeText(qualityMetadata.uniquenessAngle) === normalizeText(existingAngle)
    ) {
      addWarning(`uniquenessAngle is already used by ${existing.slug}.`, 8);
    }
  }

  if (
    greatestRecommendationOverlap &&
    candidateSlugs.size > 0 &&
    greatestRecommendationOverlap.count / candidateSlugs.size >= 0.8
  ) {
    addWarning(
      `Recommended tools substantially overlap with ${greatestRecommendationOverlap.slug}.`,
      6,
    );
  }

  const finalScore = Math.max(0, score);
  return {
    passed: blockers.length === 0 && finalScore >= 85,
    score: finalScore,
    warnings,
    blockers,
  };
}
