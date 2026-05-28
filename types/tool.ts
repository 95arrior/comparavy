export const TOOL_CATEGORIES = [
  "general-assistant",
  "research",
  "writing",
  "productivity",
  "design",
  "image-generation",
  "video",
  "audio",
  "meetings",
  "presentations",
  "automation",
  "coding",
  "website",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type BudgetLevel = "free" | "under20" | "under50" | "premium";
export type SetupDifficulty = "Low" | "Medium" | "High";
export type ToolScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AiTool {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly officialUrl: string;
  readonly affiliateUrl?: string;
  readonly iconPath?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
  readonly description: string;
  readonly bestFor: readonly string[];
  readonly notFor: readonly string[];
  readonly avoidIf: readonly string[];
  readonly useCases: readonly string[];
  readonly personas: readonly string[];
  readonly budgetLevel: BudgetLevel;
  readonly freePlan: boolean;
  readonly pricingNote: string;
  readonly pricingLastChecked: string;
  readonly easeScore: ToolScore;
  readonly speedScore: ToolScore;
  readonly qualityScore: ToolScore;
  readonly beginnerScore: ToolScore;
  readonly setupDifficulty: SetupDifficulty;
  readonly primaryTags: readonly string[];
  readonly alternatives: readonly string[];
  readonly recommendationTier?: "core" | "alternative" | "catalog";
  readonly confidenceScore?: number;
}
