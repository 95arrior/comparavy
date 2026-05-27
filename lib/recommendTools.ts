import { tools } from "@/data/tools";
import type { AiTool, BudgetLevel, ToolCategory } from "@/types/tool";

export type RecommendationBudget = BudgetLevel;
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type RecommendationPriority =
  | "fastest"
  | "quality"
  | "easy"
  | "free"
  | "professional";

export interface RecommendationInput {
  goal: string;
  useCase: string;
  budget: RecommendationBudget;
  skillLevel: SkillLevel;
  priority: RecommendationPriority;
}

export interface ToolRecommendation {
  tool: AiTool;
  score: number;
  reasons: string[];
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  "general-assistant": "general assistant",
  research: "research",
  writing: "writing",
  productivity: "productivity",
  design: "design",
  "image-generation": "image creation",
  video: "video",
  audio: "audio",
  meetings: "meeting",
  presentations: "presentation",
  automation: "automation",
  coding: "coding",
  website: "website creation",
};

const GOAL_ALIASES: Record<ToolCategory, readonly string[]> = {
  "general-assistant": [
    "assistant",
    "brainstorm",
    "brainstorming",
    "general help",
    "everyday help",
    "answer questions",
  ],
  research: [
    "research",
    "sources",
    "citations",
    "search",
    "fact check",
    "market analysis",
    "competitor analysis",
    "compare products",
  ],
  writing: [
    "write",
    "writing",
    "copywriting",
    "copy",
    "article",
    "blog",
    "email",
    "editing",
    "rewrite",
    "content writing",
  ],
  productivity: [
    "productivity",
    "workspace",
    "knowledge base",
    "organize",
    "notes",
    "tasks",
    "project management",
  ],
  design: [
    "design",
    "graphic design",
    "social graphic",
    "social post",
    "flyer",
    "template",
  ],
  "image-generation": [
    "image",
    "images",
    "illustration",
    "logo",
    "poster",
    "photo",
    "visual art",
  ],
  video: [
    "video",
    "videos",
    "reel",
    "short form",
    "short-form",
    "clip",
    "avatar video",
    "youtube",
  ],
  audio: [
    "audio",
    "voice",
    "voiceover",
    "voice over",
    "narration",
    "dubbing",
    "podcast audio",
  ],
  meetings: [
    "meeting",
    "meetings",
    "interview notes",
    "minutes",
    "meeting transcription",
    "action items",
  ],
  presentations: ["presentation", "presentations", "slides", "deck", "pitch deck"],
  automation: [
    "automation",
    "automate",
    "workflow automation",
    "integrations",
    "connect apps",
    "pipeline",
  ],
  coding: [
    "code",
    "coding",
    "programming",
    "software",
    "debug",
    "developer",
    "build an app",
  ],
  website: [
    "website",
    "landing page",
    "portfolio site",
    "marketing site",
    "web page",
  ],
};

const STOP_WORDS = new Set([
  "a",
  "ai",
  "an",
  "and",
  "best",
  "create",
  "for",
  "help",
  "i",
  "make",
  "my",
  "need",
  "of",
  "the",
  "to",
  "tool",
  "use",
  "want",
  "with",
]);

const BUDGET_RANK: Record<BudgetLevel, number> = {
  free: 0,
  under20: 1,
  under50: 2,
  premium: 3,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedPhrase = normalize(phrase);

  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

function normalizeTerm(term: string): string {
  if (term.length > 4 && term.endsWith("ies")) {
    return `${term.slice(0, -3)}y`;
  }

  if (term.length > 3 && term.endsWith("s") && !term.endsWith("ss")) {
    return term.slice(0, -1);
  }

  return term;
}

function getTerms(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((term) => term.length > 1 && !STOP_WORDS.has(term))
      .map(normalizeTerm),
  );
}

function countOverlap(left: Set<string>, right: Set<string>): number {
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

function getGoalCategories(goal: string): Set<ToolCategory> {
  const matches = new Set<ToolCategory>();

  for (const [category, aliases] of Object.entries(GOAL_ALIASES) as [
    ToolCategory,
    readonly string[],
  ][]) {
    if (aliases.some((alias) => hasPhrase(goal, alias))) {
      matches.add(category);
    }
  }

  return matches;
}

function getBestUseCaseMatch(
  tool: AiTool,
  useCase: string,
): { useCase: string; overlap: number; phraseMatch: boolean } | null {
  const inputTerms = getTerms(useCase);
  let bestMatch: { useCase: string; overlap: number; phraseMatch: boolean } | null =
    null;

  for (const candidate of tool.useCases) {
    const phraseMatch =
      hasPhrase(useCase, candidate) || hasPhrase(candidate, useCase);
    const overlap = countOverlap(inputTerms, getTerms(candidate));

    if (
      bestMatch === null ||
      Number(phraseMatch) > Number(bestMatch.phraseMatch) ||
      (phraseMatch === bestMatch.phraseMatch && overlap > bestMatch.overlap)
    ) {
      bestMatch = { useCase: candidate, overlap, phraseMatch };
    }
  }

  return bestMatch;
}

function scoreBudget(
  tool: AiTool,
  input: RecommendationInput,
  reasons: string[],
): number {
  const requestedRank = BUDGET_RANK[input.budget];
  const toolRank = BUDGET_RANK[tool.budgetLevel];
  let score = 0;

  if (input.budget === "free") {
    if (tool.freePlan) {
      score += 24;
      addReason(reasons, "Offers a free plan for a free-budget workflow.");
    } else {
      score -= 32;
    }

    return score;
  }

  if (tool.freePlan || toolRank <= requestedRank) {
    score += input.budget === "premium" ? 4 : 12;

    if (input.budget !== "premium") {
      addReason(reasons, "Fits within the selected budget level.");
    }
  } else {
    score -= input.budget === "under20" ? 20 : 14;
  }

  return score;
}

function scoreSkillLevel(
  tool: AiTool,
  skillLevel: SkillLevel,
  reasons: string[],
): number {
  if (skillLevel === "beginner") {
    let score = tool.beginnerScore * 2;

    if (tool.beginnerScore >= 8) {
      addReason(
        reasons,
        `Beginner-friendly (${tool.beginnerScore}/10) with ${tool.setupDifficulty.toLowerCase()} setup difficulty.`,
      );
    }

    if (tool.setupDifficulty === "High") {
      score -= 20;
      addReason(reasons, "Requires more setup than most beginner-friendly options.");
    } else if (tool.setupDifficulty === "Low") {
      score += 6;
    }

    return score;
  }

  if (skillLevel === "intermediate") {
    return tool.setupDifficulty === "High" ? -4 : tool.easeScore;
  }

  return tool.setupDifficulty === "High" ? 4 : 0;
}

function scorePriority(
  tool: AiTool,
  priority: RecommendationPriority,
  reasons: string[],
): number {
  switch (priority) {
    case "fastest":
      addReason(reasons, `Strong speed score (${tool.speedScore}/10) for quick results.`);
      return tool.speedScore * 3;
    case "quality":
      addReason(reasons, `Strong quality score (${tool.qualityScore}/10) for output quality.`);
      return tool.qualityScore * 3;
    case "easy":
      addReason(reasons, `High ease score (${tool.easeScore}/10) for a simpler workflow.`);
      return tool.easeScore * 2 + tool.beginnerScore;
    case "free":
      if (tool.freePlan) {
        addReason(reasons, "Includes a free plan, matching the free-first priority.");
        return 24;
      }

      return -28;
    case "professional":
      addReason(
        reasons,
        `Strong quality score (${tool.qualityScore}/10) for professional-facing work.`,
      );
      return tool.qualityScore * 3 + tool.easeScore;
  }
}

function scoreTool(
  tool: AiTool,
  input: RecommendationInput,
  goalCategories: Set<ToolCategory>,
): ToolRecommendation {
  const reasons: string[] = [];
  const goalTerms = getTerms(input.goal);
  const toolGoalText = [
    CATEGORY_LABELS[tool.category],
    tool.description,
    ...tool.primaryTags,
    ...tool.bestFor,
    ...tool.useCases,
  ].join(" ");
  const goalOverlap = countOverlap(goalTerms, getTerms(toolGoalText));
  let score = 0;

  if (goalCategories.has(tool.category)) {
    score += 38;
    addReason(
      reasons,
      `Matches the ${CATEGORY_LABELS[tool.category]} goal you selected.`,
    );
  } else if (goalCategories.size > 0) {
    score -= 8;
  }

  if (goalOverlap > 0) {
    score += Math.min(goalOverlap * 5, 15);

    if (!goalCategories.has(tool.category)) {
      addReason(reasons, "Its capabilities overlap with the stated goal.");
    }
  }

  const useCaseMatch = getBestUseCaseMatch(tool, input.useCase);
  const tagOverlap = countOverlap(getTerms(input.useCase), getTerms(tool.primaryTags.join(" ")));

  if (useCaseMatch?.phraseMatch) {
    score += 34;
    addReason(reasons, `Directly supports "${useCaseMatch.useCase}".`);
  } else if (useCaseMatch && useCaseMatch.overlap > 0) {
    score += Math.min(useCaseMatch.overlap * 12, 30);
    addReason(reasons, `Relevant workflow fit: "${useCaseMatch.useCase}".`);
  }

  score += Math.min(tagOverlap * 5, 10);
  score += scoreBudget(tool, input, reasons);
  score += scoreSkillLevel(tool, input.skillLevel, reasons);
  score += scorePriority(tool, input.priority, reasons);

  return {
    tool,
    score,
    reasons,
  };
}

export function recommendTools(input: RecommendationInput): ToolRecommendation[] {
  const goalCategories = getGoalCategories(input.goal);

  return tools
    .map((tool) => scoreTool(tool, input, goalCategories))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.tool.qualityScore - left.tool.qualityScore ||
        right.tool.beginnerScore - left.tool.beginnerScore ||
        left.tool.name.localeCompare(right.tool.name),
    )
    .slice(0, 3);
}

export function getRecommendedTools(
  input: RecommendationInput,
): ToolRecommendation[] {
  return recommendTools(input);
}
