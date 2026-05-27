import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { assertGuideContentQuality } from "@/lib/contentQuality";

export type GuideStatus = "draft" | "published";
export type GuideSkillLevel = "beginner" | "intermediate" | "advanced";

export interface GuideComparisonRow {
  readonly toolSlug: string;
  readonly toolName: string;
  readonly bestFor: string;
  readonly freePlan: boolean;
  readonly easeOfUse: string;
  readonly whyConsider: string;
  readonly watchFor: string;
}

export interface GuideDecisionStep {
  readonly situation: string;
  readonly recommendation: string;
  readonly reason: string;
}

export interface GuideFaq {
  readonly question: string;
  readonly answer: string;
}

export interface GuideVisualSummary {
  readonly headline: string;
  readonly points: readonly string[];
}

export interface Guide {
  readonly slug: string;
  readonly title: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly category: string;
  readonly persona: string;
  readonly useCase: string;
  readonly budgetAngle: string;
  readonly skillLevel: GuideSkillLevel;
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly quickVerdict: string;
  readonly keyTakeaways: readonly string[];
  readonly recommendedToolSlugs: readonly string[];
  readonly comparisonRows: readonly GuideComparisonRow[];
  readonly decisionPath: readonly GuideDecisionStep[];
  readonly moneySavingTips: readonly string[];
  readonly pricingNote: string;
  readonly faqs: readonly GuideFaq[];
  readonly finalVerdict: string;
  readonly ctaToFinder: string;
  readonly visualSummary: GuideVisualSummary;
  readonly status: GuideStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const GUIDES_DIRECTORY = path.join(process.cwd(), "content", "guides");

function readAllGuideFiles(): Guide[] {
  if (!existsSync(GUIDES_DIRECTORY)) {
    return [];
  }

  return readdirSync(GUIDES_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(GUIDES_DIRECTORY, fileName);
      const value: unknown = JSON.parse(readFileSync(filePath, "utf8"));

      assertGuideContentQuality(value, fileName);
      return value;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getAllGuides(): Guide[] {
  return readAllGuideFiles();
}

export function getPublishedGuides(): Guide[] {
  return readAllGuideFiles().filter((guide) => guide.status === "published");
}

export function getPublishedGuideBySlug(slug: string): Guide | undefined {
  return getPublishedGuides().find((guide) => guide.slug === slug);
}
