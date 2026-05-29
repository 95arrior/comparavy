import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { guideTopics, type GuideTopic } from "@/data/guideTopics";
import {
  PRICING_NOTICE,
  assertGuideContentQuality,
  checkGuideQuality,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import { reviewGuideWithAI, type AiGuideReview } from "@/lib/aiGuideReviewer";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import { resolveGuideLayoutType, type GuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";
import { scoreToolsForTopic } from "@/lib/topicScoring";
import {
  GUIDES_DIRECTORY,
  GUIDE_SCHEMA,
  createArticleOutline,
  createEditorialBrief,
  createTemplateGuide,
  getExistingGuides,
  selectGuideTopics,
} from "@/scripts/generateGuides";

interface AutoPublishOptions {
  readonly count: number;
  readonly type: GuideLayoutType | "mixed";
  readonly minQuality: number;
  readonly dryRun: boolean;
  readonly publish: boolean;
}

interface Candidate {
  readonly guide: Guide;
  readonly topicSlug: string;
  readonly generated: boolean;
  readonly topicPriority: number;
  readonly uniquenessScore: number;
  readonly deterministic: GuideQualityResult;
  readonly aiReview: AiGuideReview;
  readonly improveAttempts: number;
  readonly eligible: boolean;
  readonly rejectionReasons: readonly string[];
  readonly finalStatus: CandidateFinalStatus;
  readonly slot: GuideLayoutType;
  readonly failureCategories: readonly string[];
}

type CandidateFinalStatus = "rejected" | "draft" | "would publish" | "published";

interface TopicQueueEntry {
  readonly topic: GuideTopic;
  readonly guideTypeOverride?: GuideLayoutType;
}

interface ResponsesResult {
  readonly output_text?: string;
  readonly output?: readonly {
    readonly content?: readonly {
      readonly type?: string;
      readonly text?: string;
      readonly refusal?: string;
    }[];
  }[];
}

interface SkippedTopic {
  readonly slug: string;
  readonly reason: string;
}

interface SlotReport {
  readonly guideType: GuideLayoutType;
  readonly target: number;
  attempts: number;
  status: "pending" | "filled" | "failed";
  acceptedTitle?: string;
  rejectionReasons: string[];
}

const DEFAULT_COUNT = 2;
const DEFAULT_MIN_QUALITY = 85;
const DEFAULT_MAX_DAILY_PUBLISH = 2;
const PUBLISH_THRESHOLD = 85;
const MAX_CANDIDATES_PER_RUN = 12;
const MAX_CANDIDATES_PER_SLOT = 6;
const MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE = 2;

function parseNonNegativeInteger(value: string | undefined, option: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be a non-negative integer.`);
  }

  return parsed;
}

function parseOptions(args: readonly string[]): AutoPublishOptions {
  let count = DEFAULT_COUNT;
  let type: AutoPublishOptions["type"] = "mixed";
  let minQuality = DEFAULT_MIN_QUALITY;
  let dryRun = false;
  let publish = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--publish") {
      publish = true;
      continue;
    }

    if (argument === "--count") {
      count = parseNonNegativeInteger(args[index + 1], "--count");
      index += 1;
      continue;
    }

    if (argument === "--type") {
      const rawType = args[index + 1];

      if (
        rawType !== "tool-decision" &&
        rawType !== "how-to" &&
        rawType !== "income" &&
        rawType !== "trend-led" &&
        rawType !== "practical" &&
        rawType !== "evergreen" &&
        rawType !== "mixed"
      ) {
        throw new Error("--type must be tool-decision, how-to, income, trend-led, mixed, practical, or evergreen.");
      }

      type =
        rawType === "practical" || rawType === "evergreen"
          ? "tool-decision"
          : (rawType as AutoPublishOptions["type"]);
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

  return { count, type, minQuality, dryRun, publish };
}

function dailyPublishLimit(): number {
  const configured = process.env.MAX_DAILY_PUBLISH;

  if (!configured) {
    return DEFAULT_MAX_DAILY_PUBLISH;
  }

  return parseNonNegativeInteger(configured, "MAX_DAILY_PUBLISH");
}

function effectiveQualityThreshold(requested: number): number {
  return Math.max(requested, PUBLISH_THRESHOLD);
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

const FORBIDDEN_EDITORIAL_PHRASES = [
  "selected for this guide",
  "core workflow",
  "fits your situation",
  "strong option",
  "useful for this use case",
  "good option",
  "this tool is best because it helps",
  "in today's digital world",
  "leverage ai",
  "unlock productivity",
] as const;

const GENERIC_FAQ_QUESTIONS = [
  /^what is\b/i,
  /^how does\b/i,
  /^is ai worth it\b/i,
  /^which ai tool is best\??$/i,
  /^can i use ai\??$/i,
] as const;

function normalizeForGuardrail(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function repeatedFieldValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const value of values) {
    const normalized = normalizeForGuardrail(value);

    if (normalized.length < 12) {
      continue;
    }

    if (seen.has(normalized)) {
      repeated.add(value);
    }

    seen.add(normalized);
  }

  return [...repeated];
}

function textContainsUsefulExample(guide: Guide): boolean {
  const text = [
    guide.exampleWorkflow ?? "",
    guide.exampleResult ?? "",
    ...guide.keyTakeaways,
    ...(guide.steps ?? []).map((step) => step.detail),
  ].join(" ").toLowerCase();

  return /\b(example|for example|before:|after:|draft|result|output)\b/.test(text);
}

function localEditorialGuardrails(guide: Guide): GuideQualityResult {
  let score = 100;
  const warnings: string[] = [];
  const blockers: string[] = [];
  const fullText = JSON.stringify(guide).toLowerCase();
  const guideType = candidateGuideType(guide);

  function addBlocker(message: string, penalty = 12): void {
    if (!blockers.includes(message)) {
      blockers.push(message);
      score -= penalty;
    }
  }

  function addWarning(message: string, penalty = 5): void {
    if (!warnings.includes(message)) {
      warnings.push(message);
      score -= penalty;
    }
  }

  for (const phrase of FORBIDDEN_EDITORIAL_PHRASES) {
    if (fullText.includes(phrase)) {
      addBlocker(`Local editorial guardrail: remove placeholder phrase "${phrase}".`, 12);
    }
  }

  const repeatedBestFor = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.bestFor));
  const repeatedAvoidIf = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.avoidIf));
  const repeatedWatchFor = repeatedFieldValues(guide.comparisonRows.map((row) => row.watchFor));

  if (repeatedBestFor.length > 0) {
    addBlocker("Local editorial guardrail: repeated Best for text across tools.", 10);
  }

  if (repeatedAvoidIf.length > 0) {
    addBlocker("Local editorial guardrail: repeated Avoid if text across tools.", 10);
  }

  if (repeatedWatchFor.length > 0) {
    addWarning("Local editorial guardrail: repeated Watch for text across tools.", 6);
  }

  const genericFaqs = guide.faqs.filter((faq) =>
    GENERIC_FAQ_QUESTIONS.some((pattern) => pattern.test(faq.question.trim())),
  );

  if (genericFaqs.length > 0) {
    addWarning("Local editorial guardrail: FAQ questions are too generic for search intent.", 8);
  }

  if (guideType === "how-to") {
    if (!/^how to\b/i.test(guide.title)) {
      addBlocker('Local editorial guardrail: how-to title must start with "How to".', 14);
    }

    if (/^best ai tools for\b/i.test(guide.title)) {
      addBlocker('Local editorial guardrail: how-to title must not start with "Best AI Tools for".', 14);
    }

    if (!guide.quickAnswer || !normalizeForGuardrail(guide.quickAnswer).includes(normalizeForGuardrail(guide.searchIntent).split(" ")[0] ?? "")) {
      addWarning("Local editorial guardrail: quick answer does not clearly match the search intent.", 6);
    }

    if (!guide.steps || guide.steps.length < 5) {
      addBlocker("Local editorial guardrail: how-to guide needs a real step-by-step workflow.", 12);
    }

    if (!textContainsUsefulExample(guide)) {
      addBlocker("Local editorial guardrail: no concrete example result or workflow.", 10);
    }
  }

  if (guide.deviceIntent === "both") {
    if (!guide.mobileUseCase?.trim() || !guide.desktopUseCase?.trim()) {
      addBlocker("Local editorial guardrail: deviceIntent=both requires mobile and desktop usefulness.", 10);
    }
  }

  if (!guide.ctaToFinder.includes("/finder") || !guide.finderCTA.includes("/finder")) {
    addBlocker("Local editorial guardrail: no clear /finder next step.", 10);
  }

  if (guideType === "tool-decision") {
    const decisionBranches = guide.decisionPath.filter((step) => /\b(if|when|choose|start|switch|avoid)\b/i.test(step.situation)).length;

    if (decisionBranches < 4) {
      addBlocker("Local editorial guardrail: weak decision path; add branching If/Then choices.", 10);
    }
  }

  return {
    passed: blockers.length === 0 && Math.max(0, score) >= 85,
    score: Math.max(0, score),
    warnings,
    blockers,
  };
}

function mergeQualityResults(base: GuideQualityResult, guardrails: GuideQualityResult): GuideQualityResult {
  const blockers = [...base.blockers, ...guardrails.blockers].filter((reason, index, all) => all.indexOf(reason) === index);
  const warnings = [...base.warnings, ...guardrails.warnings].filter((reason, index, all) => all.indexOf(reason) === index);
  const score = Math.min(base.score, guardrails.score);

  return {
    passed: base.passed && guardrails.passed && blockers.length === 0 && score >= 85,
    score,
    warnings,
    blockers,
  };
}

function runDeterministicQualityCheck(guide: Guide, comparisonGuides: readonly Guide[]): GuideQualityResult {
  return mergeQualityResults(
    checkGuideQuality(guide, comparisonGuides),
    localEditorialGuardrails(guide),
  );
}

function unavailableAiReview(reason: string): AiGuideReview {
  return {
    available: false,
    passed: false,
    score: 0,
    verdict: reason,
    warnings: [reason],
    suggestedFixes: ["Run AI editorial review and require score >= 85 before publishing."],
  };
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

  if (!guide.affiliateDisclosureNote?.trim()) {
    reasons.push("An affiliate disclosure note is required.");
  }

  if (!guide.ctaToFinder.includes("/finder")) {
    reasons.push("The finder CTA must refer readers to /finder.");
  }

  if (!guide.finderCTA.includes("/finder")) {
    reasons.push("The finderCTA field must refer readers to /finder.");
  }

  if (guide.qualityScore < threshold) {
    reasons.push(`Guide qualityScore ${guide.qualityScore} is below required threshold ${threshold}.`);
  }

  if (!aiReview.available) {
    reasons.push(`AI editorial review is required and must meet the publish threshold of ${PUBLISH_THRESHOLD}.`);
  } else if (!aiReview.passed || aiReview.score < PUBLISH_THRESHOLD) {
    reasons.push(`AI editorial review did not meet the publish threshold of ${PUBLISH_THRESHOLD}.`);
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

function guideFilePath(slug: string): string {
  return path.join(GUIDES_DIRECTORY, `${slug}.json`);
}

function logCandidate(candidate: Candidate): void {
  const aiScore = candidate.aiReview.available
    ? `${candidate.aiReview.score}/100 (${candidate.aiReview.passed ? "PASS" : "FAIL"})`
    : "unavailable";

  console.log(`[${candidate.guide.slug}] Candidate report`);
  console.log(`  Title: ${candidate.guide.title}`);
  console.log(
    `  Guide type: ${resolveGuideLayoutType({
      slug: candidate.guide.slug,
      title: candidate.guide.title,
      type: candidate.guide.type,
      guideType: candidate.guide.guideType,
      searchIntent: candidate.guide.searchIntent,
      decisionQuestion: candidate.guide.decisionQuestion,
      uniqueAngle: candidate.guide.uniqueAngle,
      notes: candidate.guide.contentGap,
    })}`,
  );
  console.log(`  Slot: ${candidate.slot}`);
  console.log(`  Topic slug: ${candidate.topicSlug}`);
  console.log(`  Primary keyword: ${candidate.guide.primaryKeyword}`);
  console.log(`  Selected tools: ${candidate.guide.recommendedToolSlugs.join(", ")}`);
  console.log(`  Quality score: ${candidate.guide.qualityScore}/100`);
  console.log(`  Deterministic check: ${candidate.deterministic.score}/100 (${candidate.deterministic.passed ? "PASS" : "FAIL"})`);
  console.log(`  AI review: ${aiScore}`);
  console.log(`  Improve attempt number: ${candidate.improveAttempts}`);
  console.log(`  Priority: ${candidate.topicPriority}`);
  console.log(`  Uniqueness: ${candidate.uniquenessScore}/100`);
  console.log(`  Final status: ${candidate.finalStatus}`);
  console.log(`  Top rejection reasons: ${candidate.rejectionReasons.slice(0, 3).join(" | ") || "None"}`);
  console.log(`  Failure categories: ${candidate.failureCategories.join(", ") || "None"}`);
  console.log(`  File path: ${guideFilePath(candidate.guide.slug)}`);

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

  if (candidate.finalStatus === "rejected") {
    const rejectionReasons = [
      ...candidate.aiReview.warnings,
      ...candidate.rejectionReasons,
    ].filter((reason, index, all) => all.indexOf(reason) === index);

    const topReasons = rejectionReasons.slice(0, 3);

    if (topReasons.length > 0) {
      console.log("  Top rejection reasons:");
      for (const reason of topReasons) {
        console.log(`    - ${reason}`);
      }
    }

    console.log(`  Improve generation rule: ${deriveImprovementRule(topReasons)}`);
  }
}

function deriveImprovementRule(reasons: readonly string[]): string {
  const combined = reasons.join(" ").toLowerCase();

  if (combined.includes("quick verdict") || combined.includes("quickverdict")) {
    return "Rewrite the Quick Verdict so it names the best starting tool, the second-best option, and the exact condition for avoiding the top pick.";
  }

  if (combined.includes("decisionpath") || combined.includes("decision path")) {
    return "Generate branching decision paths with explicit if/then logic tied to the actual input type and output needs.";
  }

  if (combined.includes("generic") || combined.includes("placeholder")) {
    return "Replace placeholder recommendation language with tool-specific input, output, and limitation reasons.";
  }

  if (combined.includes("faq")) {
    return "Write higher-intent FAQs that answer real workflow questions instead of generic filler.";
  }

  if (combined.includes("overlap")) {
    return "Select a less repetitive tool mix by checking recent published guides before finalizing the recommendation set.";
  }

  if (combined.includes("bestfor") || combined.includes("avoid if") || combined.includes("watch for")) {
    return "Make each tool card specific: say what input it handles best, what result it creates, and when to avoid it.";
  }

  return "Strengthen the guide's comparative evidence, branching logic, and tool-specific tradeoffs.";
}

function classifyFailureCategories(reasons: readonly string[], guide: Guide): string[] {
  const combined = `${reasons.join(" ")} ${guide.title}`.toLowerCase();
  const categories: string[] = [];

  function add(category: string, pattern: RegExp): void {
    if (pattern.test(combined) && !categories.includes(category)) {
      categories.push(category);
    }
  }

  add("vague quick answer", /quick answer|quick verdict|first 100|too generic/);
  add("too much tool-list content", /tool list|broad tool|best ai tools|supporting actors|placeholder phrase/);
  add("weak decision path", /decision path|branching|if\/then|decision logic/);
  add("generic FAQ", /faq|generic question/);
  add("repeated Best for / Avoid if", /repeated best for|repeated avoid if|watch for/);
  add("lack of concrete workflow", /workflow|step-by-step|concrete example|example result/);
  add("title too broad", /title|best ai tools for/);
  add("no mobile/desktop usefulness", /mobile|desktop|deviceintent/);
  add("insufficient comparison evidence", /comparison|evidence|ranking|verdict/);
  add("placeholder-style language", /placeholder|selected for this guide|core workflow|fits your situation|strong option/);

  if (candidateGuideType(guide) === "how-to" && !/^how to\b/i.test(guide.title)) {
    categories.push("title too broad");
  }

  return categories.filter((category, index, all) => all.indexOf(category) === index);
}

function specificRewriteFixes(categories: readonly string[]): string[] {
  const fixes: string[] = [];

  for (const category of categories) {
    if (category === "too much tool-list content") {
      fixes.push("Move tools lower, expand the workflow, add an example output, and strengthen the mistakes section.");
    } else if (category === "weak decision path") {
      fixes.push("Add branching If/Then choices that map tools to input type, output need, device, and skill level.");
    } else if (category === "generic FAQ") {
      fixes.push("Rewrite FAQs as high-intent search questions tied to the reader's problem.");
    } else if (category === "title too broad") {
      fixes.push('For how-to guides, change broad "Best AI Tools" framing into a concrete "How to" outcome.');
    } else if (category === "no mobile/desktop usefulness") {
      fixes.push("Add distinct phone and computer workflows in the same article.");
    } else if (category === "repeated Best for / Avoid if") {
      fixes.push("Rewrite every tool card so Best for, Avoid if, and Watch for are unique.");
    } else if (category === "lack of concrete workflow") {
      fixes.push("Rebuild Quick Answer, What you need, steps, example result, mistakes, FAQ, and next step.");
    } else if (category === "insufficient comparison evidence") {
      fixes.push("Justify rankings with criteria, practical examples, tradeoffs, and a clear final verdict.");
    } else if (category === "placeholder-style language") {
      fixes.push("Remove placeholder phrases and replace them with input, output, limitation, and review details.");
    }
  }

  return fixes.filter((fix, index, all) => all.indexOf(fix) === index);
}

function createDraftCandidate(
  topic: GuideTopic,
  usedToolSlugs: Set<string>,
  avoidToolSlugs: ReadonlySet<string>,
  guideTypeOverride?: GuideLayoutType,
): { readonly guide?: Guide; readonly skipped?: SkippedTopic } {
  try {
    const guide = createTemplateGuide(
      topic,
      "draft",
      new Set([...usedToolSlugs, ...avoidToolSlugs]),
      guideTypeOverride,
    );

    return { guide };
  } catch (error) {
    const reason = String(error instanceof Error ? error.message : error);
    console.warn(`[${topic.slug}] Warning: ${reason} Skipping this topic and trying the next eligible topic.`);
    return { skipped: { slug: topic.slug, reason } };
  }
}

function readOutputText(result: ResponsesResult): string | undefined {
  if (result.output_text) {
    return result.output_text;
  }

  for (const output of result.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "refusal") {
        return undefined;
      }

      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

function preferredGuideModels(): string[] {
  return [
    process.env.OPENAI_GUIDE_MODEL ?? process.env.OPENAI_MODEL,
    "gpt-5.5-high",
    "gpt-5.4-mini",
  ].filter((model, index, models): model is string =>
    typeof model === "string" &&
    model.trim().length > 0 &&
    models.indexOf(model) === index,
  );
}

function rejectionReasonsForImprovement(
  deterministic: GuideQualityResult,
  aiReview: AiGuideReview,
): string[] {
  return [
    ...deterministic.blockers,
    ...deterministic.warnings,
    ...aiReview.warnings,
    ...aiReview.suggestedFixes,
  ].filter((reason, index, all) => reason.trim().length > 0 && all.indexOf(reason) === index);
}

function restoreProtectedGuideFields(original: Guide, improved: Guide): Guide {
  const restored: Guide = {
    ...improved,
    slug: original.slug,
    guideType: original.guideType,
    type: original.type,
    category: original.category,
    persona: original.persona,
    useCase: original.useCase,
    budgetAngle: original.budgetAngle,
    skillLevel: original.skillLevel,
    primaryKeyword: original.primaryKeyword,
    secondaryKeywords: original.secondaryKeywords,
    longTailKeywords: original.longTailKeywords,
    audience: original.audience,
    searchIntent: original.searchIntent,
    userPain: original.userPain,
    decisionQuestion: original.decisionQuestion,
    contentGap: original.contentGap,
    uniqueAngle: original.uniqueAngle,
    aiOverviewAnswer: original.aiOverviewAnswer,
    recommendedToolSlugs: original.recommendedToolSlugs,
    pricingNote: PRICING_NOTICE,
    pricingCaveat: PRICING_NOTICE,
    affiliateDisclosureNote: original.affiliateDisclosureNote,
    affiliateDisclosure: original.affiliateDisclosure,
    ctaToFinder: original.ctaToFinder,
    finderCTA: original.finderCTA,
    freshness: original.freshness,
    qualityScore: original.qualityScore,
    status: "draft" as const,
    createdAt: original.createdAt,
    updatedAt: original.updatedAt,
  };

  return normalizeGuideForLayout(restored);
}

function lowerFirst(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();

  if (!text) {
    return text;
  }

  return `${text[0].toLowerCase()}${text.slice(1)}`;
}

function ensureHowToTitle(guide: Guide): string {
  if (/^how to\b/i.test(guide.title)) {
    return guide.title;
  }

  const bestMatch = guide.title.match(/^best ai tools for\s+(.+)$/i);
  const base = bestMatch?.[1] ?? guide.searchIntent;
  const cleaned = base
    .replace(/^turning\b/i, "Turn")
    .replace(/^summarizing\b/i, "Summarize")
    .replace(/^summarising\b/i, "Summarize")
    .replace(/^making\b/i, "Make")
    .replace(/^organizing\b/i, "Organize")
    .replace(/^organising\b/i, "Organize")
    .replace(/^translating\b/i, "Translate")
    .replace(/^cleaning\b/i, "Clean")
    .replace(/^building\b/i, "Build")
    .replace(/^writing\b/i, "Write")
    .replace(/^finding\b/i, "Find")
    .replace(/^creating\b/i, "Create")
    .replace(/^drafting\b/i, "Draft")
    .replace(/^polishing\b/i, "Polish")
    .replace(/^repurposing\b/i, "Repurpose")
    .replace(/^converting\b/i, "Convert")
    .replace(/\s+with ai$/i, "")
    .trim();

  return `How to ${lowerFirst(cleaned)} with AI`;
}

function normalizeGuideForLayout(guide: Guide): Guide {
  const guideType = resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });

  if (guideType !== "how-to") {
    return guide;
  }

  const title = ensureHowToTitle(guide);

  return {
    ...guide,
    title,
    metaTitle: `${title} | Comparavy`,
    quickVerdict: guide.quickAnswer ?? guide.quickVerdict,
  };
}

async function improveGuideWithAI(
  topic: GuideTopic,
  guide: Guide,
  deterministic: GuideQualityResult,
  aiReview: AiGuideReview,
  attempt: number,
): Promise<Guide> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return guide;
  }

  const warnings = rejectionReasonsForImprovement(deterministic, aiReview);
  const failureCategories = classifyFailureCategories(warnings, guide);
  const guideType = candidateGuideType(guide);
  const selectedTools = scoreToolsForTopic(topic).filter(({ tool }) =>
    guide.recommendedToolSlugs.includes(tool.slug),
  );
  const editorialBrief = createEditorialBrief(topic, guideType, selectedTools);
  const articleOutline = createArticleOutline(editorialBrief, guide.title);
  let lastFailure = "OpenAI improvement request failed before a model response was returned.";

  for (const model of preferredGuideModels()) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "You are deeply rebuilding a failed Comparavy guide candidate after deterministic quality checks and strict AI editorial review. Return a complete guide JSON object only. This is a deep rewrite from the editorial brief and outline, not a field patch. Preserve only useful factual material from the failed draft. You may change the title, angle, intro, workflow, tool guidance, FAQ, decision path, and final verdict while keeping the supplied slug and valid selected tool slugs. If guideType is how-to, the title must start with \"How to\", tools must support the workflow instead of dominating it, and you must rebuild Quick Answer, What you need, step-by-step workflow, computer guidance, phone guidance, Tools you can use, Example result, Common mistakes, FAQ, and Next step. If guideType is tool-decision, justify the ranking with criteria, comparison evidence, unique tool cards, and a branching decision path. Fix the failure categories and warnings supplied. Do not invent prices, fake testing, guaranteed income, performance claims, legal advice, or unsupported current-news claims. pricingNote and pricingCaveat must remain exactly: Pricing can change. Check the official site before subscribing.",
        input: JSON.stringify({
          attempt,
          warnings,
          failureCategories,
          specificFixes: specificRewriteFixes(failureCategories),
          editorialBrief,
          articleOutline,
          guide,
          strategy: [
            "Search intent first.",
            "User problem first.",
            "Tool recommendation second.",
            "Mobile readability is mandatory.",
            "Desktop comparison depth should be useful but not overwhelming.",
            "Every guide should include useful next steps.",
            "How-to guides are practical workflows, not tool rankings.",
            "Tool-decision guides need ranking criteria and branching choice logic.",
          ],
        }),
        text: {
          format: {
            type: "json_schema",
            name: "comparavy_improved_guide",
            strict: true,
            schema: GUIDE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      lastFailure = `OpenAI improvement request failed with status ${response.status} using ${model}.`;
      continue;
    }

    const result = (await response.json()) as ResponsesResult;
    const text = readOutputText(result);

    if (!text) {
      throw new Error("OpenAI improvement returned no structured guide text.");
    }

    const improved = restoreProtectedGuideFields(guide, JSON.parse(text) as Guide);
    assertGuideContentQuality(improved, guide.slug);
    return improved;
  }

  throw new Error(lastFailure);
}

function toolSetKey(guide: Pick<Guide, "recommendedToolSlugs">): string {
  return [...guide.recommendedToolSlugs].sort().join("|");
}

function hasDuplicateToolSet(
  guide: Guide,
  comparisonGuides: readonly Guide[],
): boolean {
  const candidateKey = toolSetKey(guide);

  return comparisonGuides.some((existing) =>
    existing.slug !== guide.slug && toolSetKey(existing) === candidateKey,
  );
}

function buildTopicQueue(
  type: GuideLayoutType | "mixed",
  existingSlugs: ReadonlySet<string>,
): TopicQueueEntry[] {
  if (type !== "mixed") {
    return selectGuideTopics({
      count: MAX_CANDIDATES_PER_RUN,
      type,
      existingSlugs,
    }).map((topic) => ({ topic }));
  }

  const howToTopics = selectGuideTopics({
    count: MAX_CANDIDATES_PER_RUN,
    type: "how-to",
    existingSlugs,
  });
  const toolDecisionTopics = selectGuideTopics({
    count: MAX_CANDIDATES_PER_RUN,
    type: "tool-decision",
    existingSlugs,
  });
  const mixedTopics = selectGuideTopics({
    count: MAX_CANDIDATES_PER_RUN,
    type: "mixed",
    existingSlugs,
  });
  const practicalFallback = guideTopics
    .filter((topic) =>
      topic.status === "active" &&
      topic.type === "practical" &&
      !existingSlugs.has(topic.slug) &&
      topic.slug !== howToTopics[0]?.slug,
    )
    .sort((left, right) => right.priority - left.priority || left.slug.localeCompare(right.slug));
  const toolDecisionTarget = toolDecisionTopics[0] ?? practicalFallback[0];
  const queue: TopicQueueEntry[] = [];
  const seen = new Set<string>();

  function add(topic: GuideTopic | undefined, guideTypeOverride?: GuideLayoutType): void {
    if (topic && !seen.has(topic.slug)) {
      seen.add(topic.slug);
      queue.push({ topic, guideTypeOverride });
    }
  }

  add(howToTopics[0], "how-to");
  add(toolDecisionTarget, "tool-decision");

  for (const topic of toolDecisionTopics.slice(1)) {
    add(topic, "tool-decision");
  }

  for (const topic of practicalFallback.slice(1)) {
    add(topic, "tool-decision");
  }

  for (const topic of howToTopics.slice(1)) {
    add(topic, "how-to");
  }

  for (const topic of mixedTopics) {
    add(topic);
  }

  return queue.slice(0, MAX_CANDIDATES_PER_RUN);
}

function resolveTopicEntryGuideType(entry: TopicQueueEntry): GuideLayoutType {
  if (entry.guideTypeOverride) {
    return entry.guideTypeOverride;
  }

  return resolveGuideLayoutType({
    slug: entry.topic.slug,
    title: entry.topic.title,
    type: entry.topic.type,
    guideType: entry.topic.guideType,
    searchIntent: entry.topic.searchIntent,
    decisionQuestion: entry.topic.decisionQuestion,
    uniqueAngle: entry.topic.uniqueAngle,
    notes: entry.topic.notes,
  });
}

function targetGuideTypeCounts(type: GuideLayoutType | "mixed", count: number): Map<GuideLayoutType, number> {
  const targets = new Map<GuideLayoutType, number>();

  if (count <= 0) {
    return targets;
  }

  if (type === "mixed") {
    targets.set("how-to", 1);

    if (count > 1) {
      targets.set("tool-decision", 1);
    }

    return targets;
  }

  targets.set(type, count);
  return targets;
}

function targetSlots(type: GuideLayoutType | "mixed", count: number): { guideType: GuideLayoutType; count: number }[] {
  if (count <= 0) {
    return [];
  }

  if (type === "mixed") {
    const slots: { guideType: GuideLayoutType; count: number }[] = [{ guideType: "how-to", count: 1 }];

    if (count > 1) {
      slots.push({ guideType: "tool-decision", count: 1 });
    }

    return slots.slice(0, count);
  }

  return [{ guideType: type, count }];
}

function selectTopicsForSlot(
  guideType: GuideLayoutType,
  existingSlugs: ReadonlySet<string>,
  skippedSlugs: ReadonlySet<string>,
): TopicQueueEntry[] {
  const selected = selectGuideTopics({
    count: MAX_CANDIDATES_PER_SLOT,
    type: guideType,
    existingSlugs,
  });
  const entries = selected
    .filter((topic) => !skippedSlugs.has(topic.slug))
    .map((topic) => ({ topic, guideTypeOverride: guideType }));

  if (guideType !== "tool-decision") {
    return entries;
  }

  const practicalFallback = guideTopics
    .filter((topic) =>
      topic.status === "active" &&
      topic.type !== "how-to" &&
      topic.type !== "income" &&
      !existingSlugs.has(topic.slug) &&
      !skippedSlugs.has(topic.slug) &&
      !entries.some((entry) => entry.topic.slug === topic.slug),
    )
    .sort((left, right) => right.priority - left.priority || left.slug.localeCompare(right.slug))
    .slice(0, MAX_CANDIDATES_PER_SLOT - entries.length)
    .map((topic) => ({ topic, guideTypeOverride: guideType }));

  return [...entries, ...practicalFallback].slice(0, MAX_CANDIDATES_PER_SLOT);
}

function candidateGuideType(guide: Guide): GuideLayoutType {
  return resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });
}

function acceptedCountForType(candidates: readonly Candidate[], guideType: GuideLayoutType): number {
  return candidates.filter((candidate) => candidateGuideType(candidate.guide) === guideType).length;
}

async function reviewAndImproveCandidate({
  topic,
  guide,
  comparisonGuides,
  publishedGuides,
  threshold,
  slot,
}: {
  readonly topic: GuideTopic;
  readonly guide: Guide;
  readonly comparisonGuides: readonly Guide[];
  readonly publishedGuides: readonly Guide[];
  readonly threshold: number;
  readonly slot: GuideLayoutType;
}): Promise<Candidate> {
  let currentGuide = guide;
  let deterministic = runDeterministicQualityCheck(currentGuide, comparisonGuides);
  let aiReview = deterministic.passed
    ? await reviewGuideWithAI(currentGuide)
    : unavailableAiReview("AI editorial review was deferred until local guardrails pass.");
  let rejectionReasons = requiredPublishingReasons(
    currentGuide,
    deterministic,
    aiReview,
    threshold,
  );
  let improveAttempts = 0;

  while (
    rejectionReasons.length > 0 &&
    Boolean(process.env.OPENAI_API_KEY) &&
    improveAttempts < MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE
  ) {
    improveAttempts += 1;
    console.log(`[${topic.slug}] Improvement attempt ${improveAttempts}/${MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE}`);

    try {
      currentGuide = await improveGuideWithAI(
        topic,
        currentGuide,
        deterministic,
        aiReview,
        improveAttempts,
      );
    } catch (error) {
      console.warn(`[${topic.slug}] Improvement failed: ${String(error)}`);
      break;
    }

    deterministic = runDeterministicQualityCheck(currentGuide, comparisonGuides);
    aiReview = deterministic.passed
      ? await reviewGuideWithAI(currentGuide)
      : unavailableAiReview("AI editorial review was deferred until local guardrails pass.");
    rejectionReasons = requiredPublishingReasons(
      currentGuide,
      deterministic,
      aiReview,
      threshold,
    );
  }

  return {
    guide: currentGuide,
    topicSlug: topic.slug,
    generated: true,
    topicPriority: topicPriority(currentGuide),
    uniquenessScore: uniquenessScore(currentGuide, publishedGuides),
    deterministic,
    aiReview,
    improveAttempts,
    eligible: rejectionReasons.length === 0,
    rejectionReasons,
    finalStatus: rejectionReasons.length === 0 ? "draft" : "rejected",
    slot,
    failureCategories: classifyFailureCategories(
      rejectionReasonsForImprovement(deterministic, aiReview),
      currentGuide,
    ),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  logGuideTopicToolSlugWarnings();
  const publishCount = Math.min(options.count, dailyPublishLimit());
  const targetAcceptedCount = publishCount;
  const existingGuides = await getExistingGuides();
  const existingSlugs = new Set(existingGuides.map((guide) => guide.slug));
  const recentPublishedToolSlugs = new Set<string>();

  for (const guide of existingGuides
    .filter((entry) => entry.status === "published")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4)) {
    for (const slug of guide.recommendedToolSlugs) {
      recentPublishedToolSlugs.add(slug);
    }
  }

  const usedToolSlugs = new Set<string>();
  const acceptedCandidates: Candidate[] = [];
  const checkedCandidates: Candidate[] = [];
  const generatedCandidates: Guide[] = [];
  const skippedTopics: SkippedTopic[] = [];
  const rejectedTopics = new Set<string>();
  const rejectedCandidateReasons: { readonly slug: string; readonly reason: string }[] = [];
  let candidatesImproved = 0;
  let howToGuidesAttempted = 0;
  let toolDecisionGuidesAttempted = 0;
  const qualityThreshold = effectiveQualityThreshold(options.minQuality);
  const slotTargets = targetSlots(options.type, targetAcceptedCount);
  const slotReports: SlotReport[] = slotTargets.map((slot) => ({
    guideType: slot.guideType,
    target: slot.count,
    attempts: 0,
    status: "pending",
    rejectionReasons: [],
  }));

  const publishedGuides = existingGuides.filter((guide) => guide.status === "published");
  const reviewerUnavailable = !process.env.OPENAI_API_KEY;

  if (options.count > publishCount) {
    console.log(
      `Requested ${options.count} publication(s); MAX_DAILY_PUBLISH limits this run to ${publishCount}.`,
    );
  }

  if (qualityThreshold > options.minQuality) {
    console.log(`Requested minimum quality ${options.minQuality}; using strict minimum ${qualityThreshold}.`);
  }

  if (reviewerUnavailable) {
    console.log("AI reviewer unavailable; automatic publishing is blocked because AI editorial review >= 85 is required.");
  }

  if (slotTargets.length === 0) {
    console.log(
      "No eligible unused topics are available after skipping existing guide files.",
    );
  }

  for (const slot of slotTargets) {
    const report = slotReports.find((entry) => entry.guideType === slot.guideType);
    const skippedSlugs = new Set<string>([...rejectedTopics]);
    const slotTopics = selectTopicsForSlot(slot.guideType, existingSlugs, skippedSlugs);

    console.log(`[slot:${slot.guideType}] Target ${slot.count}; trying up to ${MAX_CANDIDATES_PER_SLOT} candidate topic(s).`);

    if (slotTopics.length === 0) {
      if (report) {
        report.status = "failed";
        report.rejectionReasons.push("No eligible unused topics for this slot.");
      }
      continue;
    }

    for (const entry of slotTopics) {
      const { topic, guideTypeOverride } = entry;

      if (acceptedCountForType(acceptedCandidates, slot.guideType) >= slot.count) {
        break;
      }

      if (checkedCandidates.length >= MAX_CANDIDATES_PER_RUN) {
        console.log(`Reached maxCandidatesPerRun limit of ${MAX_CANDIDATES_PER_RUN}.`);
        break;
      }

      if (existingSlugs.has(topic.slug) || rejectedTopics.has(topic.slug)) {
        skippedTopics.push({
          slug: topic.slug,
          reason: existingSlugs.has(topic.slug)
            ? "A guide file with this slug already exists."
            : "Topic already failed in this run.",
        });
        continue;
      }

      if (report) {
        report.attempts += 1;
      }

      const avoidToolSlugs = new Set<string>([...usedToolSlugs, ...recentPublishedToolSlugs]);
      const { guide, skipped } = createDraftCandidate(
        topic,
        usedToolSlugs,
        avoidToolSlugs,
        guideTypeOverride,
      );

      if (!guide) {
        if (skipped) {
          skippedTopics.push(skipped);
          report?.rejectionReasons.push(skipped.reason);
        }
        continue;
      }

      const generatedGuideType = candidateGuideType(guide);

      if (generatedGuideType === "how-to") {
        howToGuidesAttempted += 1;
      }

      if (generatedGuideType === "tool-decision") {
        toolDecisionGuidesAttempted += 1;
      }

      const comparisonSet = [
        ...existingGuides,
        ...generatedCandidates,
        ...acceptedCandidates.map((candidate) => candidate.guide),
      ];

      if (hasDuplicateToolSet(guide, comparisonSet)) {
        const reason = "Recommended tool set exactly matches an existing or earlier candidate guide.";
        rejectedTopics.add(topic.slug);
        skippedTopics.push({ slug: topic.slug, reason });
        rejectedCandidateReasons.push({ slug: topic.slug, reason });
        report?.rejectionReasons.push(reason);
        continue;
      }

      const candidate = await reviewAndImproveCandidate({
        topic,
        guide,
        comparisonGuides: comparisonSet,
        publishedGuides,
        threshold: qualityThreshold,
        slot: slot.guideType,
      });
      candidatesImproved += candidate.improveAttempts > 0 ? 1 : 0;

      const finalStatus: CandidateFinalStatus = !candidate.eligible
        ? "rejected"
        : options.dryRun
          ? "would publish"
          : options.publish
            ? "published"
            : "draft";
      const finalizedCandidate = { ...candidate, finalStatus };

      checkedCandidates.push(finalizedCandidate);
      generatedCandidates.push(finalizedCandidate.guide);
      logCandidate(finalizedCandidate);

      if (finalizedCandidate.eligible) {
        acceptedCandidates.push(finalizedCandidate);
        for (const slug of finalizedCandidate.guide.recommendedToolSlugs) {
          usedToolSlugs.add(slug);
        }
        if (report) {
          report.status = "filled";
          report.acceptedTitle = finalizedCandidate.guide.title;
        }
        break;
      }

      rejectedTopics.add(topic.slug);
      const reason =
        finalizedCandidate.rejectionReasons[0] ??
        finalizedCandidate.aiReview.warnings[0] ??
        "Candidate did not pass all publish gates.";
      rejectedCandidateReasons.push({ slug: topic.slug, reason });
      report?.rejectionReasons.push(reason);
    }

    if (report && report.status !== "filled") {
      report.status = "failed";
    }
  }

  if (!options.dryRun) {
    await mkdir(GUIDES_DIRECTORY, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);

    for (const candidate of checkedCandidates) {
      const guide = options.publish && candidate.eligible
        ? { ...candidate.guide, status: "published" as const, updatedAt: today }
        : { ...candidate.guide, status: "draft" as const };

      const filePath = path.join(GUIDES_DIRECTORY, `${guide.slug}.json`);
      await writeFile(filePath, `${JSON.stringify(guide, null, 2)}\n`, "utf8");
    }
  }

  for (const candidate of acceptedCandidates) {
    console.log(
      `[${candidate.guide.slug}] ${options.dryRun ? "Would publish (dry run)." : "Published."}`,
    );
  }

  if (skippedTopics.length > 0) {
    console.log("Skipped topics");
    for (const skipped of skippedTopics) {
      console.log(`[${skipped.slug}] ${skipped.reason}`);
    }
  }

  const rejectedCount = checkedCandidates.filter((candidate) => !candidate.eligible).length;
  const publishedCount = options.dryRun ? 0 : acceptedCandidates.length;
  const draftCount = checkedCandidates.length - publishedCount;

  console.log("Auto publish summary");
  console.log(`Target count: ${targetAcceptedCount}`);
  const howToSlot = slotReports.find((slot) => slot.guideType === "how-to");
  const toolDecisionSlot = slotReports.find((slot) => slot.guideType === "tool-decision");
  console.log(`How-to slot status: ${howToSlot ? `${howToSlot.status} (${howToSlot.attempts} attempt${howToSlot.attempts === 1 ? "" : "s"})` : "not targeted"}`);
  console.log(`Tool-decision slot status: ${toolDecisionSlot ? `${toolDecisionSlot.status} (${toolDecisionSlot.attempts} attempt${toolDecisionSlot.attempts === 1 ? "" : "s"})` : "not targeted"}`);
  console.log(`Candidates created: ${generatedCandidates.length}`);
  console.log(`Candidates improved: ${candidatesImproved}`);
  console.log(`True how-to guides attempted: ${howToGuidesAttempted}`);
  console.log(`Tool-decision guides attempted: ${toolDecisionGuidesAttempted}`);
  console.log(`Candidates rewritten after AI review: ${candidatesImproved}`);
  console.log(`Candidates checked: ${checkedCandidates.length}`);
  console.log(`Published: ${publishedCount}`);
  console.log(`Publish mode: ${options.publish ? "publish" : "draft-only"}`);

  if (options.dryRun) {
    console.log(`Would publish: ${acceptedCandidates.length}`);
    console.log("Dry run: no guide files modified.");
  }

  console.log(`Draft: ${draftCount}`);
  console.log(`Rejected: ${rejectedCount}`);
  console.log(`Skipped topics: ${skippedTopics.length}`);
  console.log("Slot details:");
  for (const slot of slotReports) {
    console.log(`[slot:${slot.guideType}] status=${slot.status}; attempts=${slot.attempts}; accepted=${slot.acceptedTitle ?? "none"}`);
    for (const reason of slot.rejectionReasons.slice(0, 3)) {
      console.log(`[slot:${slot.guideType}] rejection=${reason}`);
    }
  }
  const topRejectionReasons = new Map<string, number>();
  for (const candidate of checkedCandidates.filter((entry) => !entry.eligible)) {
    const reasons = [
      ...candidate.failureCategories,
      ...candidate.aiReview.warnings,
      ...candidate.rejectionReasons,
    ];
    for (const reason of reasons.slice(0, 3)) {
      topRejectionReasons.set(reason, (topRejectionReasons.get(reason) ?? 0) + 1);
    }
  }
  console.log("Top rejection reasons:");
  if (topRejectionReasons.size === 0) {
    console.log("None");
  } else {
    for (const [reason, count] of [...topRejectionReasons.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8)) {
      console.log(`${reason}: ${count}`);
    }
  }
  console.log("Rejected candidate reasons:");
  if (rejectedCandidateReasons.length === 0) {
    console.log("None");
  } else {
    for (const rejected of rejectedCandidateReasons) {
      console.log(`[${rejected.slug}] ${rejected.reason}`);
    }
  }
  console.log("Final published titles:");
  if (!options.publish || options.dryRun || acceptedCandidates.length === 0) {
    console.log("None");
  } else {
    for (const candidate of acceptedCandidates) {
      console.log(candidate.guide.title);
    }
  }
  console.log("Final accepted titles:");
  if (acceptedCandidates.length === 0) {
    console.log("None");
  } else {
    for (const candidate of acceptedCandidates) {
      console.log(candidate.guide.title);
    }
  }
  console.log("Rejected titles and top reasons:");
  const rejectedCandidates = checkedCandidates.filter((candidate) => !candidate.eligible);
  if (rejectedCandidates.length === 0) {
    console.log("None");
  } else {
    for (const candidate of rejectedCandidates) {
      const topReason =
        candidate.aiReview.warnings[0] ??
        candidate.rejectionReasons[0] ??
        "Candidate did not pass all publish gates.";
      console.log(`${candidate.guide.title}: ${topReason}`);
    }
  }
  console.log(
    `Final status: ${acceptedCandidates.length >= targetAcceptedCount ? "target met" : "target not met before limits were reached"}`,
  );

  if (acceptedCandidates.length < targetAcceptedCount) {
    console.log(
      `Published fewer than requested because only ${acceptedCandidates.length} candidate(s) passed all gates after fallback and improvement attempts.`,
    );
  }

  if (options.count > 0 && checkedCandidates.length === 0) {
    console.error("No valid guide candidates could be generated.");
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
