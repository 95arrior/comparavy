import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { GuideFreshness, GuideType } from "@/data/guideTopics";
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

export interface BestPickBySituation {
  readonly situation: string;
  readonly toolSlug: string;
  readonly toolName: string;
  readonly why: string;
}

export interface RecommendedGuideTool {
  readonly toolSlug: string;
  readonly toolName: string;
  readonly summary: string;
  readonly bestFor: string;
  readonly avoidIf: string;
  readonly strengths: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly toolPagePath: string;
}

export interface Guide {
  readonly slug: string;
  readonly title: string;
  readonly guideType: GuideType;
  readonly type?: GuideType;
  readonly metaTitle: string;
  readonly metaDescription: string;
  readonly category: string;
  readonly persona: string;
  readonly useCase: string;
  readonly budgetAngle: string;
  readonly skillLevel: GuideSkillLevel;
  readonly primaryKeyword: string;
  readonly secondaryKeywords: readonly string[];
  readonly longTailKeywords: readonly string[];
  readonly audience: string;
  readonly searchIntent: string;
  readonly userPain: string;
  readonly decisionQuestion: string;
  readonly contentGap: string;
  readonly uniqueAngle: string;
  readonly aiOverviewAnswer: string;
  readonly quickVerdict: string;
  readonly keyTakeaways: readonly string[];
  readonly bestPicksBySituation: readonly BestPickBySituation[];
  readonly recommendedToolSlugs: readonly string[];
  readonly recommendedTools: readonly RecommendedGuideTool[];
  readonly comparisonRows: readonly GuideComparisonRow[];
  readonly decisionPath: readonly GuideDecisionStep[];
  readonly whoShouldUseThis: readonly string[];
  readonly whoShouldAvoidThis: readonly string[];
  readonly moneySavingTips: readonly string[];
  readonly pricingNote: string;
  readonly pricingCaveat: string;
  readonly faqs: readonly GuideFaq[];
  readonly finalVerdict: string;
  readonly ctaToFinder: string;
  readonly finderCTA: string;
  readonly visualSummary: GuideVisualSummary;
  readonly affiliateDisclosureNote: string;
  readonly affiliateDisclosure: string;
  readonly freshness: GuideFreshness;
  readonly qualityScore: number;
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
