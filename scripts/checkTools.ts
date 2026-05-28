import { tools } from "@/data/tools";
import type { AiTool } from "@/types/tool";

const VALID_BUDGET_LEVELS = new Set<AiTool["budgetLevel"]>([
  "free",
  "under20",
  "under50",
  "premium",
]);

const VALID_SETUP_DIFFICULTIES = new Set<AiTool["setupDifficulty"]>([
  "Low",
  "Medium",
  "High",
]);

const VALID_RECOMMENDATION_TIERS = new Set<NonNullable<AiTool["recommendationTier"]>>([
  "core",
  "alternative",
  "catalog",
]);

function isValidScore(score: unknown): boolean {
  return typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 10;
}

function hasRequiredStringArray(values: readonly string[] | undefined): boolean {
  return Array.isArray(values) && values.length > 0 && values.every((value) => value.trim().length > 0);
}

function main(): void {
  const seenSlugs = new Set<string>();
  const categories = new Set<string>();
  const allSlugs = new Set(tools.map((tool) => tool.slug));

  let duplicateSlugs = 0;
  let missingOfficialUrl = 0;
  let missingIconDomain = 0;
  let invalidBudgetLevel = 0;
  let invalidSetupDifficulty = 0;
  let missingUseCases = 0;
  let missingBestFor = 0;
  let missingNotFor = 0;
  let missingAvoidIf = 0;
  let invalidAlternativeSlugs = 0;
  let missingRecommendationTier = 0;
  let missingConfidenceScore = 0;
  let invalidRecommendationTier = 0;
  let invalidConfidenceScore = 0;
  let totalCore = 0;
  let totalAlternative = 0;
  let totalCatalog = 0;

  for (const tool of tools) {
    categories.add(tool.category);

    if (seenSlugs.has(tool.slug)) {
      duplicateSlugs += 1;
    } else {
      seenSlugs.add(tool.slug);
    }

    if (!tool.officialUrl) {
      missingOfficialUrl += 1;
    }

    if (!tool.iconDomain) {
      missingIconDomain += 1;
    }

    if (!VALID_BUDGET_LEVELS.has(tool.budgetLevel)) {
      invalidBudgetLevel += 1;
    }

    if (!VALID_SETUP_DIFFICULTIES.has(tool.setupDifficulty)) {
      invalidSetupDifficulty += 1;
    }

    if (!hasRequiredStringArray(tool.useCases)) {
      missingUseCases += 1;
    }

    if (!hasRequiredStringArray(tool.bestFor)) {
      missingBestFor += 1;
    }

    if (!hasRequiredStringArray(tool.notFor)) {
      missingNotFor += 1;
    }

    if (!hasRequiredStringArray(tool.avoidIf)) {
      missingAvoidIf += 1;
    }

    if (!tool.recommendationTier) {
      missingRecommendationTier += 1;
    } else if (!VALID_RECOMMENDATION_TIERS.has(tool.recommendationTier)) {
      invalidRecommendationTier += 1;
    } else if (tool.recommendationTier === "core") {
      totalCore += 1;
    } else if (tool.recommendationTier === "alternative") {
      totalAlternative += 1;
    } else {
      totalCatalog += 1;
    }

    if (tool.confidenceScore === undefined) {
      missingConfidenceScore += 1;
    } else if (!isValidScore(tool.confidenceScore)) {
      invalidConfidenceScore += 1;
    }

  }

  for (const tool of tools) {
    for (const alternativeSlug of tool.alternatives) {
      if (!allSlugs.has(alternativeSlug)) {
        invalidAlternativeSlugs += 1;
      }
    }
  }

  console.log("Tool catalog summary");
  console.log(`Total tools: ${tools.length}`);
  console.log(`Categories: ${categories.size}`);
  console.log(`Duplicate slugs: ${duplicateSlugs}`);
  console.log(`Missing officialUrl: ${missingOfficialUrl}`);
  console.log(`Missing iconDomain: ${missingIconDomain}`);
  console.log(`Invalid budgetLevel: ${invalidBudgetLevel}`);
  console.log(`Invalid setupDifficulty: ${invalidSetupDifficulty}`);
  console.log(`Missing useCases: ${missingUseCases}`);
  console.log(`Missing bestFor: ${missingBestFor}`);
  console.log(`Missing notFor: ${missingNotFor}`);
  console.log(`Missing avoidIf: ${missingAvoidIf}`);
  console.log(`Broken alternatives: ${invalidAlternativeSlugs}`);
  console.log(`Missing recommendationTier: ${missingRecommendationTier}`);
  console.log(`Missing confidenceScore: ${missingConfidenceScore}`);
  console.log(`Invalid recommendationTier: ${invalidRecommendationTier}`);
  console.log(`Invalid confidenceScore: ${invalidConfidenceScore}`);
  console.log(`Core recommendations: ${totalCore}`);
  console.log(`Alternative recommendations: ${totalAlternative}`);
  console.log(`Catalog recommendations: ${totalCatalog}`);

  const warnings = [
    duplicateSlugs > 0 ? `${duplicateSlugs} duplicate slug(s)` : null,
    missingOfficialUrl > 0 ? `${missingOfficialUrl} tool(s) missing officialUrl` : null,
    missingIconDomain > 0 ? `${missingIconDomain} tool(s) missing iconDomain` : null,
    invalidBudgetLevel > 0 ? `${invalidBudgetLevel} invalid budgetLevel value(s)` : null,
    invalidSetupDifficulty > 0 ? `${invalidSetupDifficulty} invalid setupDifficulty value(s)` : null,
    missingUseCases > 0 ? `${missingUseCases} tool(s) missing useCases` : null,
    missingBestFor > 0 ? `${missingBestFor} tool(s) missing bestFor` : null,
    missingNotFor > 0 ? `${missingNotFor} tool(s) missing notFor` : null,
    missingAvoidIf > 0 ? `${missingAvoidIf} tool(s) missing avoidIf` : null,
    invalidAlternativeSlugs > 0 ? `${invalidAlternativeSlugs} alternative slug reference(s) missing` : null,
    missingRecommendationTier > 0 ? `${missingRecommendationTier} tool(s) missing recommendationTier` : null,
    missingConfidenceScore > 0 ? `${missingConfidenceScore} tool(s) missing confidenceScore` : null,
    invalidRecommendationTier > 0 ? `${invalidRecommendationTier} invalid recommendationTier value(s)` : null,
    invalidConfidenceScore > 0 ? `${invalidConfidenceScore} invalid confidenceScore value(s)` : null,
  ].filter((warning): warning is string => warning !== null);

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (warnings.length > 0) {
    process.exitCode = 1;
  }
}

main();
