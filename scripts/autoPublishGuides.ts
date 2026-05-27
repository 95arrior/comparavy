import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { guideTopics } from "@/data/guideTopics";
import {
  checkGuideQuality,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import { reviewGuideWithAI, type AiGuideReview } from "@/lib/aiGuideReviewer";
import type { Guide } from "@/lib/guides";
import {
  GUIDES_DIRECTORY,
  createTemplateGuide,
  getExistingGuides,
} from "@/scripts/generateGuides";

interface AutoPublishOptions {
  readonly count: number;
  readonly minQuality: number;
  readonly dryRun: boolean;
}

interface Candidate {
  readonly guide: Guide;
  readonly generated: boolean;
  readonly topicPriority: number;
  readonly uniquenessScore: number;
  readonly deterministic: GuideQualityResult;
  readonly aiReview: AiGuideReview;
  readonly eligible: boolean;
  readonly rejectionReasons: readonly string[];
}

const DEFAULT_COUNT = 2;
const DEFAULT_MIN_QUALITY = 90;
const DEFAULT_MAX_DAILY_PUBLISH = 2;
const CANDIDATE_MULTIPLIER = 3;

function parseNonNegativeInteger(value: string | undefined, option: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be a non-negative integer.`);
  }

  return parsed;
}

function parseOptions(args: readonly string[]): AutoPublishOptions {
  let count = DEFAULT_COUNT;
  let minQuality = DEFAULT_MIN_QUALITY;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--count") {
      count = parseNonNegativeInteger(args[index + 1], "--count");
      index += 1;
      continue;
    }

    if (argument === "--min-quality") {
      minQuality = parseNonNegativeInteger(args[index + 1], "--min-quality");

      if (minQuality > 100) {
        throw new Error("--min-quality must be between 0 and 100.");
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  return { count, minQuality, dryRun };
}

function dailyPublishLimit(): number {
  const configured = process.env.MAX_DAILY_PUBLISH;

  if (!configured) {
    return DEFAULT_MAX_DAILY_PUBLISH;
  }

  return parseNonNegativeInteger(configured, "MAX_DAILY_PUBLISH");
}

function topicPriority(guide: Guide): number {
  const index = guideTopics.findIndex((topic) => topic.slug === guide.slug);
  return index < 0 ? 0 : guideTopics.length - index;
}

function uniquenessScore(guide: Guide, publishedGuides: readonly Guide[]): number {
  const recommendations = new Set(guide.recommendedToolSlugs);
  let maximumOverlap = 0;

  for (const published of publishedGuides) {
    if (published.slug === guide.slug) {
      continue;
    }

    const overlap = published.recommendedToolSlugs.filter((slug) =>
      recommendations.has(slug),
    ).length;
    maximumOverlap = Math.max(maximumOverlap, overlap);
  }

  if (recommendations.size === 0) {
    return 0;
  }

  return Math.round((1 - maximumOverlap / recommendations.size) * 100);
}

function requiredPublishingReasons(
  guide: Guide,
  deterministic: GuideQualityResult,
  aiReview: AiGuideReview,
  threshold: number,
): string[] {
  const reasons: string[] = [];

  if (!deterministic.passed) {
    reasons.push("Deterministic quality check did not pass.");
  }

  if (deterministic.blockers.length > 0) {
    reasons.push("Deterministic quality blockers are present.");
  }

  if (deterministic.score < threshold) {
    reasons.push(`Deterministic score ${deterministic.score} is below required threshold ${threshold}.`);
  }

  if (guide.recommendedToolSlugs.length < 3) {
    reasons.push("At least three recommended tools are required.");
  }

  if (guide.pricingNote.trim().length === 0) {
    reasons.push("A pricing note is required.");
  }

  if (!guide.ctaToFinder.includes("/finder")) {
    reasons.push("The finder CTA must refer readers to /finder.");
  }

  if (aiReview.available && (!aiReview.passed || aiReview.score < 85)) {
    reasons.push("AI editorial review did not meet the publish threshold of 85.");
  }

  return reasons;
}

function sortCandidates(left: Candidate, right: Candidate): number {
  return (
    Number(right.eligible) - Number(left.eligible) ||
    right.deterministic.score - left.deterministic.score ||
    (right.aiReview.available ? right.aiReview.score : 0) -
      (left.aiReview.available ? left.aiReview.score : 0) ||
    right.topicPriority - left.topicPriority ||
    right.uniquenessScore - left.uniquenessScore ||
    left.guide.slug.localeCompare(right.guide.slug)
  );
}

function logCandidate(candidate: Candidate): void {
  const aiScore = candidate.aiReview.available
    ? `${candidate.aiReview.score}/100 (${candidate.aiReview.passed ? "PASS" : "FAIL"})`
    : "unavailable";

  console.log(
    `[${candidate.guide.slug}] deterministic=${candidate.deterministic.score}/100 ` +
      `ai=${aiScore} priority=${candidate.topicPriority} uniqueness=${candidate.uniquenessScore}/100 ` +
      `eligible=${candidate.eligible ? "yes" : "no"}`,
  );

  for (const warning of candidate.deterministic.warnings) {
    console.log(`  Warning: ${warning}`);
  }

  for (const blocker of candidate.deterministic.blockers) {
    console.log(`  Blocker: ${blocker}`);
  }

  for (const warning of candidate.aiReview.warnings) {
    console.log(`  AI warning: ${warning}`);
  }

  for (const reason of candidate.rejectionReasons) {
    console.log(`  Rejected: ${reason}`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const publishCount = Math.min(options.count, dailyPublishLimit());
  const desiredCandidateCount = publishCount * CANDIDATE_MULTIPLIER;
  const existingGuides = await getExistingGuides();
  const existingSlugs = new Set(existingGuides.map((guide) => guide.slug));
  const draftGuides = existingGuides.filter((guide) => guide.status === "draft");
  const availableTopics = guideTopics.filter((topic) => !existingSlugs.has(topic.slug));
  const newCandidateCount = Math.max(0, desiredCandidateCount - draftGuides.length);
  const generatedGuides = availableTopics
    .slice(0, newCandidateCount)
    .map((topic) => createTemplateGuide(topic, "draft"));
  const candidateGuides =
    publishCount === 0 ? [] : [...draftGuides, ...generatedGuides];
  const comparisonSet = [...existingGuides, ...generatedGuides];
  const publishedGuides = existingGuides.filter((guide) => guide.status === "published");
  const reviewerUnavailable = !process.env.OPENAI_API_KEY;
  const qualityThreshold = reviewerUnavailable
    ? Math.max(options.minQuality, 92)
    : options.minQuality;

  if (options.count > publishCount) {
    console.log(
      `Requested ${options.count} publication(s); MAX_DAILY_PUBLISH limits this run to ${publishCount}.`,
    );
  }

  if (reviewerUnavailable) {
    console.log("AI reviewer unavailable; using stricter deterministic threshold.");
  }

  if (candidateGuides.length < desiredCandidateCount) {
    console.log(
      `Only ${candidateGuides.length} candidate guide(s) are available from drafts and configured unused topics; target pool was ${desiredCandidateCount}.`,
    );
  }

  const candidates: Candidate[] = [];

  for (const guide of candidateGuides) {
    const otherGuides = comparisonSet.filter((existing) => existing.slug !== guide.slug);
    const deterministic = checkGuideQuality(guide, otherGuides);
    const aiReview = await reviewGuideWithAI(guide);
    const rejectionReasons = requiredPublishingReasons(
      guide,
      deterministic,
      aiReview,
      qualityThreshold,
    );

    candidates.push({
      guide,
      generated: generatedGuides.some((generated) => generated.slug === guide.slug),
      topicPriority: topicPriority(guide),
      uniquenessScore: uniquenessScore(guide, publishedGuides),
      deterministic,
      aiReview,
      eligible: rejectionReasons.length === 0,
      rejectionReasons,
    });
  }

  candidates.sort(sortCandidates);

  for (const candidate of candidates) {
    logCandidate(candidate);
  }

  const selected = candidates.filter((candidate) => candidate.eligible).slice(0, publishCount);
  const selectedSlugs = new Set(selected.map((candidate) => candidate.guide.slug));
  const today = new Date().toISOString().slice(0, 10);

  if (!options.dryRun) {
    await mkdir(GUIDES_DIRECTORY, { recursive: true });

    for (const candidate of candidates) {
      if (!candidate.generated && !selectedSlugs.has(candidate.guide.slug)) {
        continue;
      }

      const guide = selectedSlugs.has(candidate.guide.slug)
        ? { ...candidate.guide, status: "published" as const, updatedAt: today }
        : candidate.guide;
      const filePath = path.join(GUIDES_DIRECTORY, `${guide.slug}.json`);
      await writeFile(filePath, `${JSON.stringify(guide, null, 2)}\n`, "utf8");
    }
  }

  for (const candidate of selected) {
    console.log(
      `[${candidate.guide.slug}] ${options.dryRun ? "Would publish (dry run)." : "Published."}`,
    );
  }

  const rejectedCount = candidates.filter((candidate) => !candidate.eligible).length;
  const draftCount = candidates.length - selected.length;

  console.log("Auto publish summary");
  console.log(`Candidates created: ${generatedGuides.length}`);
  console.log(`Candidates checked: ${candidates.length}`);
  console.log(`Published: ${options.dryRun ? 0 : selected.length}`);

  if (options.dryRun) {
    console.log(`Would publish: ${selected.length}`);
    console.log("Dry run: no guide files modified.");
  }

  console.log(`Draft: ${draftCount}`);
  console.log(`Rejected: ${rejectedCount}`);

  if (selected.length < publishCount) {
    console.log(`Published fewer than requested because only ${selected.length} candidate(s) passed all gates.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
