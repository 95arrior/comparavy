import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { Guide } from "@/lib/guides";

export const PRICING_NOTICE =
  "Pricing can change. Check the official site before subscribing.";

export interface ContentQualityIssue {
  readonly field: string;
  readonly message: string;
}

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

  if (/\$\s*\d|\b\d+(?:\.\d+)?\s*(?:usd|dollars?)\b/i.test(guideText)) {
    issues.push({
      field: "pricing",
      message: "Do not state exact prices in guide content.",
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
