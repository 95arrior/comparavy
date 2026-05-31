import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { GuideFreshness } from "@/data/guideTopics";
import { assertGuideContentQuality } from "@/lib/contentQuality";
import type { GuideDeviceIntent, GuideLayoutType } from "@/lib/guideTypes";

export type GuideStatus = "draft" | "approved" | "published" | "rejected" | "candidate" | (string & {});
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

export interface GuideWorkflowStep {
  readonly title: string;
  readonly detail: string;
  readonly why?: string;
  readonly output?: string;
  readonly toolSlug?: string;
  readonly toolName?: string;
}

export interface GuideFaq {
  readonly question: string;
  readonly answer: string;
}

export interface GuideToolUse {
  readonly toolSlug: string;
  readonly toolName: string;
  readonly why: string;
  readonly role?: string;
  readonly bestUseCase?: string;
}

export interface GuideVisualSummary {
  readonly headline: string;
  readonly points: readonly string[];
}

export interface GuideVisualHeroAsset {
  readonly type: "hero";
  readonly alt: string;
  readonly promptOrDescription: string;
  readonly fileNameHint: string;
}

export interface GuideVisualWorkflowAsset {
  readonly type: "workflow-diagram";
  readonly alt: string;
  readonly steps: readonly string[];
}

export interface GuideVisualToolStackAsset {
  readonly type: "tool-stack";
  readonly alt: string;
  readonly tools: readonly string[];
}

export interface GuideVisualBeforeAfterAsset {
  readonly type: "before-after";
  readonly alt: string;
  readonly before: string;
  readonly after: string;
}

export interface GuideVisualAssets {
  readonly hero?: GuideVisualHeroAsset;
  readonly workflow?: GuideVisualWorkflowAsset;
  readonly toolStack?: GuideVisualToolStackAsset;
  readonly beforeAfter?: GuideVisualBeforeAfterAsset;
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
  readonly guideType?: GuideLayoutType | "practical" | "evergreen";
  readonly topicCluster?: string;
  readonly publishPriority?: number;
  readonly type?: string;
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
  readonly deviceIntent?: GuideDeviceIntent;
  readonly desktopUseCase?: string;
  readonly mobileUseCase?: string;
  readonly desktopSearchAngle?: string;
  readonly mobileSearchAngle?: string;
  readonly visualAssets?: GuideVisualAssets;
  readonly quickAnswer?: string;
  readonly quickDecision?: string;
  readonly realWorldScenario?: string;
  readonly whatYouNeed?: readonly string[] | string;
  readonly timeEstimate?: string;
  readonly contentGap: string;
  readonly uniqueAngle: string;
  readonly aiOverviewAnswer: string;
  readonly quickVerdict: string;
  readonly steps?: readonly GuideWorkflowStep[];
  readonly toolsYouCanUse?: readonly GuideToolUse[];
  readonly keyTakeaways: readonly string[];
  readonly bestPicksBySituation: readonly BestPickBySituation[];
  readonly recommendedToolSlugs: readonly string[];
  readonly recommendedTools: readonly RecommendedGuideTool[];
  readonly comparisonRows: readonly GuideComparisonRow[];
  readonly decisionPath: readonly GuideDecisionStep[];
  readonly decisionTree?: readonly GuideDecisionStep[];
  readonly whoShouldUseThis: readonly string[];
  readonly whoShouldAvoidThis: readonly string[];
  readonly moneySavingTips: readonly string[];
  readonly pricingNote: string;
  readonly pricingCaveat: string;
  readonly realityCheck?: string;
  readonly skillNeeded?: string;
  readonly firstStep?: string;
  readonly commonMistakes?: readonly string[];
  readonly mistakesToAvoid?: readonly string[];
  readonly whatToAvoid?: readonly string[];
  readonly whatChanged?: string;
  readonly exampleWorkflow?: string;
  readonly exampleResult?: string;
  readonly faq?: readonly GuideFaq[];
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

function replacePublicBrandText(value: string): string {
  return value
    .replaceAll("Comparavy", "AteFlo")
    .replaceAll("comparavy.com", "ateflo.com");
}

function normalizePublicGuideBrand<T>(value: T): T {
  if (typeof value === "string") {
    return replacePublicBrandText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizePublicGuideBrand(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        normalizePublicGuideBrand(item),
      ]),
    ) as T;
  }

  return value;
}

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
      return normalizePublicGuideBrand(value as Guide);
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getAllGuides(): Guide[] {
  return readAllGuideFiles();
}

export function getPublishedGuides(): Guide[] {
  return readAllGuideFiles().filter((guide) => guide.status === "published");
}

export function getApprovedGuides(): Guide[] {
  return readAllGuideFiles().filter((guide) => guide.status === "approved");
}

export function getPublishedGuideBySlug(slug: string): Guide | undefined {
  return getPublishedGuides().find((guide) => guide.slug === slug);
}
