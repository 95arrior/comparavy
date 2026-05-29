import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { guideTopics, type GuideTopic } from "@/data/guideTopics";
import { guideGoldBriefs, type GuideGoldBrief } from "@/data/guideGoldBriefs";
import {
  PRICING_NOTICE,
  assertGuideContentQuality,
  checkGuideQuality,
  validateGuideContent,
  type ContentQualityIssue,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import {
  getOpenAIReviewDiagnostics,
  probeOpenAIEditorialReview,
  reviewGuideWithAI,
  type AiGuideReview,
  type OpenAIReviewDiagnostics,
} from "@/lib/aiGuideReviewer";
import {
  buildEditorialBlueprint,
  type EditorialBlueprint,
  type TopicBucketId,
} from "@/lib/editorialBlueprint";
import {
  bannedGenericPhrases,
  comparavyGoldStandardPrompt,
  decisionPathRules,
  faqQualityRules,
  guideTypeStandardForPrompt,
  minimumDepthRules,
  quickAnswerRules,
  requiredHowToSections,
  requiredIncomeSections,
  requiredToolDecisionSections,
  requiredTrendLedSections,
} from "@/lib/editorialRules";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import { resolveGuideLayoutType, type GuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";
import { getApprovedGuides, getPublishedGuides } from "@/lib/guides";
import { scoreToolsForTopic } from "@/lib/topicScoring";
import {
  GUIDES_DIRECTORY,
  type ArticleOutline,
  createArticleOutline,
  type EditorialBrief,
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
  readonly approve: boolean;
  readonly generateApproved: boolean;
  readonly allowGenericTopics: boolean;
}

interface Candidate {
  readonly guide: Guide;
  readonly topicSlug: string;
  readonly generated: boolean;
  readonly topicPriority: number;
  readonly uniquenessScore: number;
  readonly deterministic: GuideQualityResult;
  readonly aiReview: AiGuideReview;
  readonly mismatchGuardrail: LocalGuardrailResult;
  readonly depthGuardrail: LocalGuardrailResult;
  readonly editorialPreflight: EditorialPreflightResult;
  readonly topicBucket: TopicBucketId;
  readonly improveAttempts: number;
  readonly eligible: boolean;
  readonly rejectionReasons: readonly string[];
  readonly finalStatus: CandidateFinalStatus;
  readonly slot: GuideLayoutType;
  readonly failureCategories: readonly string[];
  readonly improvementFailureReason?: string;
}

type CandidateFinalStatus = "rejected" | "draft" | "approved" | "would publish" | "published";
type GuideRequiredArrayField =
  | "secondaryKeywords"
  | "longTailKeywords"
  | "keyTakeaways"
  | "bestPicksBySituation"
  | "recommendedToolSlugs"
  | "recommendedTools"
  | "comparisonRows"
  | "decisionPath"
  | "whoShouldUseThis"
  | "whoShouldAvoidThis"
  | "moneySavingTips"
  | "faqs";

interface LocalGuardrailResult {
  readonly passed: boolean;
  readonly score: number;
  readonly warnings: string[];
  readonly blockers: string[];
}

interface EditorialPreflightResult extends LocalGuardrailResult {
  readonly failedStandards: string[];
  readonly missingSections: string[];
  readonly bannedPhrasesFound: string[];
  readonly topicMismatchReasons: string[];
  readonly rewriteActions: string[];
}

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

interface OpenAIReviewPolicy {
  readonly mode: "enabled" | "skipped-local" | "unavailable";
  readonly unavailableReason?: string;
}

interface ImprovementRequestInput {
  readonly attempt: number;
  readonly failedGuideType: GuideLayoutType;
  readonly warnings: readonly string[];
  readonly failureCategories: readonly string[];
  readonly specificFixes: readonly string[];
  readonly editorialBrief: unknown;
  readonly articleOutline: unknown;
  readonly guideTypeStandard: string;
  readonly localEditorialRules: unknown;
  readonly failedDraft: unknown;
  readonly strategy: readonly string[];
}

interface OpenAIImprovementFailure {
  readonly model: string;
  readonly requestType: string;
  readonly status: number;
  readonly category: string;
  readonly safeMessage: string;
  readonly responseFormatUsed: boolean;
  readonly reasoningEffortUsed: boolean;
  readonly payloadTruncated: boolean;
}

const DEFAULT_COUNT = 2;
const DEFAULT_MIN_QUALITY = 85;
const DEFAULT_MAX_DAILY_PUBLISH = 2;
const PUBLISH_THRESHOLD = 85;
const MAX_CANDIDATES_PER_RUN = 12;
const MAX_CANDIDATES_PER_SLOT = 6;
const MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE = 2;
const LOW_AI_SCORE_RETRY_CUTOFF = 60;
const AVOID_BY_DEFAULT_GOLD_BRIEF_SLUGS = new Set([
  "how-to-summarize-a-pdf-into-study-notes-with-ai",
  "best-ai-tools-for-summarizing-pdfs-into-study-notes",
]);
const PREFERRED_GOLD_BRIEF_ORDER = new Map<string, number>([
  ["how-to-turn-meeting-notes-into-a-client-recap-with-ai", 0],
  ["how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai", 1],
  ["how-to-write-etsy-product-descriptions-with-ai", 2],
  ["how-to-write-real-estate-listing-descriptions-with-ai", 3],
  ["how-to-clean-podcast-audio-and-make-short-clips-with-ai", 4],
  ["best-ai-tools-for-turning-meeting-notes-into-client-recaps", 5],
  ["best-ai-tools-for-instagram-carousel-posts-from-blog-content", 6],
  ["best-ai-tools-for-etsy-product-descriptions", 7],
  ["best-ai-tools-for-real-estate-listing-descriptions", 8],
  ["best-ai-tools-for-podcast-clips-and-video-podcast-repurposing", 9],
]);
const DEVICE_SECTION_PLACEHOLDER_PATTERN =
  /\b(placeholder|lorem ipsum|tbd|todo|coming soon|best on mobile|best on desktop|quick checks|wider workspace|on the go)\b/i;
const UNSUPPORTED_TESTING_CLAIM_PATTERN =
  /\b(?:we tested|i tested|tested by us|hands-on tested|after testing|our testing)\b/gi;
const PLACEHOLDER_REPAIR_PATTERNS = [
  { label: "first draft", pattern: /\bfirst draft\b/gi, replacement: "reviewable version" },
  { label: "selected for this guide", pattern: /\bselected for this guide\b/gi, replacement: "matched to this workflow" },
  { label: "core workflow", pattern: /\bcore workflow\b/gi, replacement: "main workflow" },
  { label: "useful for this use case", pattern: /\buseful for this use case\b/gi, replacement: "useful for this task" },
  { label: "Use mobile for on mobile", pattern: /\bUse mobile for on mobile\b/g, replacement: "Use mobile for quick review" },
  { label: "Learn how to turning", pattern: /\bLearn how to turning\b/gi, replacement: "Learn how to turn" },
] as const;

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
  let approve = false;
  let generateApproved = false;
  let allowGenericTopics = false;

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

    if (argument === "--approve") {
      approve = true;
      generateApproved = true;
      continue;
    }

    if (argument === "--generate-approved") {
      generateApproved = true;
      continue;
    }

    if (argument === "--allow-generic-topics") {
      allowGenericTopics = true;
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

  return {
    count,
    type,
    minQuality,
    dryRun,
    publish,
    approve,
    generateApproved,
    allowGenericTopics,
  };
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

const FORBIDDEN_EDITORIAL_PHRASES = bannedGenericPhrases;

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

function normalizeTitleForCollision(value: string): string {
  return normalizeForGuardrail(value)
    .split(" ")
    .filter((term) =>
      term.length > 1 &&
      ![
        "a",
        "an",
        "and",
        "ai",
        "best",
        "for",
        "from",
        "how",
        "into",
        "the",
        "to",
        "tools",
        "using",
        "with",
      ].includes(term),
    )
    .map((term) =>
      term
        .replace(/ies$/, "y")
        .replace(/s$/, ""),
    )
    .join(" ");
}

function titlesCollide(left: string, right: string): boolean {
  const normalizedLeft = normalizeTitleForCollision(left);
  const normalizedRight = normalizeTitleForCollision(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const leftTerms = new Set(normalizedLeft.split(" ").filter(Boolean));
  const rightTerms = new Set(normalizedRight.split(" ").filter(Boolean));
  const shared = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const denominator = Math.max(leftTerms.size, rightTerms.size, 1);

  return shared / denominator >= 0.8;
}

function guideTitleCollision(brief: GuideGoldBrief, existingGuides: readonly Guide[]): Guide | undefined {
  return existingGuides.find((guide) =>
    titlesCollide(brief.title, guide.title) &&
    (guide.slug !== brief.slug || guide.status === "published" || guide.status === "approved"),
  );
}

function sanitizeTextForReview(value: string): { readonly value: string; readonly actions: readonly string[] } {
  let repaired = value;
  const actions: string[] = [];

  UNSUPPORTED_TESTING_CLAIM_PATTERN.lastIndex = 0;
  if (UNSUPPORTED_TESTING_CLAIM_PATTERN.test(repaired)) {
    repaired = repaired.replace(UNSUPPORTED_TESTING_CLAIM_PATTERN, "").replace(/\s+/g, " ");
    actions.push("Removed unsupported testing claim.");
  }

  for (const repair of PLACEHOLDER_REPAIR_PATTERNS) {
    repair.pattern.lastIndex = 0;
    if (repair.pattern.test(repaired)) {
      repaired = repaired.replace(repair.pattern, repair.replacement).replace(/\s+/g, " ");
      actions.push(`Repaired placeholder phrase: ${repair.label}.`);
    }
  }

  return {
    value: repaired.trim(),
    actions,
  };
}

function sanitizeValueForReview(value: unknown, actions: string[]): unknown {
  if (typeof value === "string") {
    const sanitized = sanitizeTextForReview(value);
    actions.push(...sanitized.actions);
    return sanitized.value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValueForReview(entry, actions))
      .filter((entry) => !(typeof entry === "string" && entry.trim().length === 0));
  }

  if (isPlainRecord(value)) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (key === "testingClaims") {
        const before = JSON.stringify(entry);
        const repaired = sanitizeValueForReview(entry, actions);
        const entries = Array.isArray(repaired) ? repaired.filter((item) => hasTextValue(item)) : repaired;

        if (before !== JSON.stringify(entries)) {
          actions.push("Removed unsupported testing claim.");
        }

        sanitized[key] = entries;
        continue;
      }

      sanitized[key] = sanitizeValueForReview(entry, actions);
    }

    return sanitized;
  }

  return value;
}

function sanitizeGuideBeforeReview(guide: Guide): Guide {
  const actions: string[] = [];
  const sanitized = sanitizeValueForReview(guide, actions) as Guide;
  const uniqueActions = actions.filter((action, index, all) => all.indexOf(action) === index);

  for (const action of uniqueActions) {
    console.log(`[${guide.slug}] ${action}`);
  }

  return sanitized;
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

interface DeviceSectionAssessment {
  readonly blocked: boolean;
  readonly warning: string | undefined;
  readonly blocker: string | undefined;
}

function assessDeviceSection(
  value: string | undefined,
  blueprint: EditorialBlueprint,
  side: "mobile" | "desktop",
): DeviceSectionAssessment {
  const text = value?.trim() ?? "";

  if (text.length === 0) {
    return {
      blocked: true,
      warning: undefined,
      blocker: `Local editorial preflight: ${side} section is missing.`,
    };
  }

  if (text.length < 40) {
    return {
      blocked: true,
      warning: undefined,
      blocker: `Local editorial preflight: ${side} section is too short to be useful.`,
    };
  }

  const hasTopicSpecificDetail = containsBlueprintInputOrOutput(text, blueprint);
  const looksLikePlaceholder = DEVICE_SECTION_PLACEHOLDER_PATTERN.test(text) && !hasTopicSpecificDetail;

  if (looksLikePlaceholder) {
    return {
      blocked: true,
      warning: undefined,
      blocker: `Local editorial preflight: ${side} section is literal placeholder or generic device copy.`,
    };
  }

  if (!hasTopicSpecificDetail || text.length < 80) {
    return {
      blocked: false,
      warning: `Local editorial preflight: ${side} section could be more specific.`,
      blocker: undefined,
    };
  }

  return {
    blocked: false,
    warning: undefined,
    blocker: undefined,
  };
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
    const mobileUseCase = guide.mobileUseCase?.trim() ?? "";
    const desktopUseCase = guide.desktopUseCase?.trim() ?? "";

    if (!mobileUseCase || !desktopUseCase) {
      addBlocker(
        "Local editorial guardrail: deviceIntent=both requires mobile and desktop usefulness.",
        10,
      );
    } else if (
      mobileUseCase.length < 80 ||
      desktopUseCase.length < 80 ||
      DEVICE_SECTION_PLACEHOLDER_PATTERN.test(mobileUseCase) ||
      DEVICE_SECTION_PLACEHOLDER_PATTERN.test(desktopUseCase)
    ) {
      addWarning(
        "Local editorial guardrail: mobile or desktop guidance could be more specific.",
        2,
      );
    }
  }

  if (!guide.ctaToFinder.includes("/finder") || !guide.finderCTA.includes("/finder")) {
    addBlocker("Local editorial guardrail: no clear /finder next step.", 10);
  }

  if (guideType === "tool-decision") {
    const decisionBranches = guide.decisionPath.filter((step) => /\b(if|when|choose|start|switch|avoid)\b/i.test(step.situation)).length;

    if (decisionBranches < 4) {
      addWarning("Local editorial guardrail: weak decision path; add branching If/Then choices.", 3);
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

function fullGuideText(guide: Guide): string {
  return JSON.stringify(guide).toLowerCase();
}

function countTermHits(text: string, terms: readonly string[]): number {
  return terms.filter((term) => {
    const normalized = term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return normalized.length > 0 && text.includes(normalized);
  }).length;
}

function topicMismatchGuardrail(guide: Guide, blueprint: EditorialBlueprint): LocalGuardrailResult {
  let score = 100;
  const warnings: string[] = [];
  const blockers: string[] = [];
  const text = fullGuideText(guide);
  const matchedBannedTerms = blueprint.bannedMismatchedTerms.filter((term) =>
    text.includes(term.toLowerCase()),
  );
  const topicTermHits = countTermHits(text, blueprint.topicSpecificTerms);

  if (matchedBannedTerms.length > 0) {
    blockers.push(`Topic mismatch guardrail: unrelated terms found: ${matchedBannedTerms.join(", ")}.`);
    score -= Math.min(40, matchedBannedTerms.length * 12);
  }

  if (topicTermHits < Math.min(4, blueprint.topicSpecificTerms.length)) {
    blockers.push(`Topic mismatch guardrail: guide does not use enough ${blueprint.topicBucket} language.`);
    score -= 18;
  }

  if (blueprint.topicBucket === "image-editing-brand-control" && /\b(citation|citations|blog post hooks|transcript|content repurposing)\b/i.test(text)) {
    blockers.push("Topic mismatch guardrail: image editing guide drifted into writing, citations, transcripts, or repurposing.");
    score -= 20;
  }

  if (blueprint.topicBucket === "automation-agents" && /\b(caption|captions|publishing hooks|blog drafts|image editing|brand control)\b/i.test(text)) {
    blockers.push("Topic mismatch guardrail: automation guide drifted into captions, publishing, writing, or image editing.");
    score -= 20;
  }

  if (blueprint.topicBucket === "video-shorts-clips" && /\b(citation|citations|pdfs?|study notes|source bibliography)\b/i.test(text)) {
    blockers.push("Topic mismatch guardrail: video guide drifted into citations, PDFs, or study notes.");
    score -= 20;
  }

  return {
    passed: blockers.length === 0 && score >= 85,
    score: Math.max(0, score),
    warnings,
    blockers,
  };
}

function containsBlueprintInputAndOutput(text: string, blueprint: EditorialBlueprint): boolean {
  const normalizedText = normalizeForGuardrail(text);
  const hasInput = blueprint.inputMaterial.some((input) => {
    const terms = normalizeForGuardrail(input).split(" ").filter((term) => term.length > 3);
    return terms.some((term) => normalizedText.includes(term));
  });
  const hasOutput = blueprint.desiredOutput.some((output) => {
    const terms = normalizeForGuardrail(output).split(" ").filter((term) => term.length > 3);
    return terms.some((term) => normalizedText.includes(term));
  });

  return hasInput && hasOutput;
}

function containsBlueprintInputOrOutput(text: string, blueprint: EditorialBlueprint): boolean {
  const normalizedText = normalizeForGuardrail(text);
  const topicTerms = [...blueprint.inputMaterial, ...blueprint.desiredOutput].flatMap((value) =>
    normalizeForGuardrail(value).split(" ").filter((term) => term.length > 3),
  );

  return topicTerms.some((term) => normalizedText.includes(term));
}

function minimumDepthGuardrail(guide: Guide, blueprint: EditorialBlueprint): LocalGuardrailResult {
  let score = 100;
  const warnings: string[] = [];
  const blockers: string[] = [];
  const guideType = candidateGuideType(guide);

  function addBlocker(message: string, penalty = 10): void {
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

  if (!containsBlueprintInputAndOutput(guide.quickAnswer ?? guide.quickVerdict, blueprint)) {
    addBlocker("Minimum depth guardrail: quick answer must name a specific input and output.", 12);
  }

  const concreteSteps = (guide.steps ?? []).filter((step) =>
    step.detail.trim().length >= 80 &&
    containsBlueprintInputOrOutput(`${step.title} ${step.detail} ${step.output ?? ""}`, blueprint),
  ).length;

  if (guideType === "how-to" && concreteSteps < 4) {
    addBlocker("Minimum depth guardrail: workflow needs at least four concrete topic-specific steps.", 12);
  }

  if (!guide.exampleResult?.trim()) {
    addBlocker("Minimum depth guardrail: example result is required.", 10);
  }

  if (guideType === "tool-decision" && guide.decisionPath.length < 4) {
    addWarning("Minimum depth guardrail: tool-decision guides could use a stronger decision path.", 4);
  }

  const topicFaqs = guide.faqs.filter((faq) =>
    countTermHits(faq.question.toLowerCase(), blueprint.topicSpecificTerms) > 0 ||
    countTermHits(faq.answer.toLowerCase(), blueprint.topicSpecificTerms) > 0,
  );

  if (topicFaqs.length < Math.min(3, guide.faqs.length)) {
    addWarning("Minimum depth guardrail: FAQ questions could be more topic-specific.", 1);
  }

  const mobileConcrete = containsBlueprintInputOrOutput(guide.mobileUseCase ?? "", blueprint);
  const desktopConcrete = containsBlueprintInputOrOutput(guide.desktopUseCase ?? "", blueprint);

  if (!mobileConcrete && !desktopConcrete) {
    addWarning("Minimum depth guardrail: mobile or desktop workflow could be more concrete.", 1);
  }

  const mappedTools = (guide.toolsYouCanUse ?? []).filter((tool) =>
    Boolean(tool.role?.trim()) &&
    containsBlueprintInputOrOutput(`${tool.why} ${tool.role ?? ""} ${tool.bestUseCase ?? ""}`, blueprint),
  ).length;

  if (mappedTools < Math.min(2, guide.recommendedToolSlugs.length)) {
    addBlocker("Minimum depth guardrail: tools must be mapped to workflow roles, not just listed.", 10);
  }

  if (guideType === "tool-decision") {
    const repeatedBestFor = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.bestFor));
    const repeatedAvoidIf = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.avoidIf));

    if (repeatedBestFor.length > 0 || repeatedAvoidIf.length > 0) {
      addBlocker("Minimum depth guardrail: repeated Best for / Avoid if text across tools.", 10);
    }
  }

  return {
    passed: blockers.length === 0 && score >= 85,
    score: Math.max(0, score),
    warnings,
    blockers,
  };
}

function requiredSectionsForGuideType(guideType: GuideLayoutType): readonly string[] {
  if (guideType === "how-to") return requiredHowToSections;
  if (guideType === "tool-decision") return requiredToolDecisionSections;
  if (guideType === "income") return requiredIncomeSections;
  return requiredTrendLedSections;
}

function hasUsableValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
}

function firstAnswerText(guide: Guide): string {
  return [
    guide.quickAnswer ?? "",
    guide.quickVerdict ?? "",
    guide.quickDecision ?? "",
    guide.aiOverviewAnswer ?? "",
  ].find((value) => value.trim().length > 0) ?? "";
}

function runEditorialPreflight(
  guide: Guide,
  blueprint: EditorialBlueprint,
  deterministic: GuideQualityResult,
  mismatchGuardrail: LocalGuardrailResult,
  depthGuardrail: LocalGuardrailResult,
): EditorialPreflightResult {
  let score = 100;
  const warnings: string[] = [];
  const blockers: string[] = [];
  const failedStandards: string[] = [];
  const missingSections: string[] = [];
  const bannedPhrasesFound: string[] = [];
  const topicMismatchReasons: string[] = [...mismatchGuardrail.blockers];
  const rewriteActions: string[] = [];
  const guideType = candidateGuideType(guide);
  const guideRecord = guide as unknown as Record<string, unknown>;
  const text = fullGuideText(guide);

  function fail(standard: string, message: string, action: string, penalty = 10): void {
    if (!failedStandards.includes(standard)) {
      failedStandards.push(standard);
    }
    if (!blockers.includes(message)) {
      blockers.push(message);
      score -= penalty;
    }
    if (!rewriteActions.includes(action)) {
      rewriteActions.push(action);
    }
  }

  for (const section of requiredSectionsForGuideType(guideType)) {
    if (!hasUsableValue(guideRecord[section])) {
      missingSections.push(section);
      fail("required section", `Local editorial preflight: missing required ${guideType} section "${section}".`, `Rebuild missing ${section}.`, 8);
    }
  }

  for (const phrase of bannedGenericPhrases) {
    if (text.includes(phrase)) {
      bannedPhrasesFound.push(phrase);
      fail("generic filler", `Local editorial preflight: banned phrase found "${phrase}".`, "Remove banned generic filler and replace it with concrete input, output, and review language.", 10);
    }
  }

  const answer = firstAnswerText(guide);
  if (!containsBlueprintInputAndOutput(answer, blueprint)) {
    fail(
      "instant reward first 100 words",
      "Local editorial preflight: first answer does not name a concrete input and output.",
      "Rewrite Quick Answer / Quick Verdict so the first 100 words answer the job, input, output, first action, and review step.",
      14,
    );
  }

  if (/^(ai can help|in today's digital world|with ai, you can)/i.test(answer.trim())) {
    fail(
      "instant reward first 100 words",
      "Local editorial preflight: first answer starts with generic AI background.",
      "Start with the reader's job and first action, not AI background.",
      14,
    );
  }

  if (guideType === "how-to") {
    const concreteSteps = (guide.steps ?? []).filter((step) =>
      step.detail.trim().length >= 80 &&
      Boolean(step.output?.trim()) &&
      containsBlueprintInputOrOutput(`${step.title} ${step.detail} ${step.output ?? ""}`, blueprint),
    ).length;

    if (concreteSteps < minimumDepthRules.howToConcreteStepMinimum) {
      fail(
        "real workflow",
        "Local editorial preflight: how-to guide does not have enough concrete workflow steps.",
        "Deep rewrite the workflow with action, reason, output, and tool role for each step.",
        12,
      );
    }

    if (!guide.exampleResult?.trim()) {
      fail(
        "example result",
        "Local editorial preflight: how-to guide is missing an example result.",
        "Add a concrete example result that shows what the reader should end with.",
        10,
      );
    }
  }

  if (guideType === "tool-decision" && guide.decisionPath.length < minimumDepthRules.toolDecisionBranchMinimum) {
    if (guide.decisionPath.length === 0) {
      fail(
        "decision path",
        "Local editorial preflight: tool-decision guide needs a stronger decision path.",
        "Rewrite decisionPath with branching If/Then choices tied to input, output, device, and review depth.",
        12,
      );
    } else {
      warnings.push("Local editorial preflight: decision path could be stronger.");
      score -= 1;
      if (!rewriteActions.includes("Rewrite decisionPath with branching If/Then choices tied to input, output, device, and review depth.")) {
        rewriteActions.push("Rewrite decisionPath with branching If/Then choices tied to input, output, device, and review depth.");
      }
    }
  }

  const topicFaqs = guide.faqs.filter((faq) =>
    countTermHits(`${faq.question} ${faq.answer}`.toLowerCase(), blueprint.topicSpecificTerms) > 0,
  );

  if (topicFaqs.length < Math.min(minimumDepthRules.minimumTopicSpecificFaqs, guide.faqs.length)) {
    fail(
      "high-intent FAQ",
      "Local editorial preflight: FAQ is not specific enough to the topic.",
      "Rewrite FAQ around source material, output, device, tool choice, and review risks.",
      10,
    );
  }

  const repeatedBestFor = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.bestFor));
  const repeatedAvoidIf = repeatedFieldValues(guide.recommendedTools.map((tool) => tool.avoidIf));

  if (repeatedBestFor.length > 0 || repeatedAvoidIf.length > 0) {
    fail(
      "tool recommendations",
      "Local editorial preflight: repeated Best for / Avoid if text across tools.",
      "Rewrite tool recommendations so every tool has a distinct role, input fit, and avoid condition.",
      12,
    );
  }

  const mobileAssessment = assessDeviceSection(guide.mobileUseCase, blueprint, "mobile");
  const desktopAssessment = assessDeviceSection(guide.desktopUseCase, blueprint, "desktop");

  for (const assessment of [mobileAssessment, desktopAssessment]) {
    if (assessment.blocker) {
      fail(
        "mobile desktop usefulness",
        assessment.blocker,
        "Rewrite mobile and desktop sections with different realistic use cases tied to the input and output.",
        10,
      );
    } else if (assessment.warning) {
      warnings.push(assessment.warning);
      score -= 1;
    }
  }

  for (const blocker of [...deterministic.blockers, ...mismatchGuardrail.blockers, ...depthGuardrail.blockers]) {
    if (blocker.includes("Topic mismatch") && !topicMismatchReasons.includes(blocker)) {
      topicMismatchReasons.push(blocker);
    }
  }

  if (topicMismatchReasons.length > 0) {
    fail(
      "topic match",
      `Local editorial preflight: topic mismatch detected: ${topicMismatchReasons.join(" | ")}`,
      "Correct topic drift and rebuild language around the selected topic bucket.",
      12,
    );
  }

  return {
    passed: blockers.length === 0 && Math.max(0, score) >= 85,
    score: Math.max(0, score),
    warnings,
    blockers,
    failedStandards,
    missingSections,
    bannedPhrasesFound,
    topicMismatchReasons,
    rewriteActions,
  };
}

function unavailableAiReview(reason: string): AiGuideReview {
  return {
    attempted: false,
    available: false,
    passed: false,
    score: 0,
    verdict: reason,
    warnings: [reason],
    suggestedFixes: ["Run AI editorial review and require score >= 85 before publishing."],
    unavailableReason: reason,
  };
}

function requiredPublishingReasons(
  guide: Guide,
  deterministic: GuideQualityResult,
  editorialPreflight: EditorialPreflightResult,
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

  if (!editorialPreflight.passed) {
    reasons.push(`Local editorial preflight failed: ${editorialPreflight.failedStandards.join(", ") || "unknown standard"}.`);
  }

  for (const action of editorialPreflight.rewriteActions) {
    reasons.push(`Rewrite action taken: ${action}`);
  }

  if (!aiReview.attempted) {
    reasons.push(aiReview.unavailableReason ?? "AI editorial review was skipped before review could run.");
  } else if (!aiReview.available) {
    reasons.push(aiReview.unavailableReason ?? "AI editorial review was unavailable.");
  } else if (!aiReview.passed || aiReview.score < PUBLISH_THRESHOLD) {
    reasons.push(
      aiReview.editorialFailureReason ??
        `AI editorial review ran and scored ${aiReview.score}/100, below the publish threshold of ${PUBLISH_THRESHOLD}.`,
    );
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

function isLocalOpenAISkip(reason?: string): boolean {
  return Boolean(
    reason &&
      /openai_api_key is not set locally|skipped locally|local dry-run/i.test(reason),
  );
}

function formatAiReviewStatus(aiReview: AiGuideReview): string {
  if (!aiReview.attempted) {
    if (isLocalOpenAISkip(aiReview.unavailableReason)) {
      return "skipped-local";
    }

    if (aiReview.unavailableReason?.toLowerCase().includes("guardrails")) {
      return "skipped-guardrails";
    }

    return aiReview.unavailableReason ? `unavailable (${aiReview.unavailableReason})` : "unavailable";
  }

  if (!aiReview.available) {
    return aiReview.unavailableReason ? `unavailable (${aiReview.unavailableReason})` : "unavailable";
  }

  return `${aiReview.score}/100 (${aiReview.passed ? "PASS" : "FAIL"})`;
}

function logCandidate(candidate: Candidate): void {
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
  console.log(`  Topic bucket: ${candidate.topicBucket}`);
  console.log(`  Topic slug: ${candidate.topicSlug}`);
  console.log(`  Primary keyword: ${candidate.guide.primaryKeyword}`);
  console.log(`  Selected tools: ${candidate.guide.recommendedToolSlugs.join(", ")}`);
  console.log(`  Quality score: ${candidate.guide.qualityScore}/100`);
  console.log(`  Deterministic check: ${candidate.deterministic.score}/100 (${candidate.deterministic.passed ? "PASS" : "FAIL"})`);
  console.log(`  Mismatch guardrail: ${candidate.mismatchGuardrail.score}/100 (${candidate.mismatchGuardrail.passed ? "PASS" : "FAIL"})`);
  console.log(`  Depth guardrail: ${candidate.depthGuardrail.score}/100 (${candidate.depthGuardrail.passed ? "PASS" : "FAIL"})`);
  console.log(
    `  Editorial preflight: ${candidate.editorialPreflight.score}/100 (${candidate.editorialPreflight.passed ? (candidate.editorialPreflight.warnings.length > 0 ? "PASS with warnings" : "PASS") : "FAIL"})`,
  );
  console.log(`  Failed standard: ${candidate.editorialPreflight.failedStandards.join(", ") || "None"}`);
  console.log(`  Missing section: ${candidate.editorialPreflight.missingSections.join(", ") || "None"}`);
  console.log(`  Banned phrase found: ${candidate.editorialPreflight.bannedPhrasesFound.join(", ") || "None"}`);
  console.log(`  Topic mismatch reason: ${candidate.editorialPreflight.topicMismatchReasons.join(" | ") || "None"}`);
  console.log(`  Rewrite action taken: ${candidate.editorialPreflight.rewriteActions.join(" | ") || "None"}`);
  console.log(`  AI review attempted: ${candidate.aiReview.attempted ? "yes" : "no"}`);
  console.log(`  AI review: ${formatAiReviewStatus(candidate.aiReview)}`);
  console.log(`  AI review unavailable reason: ${candidate.aiReview.unavailableReason ?? "None"}`);
  console.log(`  AI review score: ${candidate.aiReview.available ? `${candidate.aiReview.score}/100` : "unavailable"}`);
  console.log(`  Editorial failure reason: ${candidate.aiReview.editorialFailureReason ?? "None"}`);
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

  for (const blocker of candidate.mismatchGuardrail.blockers) {
    console.log(`  Mismatch blocker: ${blocker}`);
  }

  for (const blocker of candidate.depthGuardrail.blockers) {
    console.log(`  Depth blocker: ${blocker}`);
  }

  for (const blocker of candidate.editorialPreflight.blockers) {
    console.log(`  Preflight blocker: ${blocker}`);
  }

  for (const warning of candidate.editorialPreflight.warnings) {
    console.log(`  Preflight warning: ${warning}`);
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
      candidate.aiReview.unavailableReason ?? "",
      candidate.aiReview.editorialFailureReason ?? "",
      ...candidate.rejectionReasons,
    ].filter((reason, index, all) => reason.trim().length > 0 && all.indexOf(reason) === index);

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
  add("too much tool-list content", /tool list|broad tool|supporting actors|placeholder phrase/);
  add("weak decision path", /decision path|branching|if\/then|decision logic/);
  add("generic FAQ", /faq|generic question/);
  add("repeated Best for / Avoid if", /repeated best for|repeated avoid if/);
  add("topic mismatch", /topic mismatch|unrelated terms|does not use enough/);
  add("minimum depth", /minimum depth|tools must be mapped|input and output/);
  add("lack of concrete workflow", /workflow|step-by-step|concrete example|example result/);
  add("title too broad", /title|best ai tools for/);
  add("no mobile/desktop usefulness", /mobile|desktop|deviceintent/);
  add("insufficient comparison evidence", /comparison|evidence|ranking|verdict/);
  add("placeholder-style language", /placeholder|selected for this guide|core workflow|fits your situation|strong option/);

  if (candidateGuideType(guide) === "how-to" && !/^how to\b/i.test(guide.title)) {
    categories.push("title too broad");
    if (/^best ai tools\b/i.test(guide.title)) {
      categories.push("too much tool-list content");
    }
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
    "gpt-5.4-mini",
  ].filter((model, index, models): model is string =>
    typeof model === "string" &&
    model.trim().length > 0 &&
    models.indexOf(model) === index,
  );
}

function truncateForOpenAI(value: string, maxLength: number): { readonly value: string; readonly truncated: boolean } {
  if (value.length <= maxLength) {
    return { value, truncated: false };
  }

  return {
    value: `${value.slice(0, maxLength)}\n[truncated for OpenAI improvement request]`,
    truncated: true,
  };
}

function compactList(values: readonly string[], maxItems: number, maxLength: number): { readonly values: string[]; readonly truncated: boolean } {
  let truncated = values.length > maxItems;
  const compacted = values.slice(0, maxItems).map((value) => {
    const result = truncateForOpenAI(value.replace(/\s+/g, " ").trim(), maxLength);
    truncated ||= result.truncated;
    return result.value;
  });

  return { values: compacted, truncated };
}

function compactEditorialBriefForImprovement(editorialBrief: EditorialBrief): unknown {
  return {
    guideType: editorialBrief.guideType,
    targetReader: editorialBrief.targetReader,
    searchIntent: editorialBrief.searchIntent,
    userPain: editorialBrief.userPain,
    realWorldScenario: editorialBrief.realWorldScenario,
    jobToBeDone: editorialBrief.jobToBeDone,
    primaryKeyword: editorialBrief.primaryKeyword,
    longTailKeywords: editorialBrief.longTailKeywords,
    deviceIntent: editorialBrief.deviceIntent,
    mobileScenario: editorialBrief.mobileScenario,
    desktopScenario: editorialBrief.desktopScenario,
    whatTheReaderNeedsInFirst100Words: editorialBrief.whatTheReaderNeedsInFirst100Words,
    whatThisArticleMustNotDo: editorialBrief.whatThisArticleMustNotDo,
    coreWorkflow: editorialBrief.coreWorkflow,
    toolRoleMap: editorialBrief.toolRoleMap,
    decisionCriteria: editorialBrief.decisionCriteria,
    examplesToInclude: editorialBrief.examplesToInclude,
    commonMistakesToWarnAbout: editorialBrief.commonMistakesToWarnAbout,
    FAQQuestions: editorialBrief.FAQQuestions,
    nextStepCTA: editorialBrief.nextStepCTA,
    guideTypeStandard: editorialBrief.guideTypeStandard,
    editorialBlueprint: {
      topicBucket: editorialBrief.editorialBlueprint.topicBucket,
      inputMaterial: editorialBrief.editorialBlueprint.inputMaterial,
      desiredOutput: editorialBrief.editorialBlueprint.desiredOutput,
      first100WordsAnswer: editorialBrief.editorialBlueprint.first100WordsAnswer,
      workflowSteps: editorialBrief.editorialBlueprint.workflowSteps,
      mobileWorkflow: editorialBrief.editorialBlueprint.mobileWorkflow,
      desktopWorkflow: editorialBrief.editorialBlueprint.desktopWorkflow,
      toolRoleMap: editorialBrief.editorialBlueprint.toolRoleMap,
      decisionPath: editorialBrief.editorialBlueprint.decisionPath,
      comparisonCriteria: editorialBrief.editorialBlueprint.comparisonCriteria,
      exampleResult: editorialBrief.editorialBlueprint.exampleResult,
      commonMistakes: editorialBrief.editorialBlueprint.commonMistakes,
      faqQuestions: editorialBrief.editorialBlueprint.faqQuestions,
      allowedTerms: editorialBrief.editorialBlueprint.categoryLanguage.allowedVocabulary,
      bannedMismatchedTerms: editorialBrief.editorialBlueprint.bannedMismatchedTerms,
      topicSpecificTerms: editorialBrief.editorialBlueprint.topicSpecificTerms,
    },
  };
}

function compactGuideForImprovement(guide: Guide): unknown {
  return {
    slug: guide.slug,
    title: guide.title,
    guideType: guide.guideType,
    type: guide.type,
    metaTitle: guide.metaTitle,
    metaDescription: guide.metaDescription,
    category: guide.category,
    primaryKeyword: guide.primaryKeyword,
    secondaryKeywords: guide.secondaryKeywords,
    longTailKeywords: guide.longTailKeywords,
    audience: guide.audience,
    searchIntent: guide.searchIntent,
    userPain: guide.userPain,
    decisionQuestion: guide.decisionQuestion,
    deviceIntent: guide.deviceIntent,
    desktopUseCase: guide.desktopUseCase,
    mobileUseCase: guide.mobileUseCase,
    quickAnswer: guide.quickAnswer,
    quickVerdict: guide.quickVerdict,
    quickDecision: guide.quickDecision,
    realWorldScenario: guide.realWorldScenario,
    whatYouNeed: guide.whatYouNeed,
    aiOverviewAnswer: guide.aiOverviewAnswer,
    steps: guide.steps,
    toolsYouCanUse: guide.toolsYouCanUse,
    keyTakeaways: guide.keyTakeaways,
    bestPicksBySituation: guide.bestPicksBySituation,
    recommendedToolSlugs: guide.recommendedToolSlugs,
    recommendedTools: guide.recommendedTools,
    comparisonRows: guide.comparisonRows,
    decisionPath: guide.decisionPath,
    whoShouldUseThis: guide.whoShouldUseThis,
    whoShouldAvoidThis: guide.whoShouldAvoidThis,
    commonMistakes: guide.commonMistakes,
    mistakesToAvoid: guide.mistakesToAvoid,
    whatToAvoid: guide.whatToAvoid,
    exampleWorkflow: guide.exampleWorkflow,
    exampleResult: guide.exampleResult,
    faqs: guide.faqs,
    finalVerdict: guide.finalVerdict,
    visualSummary: guide.visualSummary,
    qualityScore: guide.qualityScore,
  };
}

function openAIErrorCategory(status: number, bodyText: string): string {
  const normalized = bodyText.toLowerCase();

  if (normalized.includes("context_length_exceeded") || normalized.includes("maximum context")) {
    return "context_length_exceeded";
  }

  if (normalized.includes("unsupported_parameter") || normalized.includes("unsupported field")) {
    return "unsupported_parameter";
  }

  if (normalized.includes("invalid_request_error") || normalized.includes("invalid request")) {
    return "invalid_request";
  }

  if (normalized.includes("model_not_found") || normalized.includes("model unavailable")) {
    return "model_unavailable";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests") || status === 429) {
    return "rate_limited";
  }

  if (status >= 500) {
    return "upstream_error";
  }

  return status === 400 ? "bad_request" : "request_failed";
}

function safeOpenAIErrorMessage(bodyText: string): string {
  if (!bodyText.trim()) {
    return "OpenAI returned an empty error body.";
  }

  try {
    const parsed = JSON.parse(bodyText) as {
      readonly error?: {
        readonly message?: unknown;
        readonly type?: unknown;
        readonly param?: unknown;
        readonly code?: unknown;
      };
    };
    const error = parsed.error;
    const parts = [
      typeof error?.message === "string" ? error.message : undefined,
      typeof error?.type === "string" ? `type=${error.type}` : undefined,
      typeof error?.param === "string" ? `param=${error.param}` : undefined,
      typeof error?.code === "string" ? `code=${error.code}` : undefined,
    ].filter((part): part is string => Boolean(part));

    if (parts.length > 0) {
      return truncateForOpenAI(parts.join(" | "), 700).value;
    }
  } catch {
    // Fall through to a bounded plain-text body.
  }

  return truncateForOpenAI(bodyText.replace(/\s+/g, " ").trim(), 700).value;
}

function buildImprovementRequestInput({
  attempt,
  guideType,
  warnings,
  failureCategories,
  editorialBrief,
  articleOutline,
  guide,
}: {
  readonly attempt: number;
  readonly guideType: GuideLayoutType;
  readonly warnings: readonly string[];
  readonly failureCategories: readonly string[];
  readonly editorialBrief: EditorialBrief;
  readonly articleOutline: ArticleOutline;
  readonly guide: Guide;
}): { readonly input: ImprovementRequestInput; readonly payloadTruncated: boolean } {
  const compactWarnings = compactList(warnings, 24, 360);
  const compactFixes = compactList(specificRewriteFixes(failureCategories), 16, 360);
  const draftJson = JSON.stringify(compactGuideForImprovement(guide));
  const compactDraft = truncateForOpenAI(draftJson, 32_000);

  return {
    payloadTruncated: compactWarnings.truncated || compactFixes.truncated || compactDraft.truncated,
    input: {
      attempt,
      failedGuideType: guideType,
      warnings: compactWarnings.values,
      failureCategories,
      specificFixes: compactFixes.values,
      editorialBrief: compactEditorialBriefForImprovement(editorialBrief),
      articleOutline,
      guideTypeStandard: guideTypeStandardForPrompt(guideType),
      localEditorialRules: {
        bannedGenericPhrases,
        quickAnswerRules,
        minimumDepthRules,
        faqQualityRules,
        decisionPathRules,
      },
      failedDraft: compactDraft.value,
      strategy: [
        "Return one complete guide JSON object, not a partial object and not a patch.",
        "Preserve every required field from failedDraft; when a field is not changing, copy it from failedDraft.",
        "Do not omit keyTakeaways, bestPicksBySituation, recommendedTools, comparisonRows, decisionPath, steps, toolsYouCanUse, faqs, visualSummary, finalVerdict, deviceIntent, desktopUseCase, mobileUseCase, desktopSearchAngle, or mobileSearchAngle.",
        "Rebuild the article around the reader's source input, desired output, first action, and review step.",
        "Rewrite quickAnswer or quickVerdict first, then workflow, device guidance, example result, FAQs, and tool roles.",
        "Remove malformed phrases, repeated keyword stuffing, generic filler, and tool-list framing in how-to guides.",
        "Keep tools grounded in the selected slugs and explain distinct roles, tradeoffs, avoid conditions, and decision branches.",
      ],
    },
  };
}

function buildImprovementRequestBody(model: string, input: ImprovementRequestInput): Record<string, unknown> {
  return {
    model,
    instructions:
      `${comparavyGoldStandardPrompt} You are deeply rebuilding a failed Comparavy guide candidate after local editorial preflight, deterministic quality checks, and strict AI editorial review. Return one complete guide JSON object only. Do not return partial fields, a patch, Markdown, commentary, or a wrapper object. Preserve every required field from the failed draft; if a field is not being changed, copy it from the failed draft. Do not omit arrays such as keyTakeaways, bestPicksBySituation, recommendedTools, comparisonRows, decisionPath, steps, toolsYouCanUse, faqs, commonMistakes, mistakesToAvoid, whoShouldUseThis, whoShouldAvoidThis, or moneySavingTips. Do not omit visualSummary, finalVerdict, deviceIntent, desktopUseCase, mobileUseCase, desktopSearchAngle, or mobileSearchAngle. This is a deep rewrite from the Gold Standard Writing System and Editorial Blueprint, not a field patch. Preserve only useful factual material from the failed draft. The blueprint is the source of truth for scenario, input material, desired output, workflow, mobile/desktop use, tool roles, comparison criteria, example result, FAQ, category language, and banned mismatched terms. Remove generic filler, correct topic mismatch, add concrete workflow steps, improve decision path, rewrite FAQ, rewrite Quick Answer or Quick Verdict, and make tool recommendations support the user problem. If guideType is how-to, the title must start with "How to", put the practical workflow before tools, and rebuild realWorldScenario, whatYouNeed, step-by-step workflow with what/why/output detail, computer guidance, phone guidance, Tools you can use, Example result, Common mistakes, FAQ, and Next step. If guideType is tool-decision, write a Quick Verdict, put Which one should you choose before tool cards, justify the ranking with blueprint criteria, create unique tool cards, and use branching if/then decisionPath before tool-card detail. Do not invent prices, fake testing, guaranteed income, performance claims, legal advice, unsupported current-news claims, placeholder phrases, malformed wording like "Use mobile for on mobile", repeated Best for / Avoid if text, or any banned mismatched term. pricingNote and pricingCaveat must remain exactly: Pricing can change. Check the official site before subscribing.`,
    input: JSON.stringify(input),
    max_output_tokens: 6000,
    truncation: "auto",
  };
}

function buildOpenAIImprovementFailure(
  model: string,
  status: number,
  bodyText: string,
  payloadTruncated: boolean,
): OpenAIImprovementFailure {
  return {
    model,
    requestType: "Responses API /v1/responses",
    status,
    category: openAIErrorCategory(status, bodyText),
    safeMessage: safeOpenAIErrorMessage(bodyText),
    responseFormatUsed: false,
    reasoningEffortUsed: false,
    payloadTruncated,
  };
}

function logOpenAIImprovementFailure(slug: string, failure: OpenAIImprovementFailure): void {
  console.warn(`[${slug}] OpenAI improvement request failed.`);
  console.warn(`[${slug}] Improvement request type: ${failure.requestType}`);
  console.warn(`[${slug}] Improvement model used: ${failure.model}`);
  console.warn(`[${slug}] Improvement status code: ${failure.status}`);
  console.warn(`[${slug}] Improvement safe reason category: ${failure.category}`);
  console.warn(`[${slug}] Improvement safe API message: ${failure.safeMessage}`);
  console.warn(
    `[${slug}] Improvement response_format used: ${failure.responseFormatUsed ? "yes (Responses text.format json_schema)" : "no (plain JSON text)"}`,
  );
  console.warn(`[${slug}] Improvement reasoning_effort used: ${failure.reasoningEffortUsed ? "yes" : "no"}`);
  console.warn(`[${slug}] Improvement payload truncated: ${failure.payloadTruncated ? "yes" : "no"}`);
}

function parseGuideJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;

  return JSON.parse(jsonText) as unknown;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnField(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function hasTextValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function hasStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(hasTextValue);
}

function objectArrayHasRequiredStrings(
  value: unknown,
  requiredStrings: readonly string[],
  minimum = 1,
): boolean {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.every((entry) =>
      isPlainRecord(entry) && requiredStrings.every((field) => hasTextValue(entry[field])),
    )
  );
}

function hasRecommendedTools(value: unknown): boolean {
  return (
    objectArrayHasRequiredStrings(value, [
      "toolSlug",
      "toolName",
      "summary",
      "bestFor",
      "avoidIf",
      "toolPagePath",
    ]) &&
    (value as readonly unknown[]).every((entry) =>
      isPlainRecord(entry) &&
      hasStringArray(entry.strengths) &&
      hasStringArray(entry.tradeoffs),
    )
  );
}

function hasComparisonRows(value: unknown): boolean {
  return (
    objectArrayHasRequiredStrings(value, [
      "toolSlug",
      "toolName",
      "bestFor",
      "easeOfUse",
      "whyConsider",
      "watchFor",
    ]) &&
    (value as readonly unknown[]).every((entry) =>
      isPlainRecord(entry) && typeof entry.freePlan === "boolean",
    )
  );
}

function hasVisualSummary(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    hasTextValue(value.headline) &&
    hasStringArray(value.points)
  );
}

function hasValidGuideField(value: unknown, field: string): boolean {
  if (!isPlainRecord(value)) {
    return false;
  }

  switch (field) {
    case "secondaryKeywords":
    case "longTailKeywords":
    case "keyTakeaways":
    case "recommendedToolSlugs":
    case "whoShouldUseThis":
    case "whoShouldAvoidThis":
    case "moneySavingTips":
    case "commonMistakes":
    case "mistakesToAvoid":
    case "whatToAvoid":
      return hasStringArray(value[field]);
    case "bestPicksBySituation":
      return objectArrayHasRequiredStrings(value[field], ["situation", "toolSlug", "toolName", "why"]);
    case "recommendedTools":
      return hasRecommendedTools(value[field]);
    case "comparisonRows":
      return hasComparisonRows(value[field]);
    case "decisionPath":
    case "decisionTree":
      return objectArrayHasRequiredStrings(value[field], ["situation", "recommendation", "reason"]);
    case "steps":
      return objectArrayHasRequiredStrings(value[field], ["title", "detail"], 3);
    case "toolsYouCanUse":
      return objectArrayHasRequiredStrings(value[field], ["toolSlug", "toolName", "why"], 2);
    case "faqs":
    case "faq":
      return objectArrayHasRequiredStrings(value[field], ["question", "answer"]);
    case "visualSummary":
      return hasVisualSummary(value[field]);
    default:
      return hasTextValue(value[field]);
  }
}

function restoreFieldFromOriginal(
  merged: Record<string, unknown>,
  original: Guide,
  field: keyof Guide | GuideRequiredArrayField | "faq" | "decisionTree",
  restoredFields: Set<string>,
): void {
  const originalRecord = original as unknown as Record<string, unknown>;

  if (hasValidGuideField(originalRecord, field)) {
    merged[field] = originalRecord[field];
    restoredFields.add(field);
  }
}

function preserveNonEmptyText(
  merged: Record<string, unknown>,
  original: Guide,
  fields: readonly (keyof Guide)[],
  restoredFields: Set<string>,
): void {
  const originalRecord = original as unknown as Record<string, unknown>;

  for (const field of fields) {
    if (!hasTextValue(merged[field]) && hasTextValue(originalRecord[field])) {
      merged[field] = originalRecord[field];
      restoredFields.add(field);
    }
  }
}

function preserveRequiredArrays(
  merged: Record<string, unknown>,
  original: Guide,
  restoredFields: Set<string>,
): void {
  const requiredArrays: readonly GuideRequiredArrayField[] = [
    "secondaryKeywords",
    "longTailKeywords",
    "keyTakeaways",
    "bestPicksBySituation",
    "recommendedToolSlugs",
    "recommendedTools",
    "comparisonRows",
    "decisionPath",
    "whoShouldUseThis",
    "whoShouldAvoidThis",
    "moneySavingTips",
    "faqs",
  ];

  for (const field of requiredArrays) {
    if (!hasValidGuideField(merged, field)) {
      restoreFieldFromOriginal(merged, original, field, restoredFields);
    }
  }

  if (!hasValidGuideField(merged, "faq") && hasValidGuideField(original, "faq")) {
    restoreFieldFromOriginal(merged, original, "faq", restoredFields);
  }
}

function preserveDeviceFields(
  merged: Record<string, unknown>,
  original: Guide,
  restoredFields: Set<string>,
): void {
  const originalRecord = original as unknown as Record<string, unknown>;

  if (
    merged.deviceIntent !== "desktop" &&
    merged.deviceIntent !== "mobile" &&
    merged.deviceIntent !== "both" &&
    typeof originalRecord.deviceIntent === "string"
  ) {
    merged.deviceIntent = originalRecord.deviceIntent;
    restoredFields.add("deviceIntent");
  }

  if (merged.deviceIntent === "both") {
    preserveNonEmptyText(
      merged,
      original,
      ["desktopUseCase", "mobileUseCase", "desktopSearchAngle", "mobileSearchAngle"],
      restoredFields,
    );
  }
}

function repairMergedImprovedGuide(
  original: Guide,
  merged: Record<string, unknown>,
): { readonly guide: Guide; readonly restoredFields: readonly string[] } {
  const restoredFields = new Set<string>();

  preserveNonEmptyText(
    merged,
    original,
    [
      "title",
      "metaTitle",
      "metaDescription",
      "category",
      "persona",
      "useCase",
      "budgetAngle",
      "skillLevel",
      "primaryKeyword",
      "audience",
      "searchIntent",
      "userPain",
      "decisionQuestion",
      "contentGap",
      "uniqueAngle",
      "aiOverviewAnswer",
      "quickVerdict",
      "pricingNote",
      "pricingCaveat",
      "finalVerdict",
      "ctaToFinder",
      "finderCTA",
      "affiliateDisclosureNote",
      "affiliateDisclosure",
      "freshness",
      "status",
      "createdAt",
      "updatedAt",
    ],
    restoredFields,
  );
  preserveRequiredArrays(merged, original, restoredFields);
  preserveDeviceFields(merged, original, restoredFields);

  if (!hasVisualSummary(merged.visualSummary)) {
    restoreFieldFromOriginal(merged, original, "visualSummary", restoredFields);
  }

  const guideType = candidateGuideType(original);

  if (guideType === "how-to") {
    preserveNonEmptyText(
      merged,
      original,
      ["quickAnswer", "exampleResult", "exampleWorkflow", "desktopUseCase", "mobileUseCase"],
      restoredFields,
    );

    for (const field of ["steps", "toolsYouCanUse", "commonMistakes", "mistakesToAvoid"] as const) {
      if (!hasValidGuideField(merged, field)) {
        restoreFieldFromOriginal(merged, original, field, restoredFields);
      }
    }
  }

  if (guideType === "tool-decision") {
    preserveNonEmptyText(merged, original, ["quickVerdict"], restoredFields);

    for (const field of ["bestPicksBySituation", "recommendedTools", "comparisonRows", "decisionPath"] as const) {
      if (!hasValidGuideField(merged, field)) {
        restoreFieldFromOriginal(merged, original, field, restoredFields);
      }
    }
  }

  if (!hasValidGuideField(merged, "decisionTree") && hasValidGuideField(merged, "decisionPath")) {
    merged.decisionTree = merged.decisionPath;
    restoredFields.add("decisionTree");
  }

  return {
    guide: restoreProtectedGuideFields(original, merged as unknown as Guide),
    restoredFields: [...restoredFields].sort(),
  };
}

function mergeImprovedGuide(
  original: Guide,
  improvedPatch: unknown,
): { readonly guide: Guide; readonly restoredFields: readonly string[]; readonly patchRecord: Record<string, unknown> } {
  const patchRecord = isPlainRecord(improvedPatch) ? improvedPatch : {};
  const merged: Record<string, unknown> = {
    ...(original as unknown as Record<string, unknown>),
    ...patchRecord,
  };

  const repaired = repairMergedImprovedGuide(original, merged);

  return {
    ...repaired,
    patchRecord,
  };
}

function logImprovedGuideValidationFailure({
  slug,
  original,
  patchRecord,
  mergedGuide,
  restoredFields,
  issues,
}: {
  readonly slug: string;
  readonly original: Guide;
  readonly patchRecord: Record<string, unknown>;
  readonly mergedGuide: Guide;
  readonly restoredFields: readonly string[];
  readonly issues: readonly ContentQualityIssue[];
}): void {
  console.warn(`[${slug}] Improved guide validation failed after merge/repair.`);
  console.warn(`[${slug}] Improvement merge restored fields: ${restoredFields.join(", ") || "None"}`);

  for (const issue of issues) {
    console.warn(
      `[${slug}] Invalid improved field "${issue.field}": ${issue.message} ` +
        `originalHad=${hasValidGuideField(original, issue.field) ? "yes" : "no"} ` +
        `improvedOmitted=${hasOwnField(patchRecord, issue.field) ? "no" : "yes"} ` +
        `mergeRepairAttempted=${restoredFields.includes(issue.field) ? "yes" : "no"} ` +
        `mergedValid=${hasValidGuideField(mergedGuide, issue.field) ? "yes" : "no"}`,
    );
  }
}

function rejectionReasonsForImprovement(
  deterministic: GuideQualityResult,
  editorialPreflight: EditorialPreflightResult,
  aiReview: AiGuideReview,
): string[] {
  return [
    ...deterministic.blockers,
    ...deterministic.warnings,
    ...editorialPreflight.blockers,
    ...editorialPreflight.failedStandards.map((standard) => `Failed standard: ${standard}`),
    ...editorialPreflight.missingSections.map((section) => `Missing section: ${section}`),
    ...editorialPreflight.bannedPhrasesFound.map((phrase) => `Banned phrase found: ${phrase}`),
    ...editorialPreflight.topicMismatchReasons.map((reason) => `Topic mismatch reason: ${reason}`),
    ...editorialPreflight.rewriteActions.map((action) => `Rewrite action taken: ${action}`),
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
  editorialPreflight: EditorialPreflightResult,
  aiReview: AiGuideReview,
  attempt: number,
): Promise<Guide> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return guide;
  }

  const warnings = rejectionReasonsForImprovement(deterministic, editorialPreflight, aiReview);
  const failureCategories = classifyFailureCategories(warnings, guide);
  const guideType = candidateGuideType(guide);
  const selectedTools = scoreToolsForTopic(topic).filter(({ tool }) =>
    guide.recommendedToolSlugs.includes(tool.slug),
  );
  const editorialBrief = createEditorialBrief(topic, guideType, selectedTools);
  const articleOutline = createArticleOutline(editorialBrief, guide.title);
  const improvementInput = buildImprovementRequestInput({
    attempt,
    guideType,
    warnings,
    failureCategories,
    editorialBrief,
    articleOutline,
    guide,
  });
  let lastFailure = "OpenAI improvement request failed before a model response was returned.";

  for (const model of preferredGuideModels()) {
    console.log(`[${topic.slug}] Improvement model used: ${model}`);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildImprovementRequestBody(model, improvementInput.input)),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const failure = buildOpenAIImprovementFailure(
        model,
        response.status,
        bodyText,
        improvementInput.payloadTruncated,
      );
      logOpenAIImprovementFailure(topic.slug, failure);
      lastFailure =
        `OpenAI improvement request failed with status ${response.status} (${failure.category}) using ${model}: ${failure.safeMessage}`;
      continue;
    }

    const result = (await response.json()) as ResponsesResult;
    const text = readOutputText(result);

    if (!text) {
      throw new Error("OpenAI improvement returned no structured guide text.");
    }

    const merged = mergeImprovedGuide(guide, parseGuideJsonText(text));
    const sanitizedGuide = sanitizeGuideBeforeReview(merged.guide);
    const validationIssues = validateGuideContent(sanitizedGuide);

    if (validationIssues.length > 0) {
      logImprovedGuideValidationFailure({
        slug: guide.slug,
        original: guide,
        patchRecord: merged.patchRecord,
        mergedGuide: sanitizedGuide,
        restoredFields: merged.restoredFields,
        issues: validationIssues,
      });
      assertGuideContentQuality(sanitizedGuide, guide.slug);
    }

    console.log(
      `[${guide.slug}] Improvement merge restored fields: ${merged.restoredFields.join(", ") || "None"}`,
    );
    return sanitizedGuide;
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

function printOpenAIDiagnostics(diagnostics: OpenAIReviewDiagnostics, options: AutoPublishOptions): void {
  console.log("OpenAI diagnostics");
  console.log(`OPENAI_API_KEY present: ${diagnostics.apiKeyPresent ? "yes" : "no"}`);
  console.log(`OPENAI_MODEL value: ${diagnostics.model}`);
  console.log(`Model used for AI review: ${diagnostics.model}`);
  console.log(`Model used for improvement: ${preferredGuideModels()[0] ?? diagnostics.model}`);
  console.log(`OPENAI_REASONING_EFFORT value: ${diagnostics.reasoningEffort}`);
  console.log(`Running in GitHub Actions: ${diagnostics.runningInGitHubActions ? "yes" : "no"}`);
  console.log(`Dry run: ${options.dryRun ? "yes" : "no"}`);
  console.log(`Publish mode: ${options.publish ? "yes" : "no"}`);
}

function determineOpenAIReviewPolicy(
  diagnostics: OpenAIReviewDiagnostics,
  probe: Awaited<ReturnType<typeof probeOpenAIEditorialReview>>,
  options: AutoPublishOptions,
): OpenAIReviewPolicy {
  if (!diagnostics.apiKeyPresent) {
    if (!options.dryRun && (options.publish || diagnostics.runningInGitHubActions)) {
      throw new Error(
        "OPENAI_API_KEY is required for GitHub Actions publish mode. Set or update repository secret OPENAI_API_KEY under Settings → Secrets and variables → Actions.",
      );
    }

    if (options.dryRun) {
      return {
        mode: "skipped-local",
        unavailableReason:
          "Local dry-run ran deterministic, editorial preflight, mismatch, and depth checks only. AI review skipped because OPENAI_API_KEY is not set locally.",
      };
    }

    return {
      mode: "skipped-local",
      unavailableReason:
        "AI editorial review skipped because OPENAI_API_KEY is not set locally.",
    };
  }

  if (!probe.available) {
    const reason = probe.unavailableReason ?? "OpenAI editorial review probe failed.";

    if (!options.dryRun && (options.publish || diagnostics.runningInGitHubActions)) {
      if (reason.includes("authentication failed")) {
        throw new Error(
          `${reason} Set or update repository secret OPENAI_API_KEY under Settings → Secrets and variables → Actions.`,
        );
      }

      throw new Error(reason);
    }

    return {
      mode: "unavailable",
      unavailableReason: reason,
    };
  }

  return {
    mode: "enabled",
  };
}

async function reviewAndImproveCandidate({
  topic,
  guide,
  comparisonGuides,
  publishedGuides,
  threshold,
  slot,
  openAIReviewPolicy,
}: {
  readonly topic: GuideTopic;
  readonly guide: Guide;
  readonly comparisonGuides: readonly Guide[];
  readonly publishedGuides: readonly Guide[];
  readonly threshold: number;
  readonly slot: GuideLayoutType;
  readonly openAIReviewPolicy: OpenAIReviewPolicy;
}): Promise<Candidate> {
  let currentGuide = sanitizeGuideBeforeReview(guide);
  const selectedTools = scoreToolsForTopic(topic).filter(({ tool }) =>
    currentGuide.recommendedToolSlugs.includes(tool.slug),
  );
  const blueprint = buildEditorialBlueprint({
    topic,
    guideType: candidateGuideType(currentGuide),
    tools: selectedTools,
  });
  let deterministic = runDeterministicQualityCheck(currentGuide, comparisonGuides);
  let mismatchGuardrail = topicMismatchGuardrail(currentGuide, blueprint);
  let depthGuardrail = minimumDepthGuardrail(currentGuide, blueprint);
  deterministic = mergeQualityResults(
    mergeQualityResults(deterministic, mismatchGuardrail),
    depthGuardrail,
  );
  let editorialPreflight = runEditorialPreflight(
    currentGuide,
    blueprint,
    deterministic,
    mismatchGuardrail,
    depthGuardrail,
  );
  let aiReview = deterministic.passed && editorialPreflight.passed
    ? openAIReviewPolicy.mode === "enabled"
      ? await reviewGuideWithAI(currentGuide)
      : unavailableAiReview(
          openAIReviewPolicy.unavailableReason ??
            "AI editorial review was skipped because it is unavailable in this run.",
        )
    : unavailableAiReview("AI editorial review was deferred until local editorial preflight passes.");
  let rejectionReasons = requiredPublishingReasons(
    currentGuide,
    deterministic,
    editorialPreflight,
    aiReview,
    threshold,
  );
  let improveAttempts = 0;
  let improvementFailureReason: string | undefined;
  let skipFurtherImprovementForLowScore = aiReview.available && aiReview.score < LOW_AI_SCORE_RETRY_CUTOFF;

  if (skipFurtherImprovementForLowScore) {
    console.log(
      `[${topic.slug}] AI review score ${aiReview.score}/100 is below ${LOW_AI_SCORE_RETRY_CUTOFF}; skipping improvement retries for this topic in this run.`,
    );
  }

  while (
    rejectionReasons.length > 0 &&
    openAIReviewPolicy.mode === "enabled" &&
    !skipFurtherImprovementForLowScore &&
    improveAttempts < MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE
  ) {
    improveAttempts += 1;
    console.log(`[${topic.slug}] Improvement attempt ${improveAttempts}/${MAX_IMPROVE_ATTEMPTS_PER_CANDIDATE}`);

    try {
      currentGuide = await improveGuideWithAI(
        topic,
        currentGuide,
        deterministic,
        editorialPreflight,
        aiReview,
        improveAttempts,
      );
    } catch (error) {
      improvementFailureReason = String(error);
      console.warn(`[${topic.slug}] Improvement failed: ${improvementFailureReason}`);
      break;
    }

    deterministic = runDeterministicQualityCheck(currentGuide, comparisonGuides);
    mismatchGuardrail = topicMismatchGuardrail(currentGuide, blueprint);
    depthGuardrail = minimumDepthGuardrail(currentGuide, blueprint);
    deterministic = mergeQualityResults(
      mergeQualityResults(deterministic, mismatchGuardrail),
      depthGuardrail,
    );
    editorialPreflight = runEditorialPreflight(
      currentGuide,
      blueprint,
      deterministic,
      mismatchGuardrail,
      depthGuardrail,
    );
    aiReview = deterministic.passed && editorialPreflight.passed
      ? openAIReviewPolicy.mode === "enabled"
        ? await reviewGuideWithAI(currentGuide)
        : unavailableAiReview(
            openAIReviewPolicy.unavailableReason ??
              "AI editorial review was skipped because it is unavailable in this run.",
          )
      : unavailableAiReview("AI editorial review was deferred until local editorial preflight passes.");
    rejectionReasons = requiredPublishingReasons(
      currentGuide,
      deterministic,
      editorialPreflight,
      aiReview,
      threshold,
    );
    skipFurtherImprovementForLowScore = aiReview.available && aiReview.score < LOW_AI_SCORE_RETRY_CUTOFF;

    if (skipFurtherImprovementForLowScore) {
      console.log(
        `[${topic.slug}] AI review score ${aiReview.score}/100 is below ${LOW_AI_SCORE_RETRY_CUTOFF} after improvement; trying the next gold brief.`,
      );
      break;
    }
  }

  return {
    guide: currentGuide,
    topicSlug: topic.slug,
    generated: true,
    topicPriority: topicPriority(currentGuide),
    uniquenessScore: uniquenessScore(currentGuide, publishedGuides),
    deterministic,
    aiReview,
    mismatchGuardrail,
    depthGuardrail,
    editorialPreflight,
    topicBucket: blueprint.topicBucket,
    improveAttempts,
    eligible: rejectionReasons.length === 0,
    rejectionReasons,
    finalStatus: rejectionReasons.length === 0 ? "draft" : "rejected",
    slot,
    failureCategories: classifyFailureCategories(
      rejectionReasonsForImprovement(deterministic, editorialPreflight, aiReview),
      currentGuide,
    ),
    improvementFailureReason,
  };
}

interface QueueSelection {
  readonly source: "gold" | "generic";
  readonly brief?: GuideGoldBrief;
  readonly topic: GuideTopic;
}

interface GeneratedQueueGuide {
  readonly guide: Guide;
  readonly source: "gold" | "generic";
  readonly briefSlug: string;
  readonly deterministic: GuideQualityResult;
  readonly aiReview: AiGuideReview;
  readonly finalStatus: "approved" | "draft" | "rejected";
  readonly sentToAiReview: boolean;
  readonly writeStatus: "approved" | "draft" | "rejected";
}

function unavailableQueueReview(reason: string): AiGuideReview {
  return {
    attempted: false,
    available: false,
    passed: false,
    score: 0,
    verdict: reason,
    warnings: [reason],
    suggestedFixes: ["Run the AI editorial review before approving this guide."],
    unavailableReason: reason,
  };
}

function sortByPriorityDesc<T extends { readonly priority: number; readonly slug: string }>(left: T, right: T): number {
  return right.priority - left.priority || left.slug.localeCompare(right.slug);
}

function sortGoldBriefsForQueue(left: GuideGoldBrief, right: GuideGoldBrief): number {
  const leftPreferred = PREFERRED_GOLD_BRIEF_ORDER.get(left.slug) ?? Number.POSITIVE_INFINITY;
  const rightPreferred = PREFERRED_GOLD_BRIEF_ORDER.get(right.slug) ?? Number.POSITIVE_INFINITY;

  return leftPreferred - rightPreferred || sortByPriorityDesc(left, right);
}

function sortByUpdatedAtAsc(left: Guide, right: Guide): number {
  return left.updatedAt.localeCompare(right.updatedAt) || left.slug.localeCompare(right.slug);
}

function guideTopicBySlug(slug: string): GuideTopic | undefined {
  return guideTopics.find((topic) => topic.slug === slug);
}

function guideGoldBriefBySlug(slug: string): GuideGoldBrief | undefined {
  return guideGoldBriefs.find((brief) => brief.slug === slug);
}

function selectQueueCandidates(
  options: AutoPublishOptions,
  existingBlockedSlugs: ReadonlySet<string>,
  existingGuides: readonly Guide[],
  count: number,
): QueueSelection[] {
  const selections: QueueSelection[] = [];
  const selectedSlugs = new Set<string>();

  const goldBriefs = guideGoldBriefs
    .filter((brief) => brief.status === "active")
    .filter((brief) => options.type === "mixed" || brief.guideType === options.type)
    .filter((brief) => {
      if (existingBlockedSlugs.has(brief.slug)) {
        console.log(`[${brief.slug}] Skipped gold brief: approved or published guide already exists with this slug.`);
        return false;
      }

      if (AVOID_BY_DEFAULT_GOLD_BRIEF_SLUGS.has(brief.slug)) {
        console.log(`[${brief.slug}] Skipped gold brief: temporarily avoided because this topic is failing repeatedly.`);
        return false;
      }

      const collision = guideTitleCollision(brief, existingGuides);

      if (collision) {
        console.log(`[${brief.slug}] Skipped gold brief: title collides with existing guide ${collision.slug}.`);
        return false;
      }

      return true;
    })
    .sort(sortGoldBriefsForQueue);

  if (options.type === "mixed") {
    const howToBriefs = goldBriefs.filter((brief) => brief.guideType === "how-to");
    const toolDecisionBriefs = goldBriefs.filter((brief) => brief.guideType === "tool-decision");
    let round = 0;

    while (selections.length < count && (howToBriefs.length > 0 || toolDecisionBriefs.length > 0)) {
      const primaryPool = round % 2 === 0 ? howToBriefs : toolDecisionBriefs;
      const secondaryPool = round % 2 === 0 ? toolDecisionBriefs : howToBriefs;
      const brief = primaryPool.shift() ?? secondaryPool.shift();

      if (!brief) {
        break;
      }

      const topic = guideTopicBySlug(brief.slug);

      if (!topic || selectedSlugs.has(brief.slug)) {
        continue;
      }

      selectedSlugs.add(brief.slug);
      selections.push({ source: "gold", brief, topic });
      round += 1;
    }
  } else {
    for (const brief of goldBriefs) {
      if (selections.length >= count) {
        break;
      }

      const topic = guideTopicBySlug(brief.slug);

      if (!topic || selectedSlugs.has(brief.slug)) {
        continue;
      }

      selectedSlugs.add(brief.slug);
      selections.push({ source: "gold", brief, topic });
    }
  }

  if (options.allowGenericTopics && selections.length < count) {
    const genericTopics = selectGuideTopics({
      count: count - selections.length,
      type: options.type,
      existingSlugs: new Set([...existingBlockedSlugs, ...selectedSlugs]),
    });

    for (const topic of genericTopics) {
      if (selections.length >= count) {
        break;
      }

      selections.push({ source: "generic", topic });
    }
  }

  return selections.slice(0, count);
}

function buildGuideFromSelection(
  selection: QueueSelection,
  status: "draft" | "approved" | "published",
  avoidToolSlugs: ReadonlySet<string>,
): Guide {
  return createTemplateGuide(
    selection.topic,
    status,
    avoidToolSlugs,
    selection.brief?.guideType ?? resolveGuideLayoutType(selection.topic),
  );
}

async function reviewGeneratedGuide(
  guide: Guide,
  existingGuides: readonly Guide[],
): Promise<{ readonly deterministic: GuideQualityResult; readonly aiReview: AiGuideReview }> {
  const deterministic = checkGuideQuality(
    guide,
    existingGuides.filter((entry) => entry.slug !== guide.slug),
  );

  if (!deterministic.passed) {
    return {
      deterministic,
      aiReview: unavailableQueueReview("AI review skipped because deterministic quality checks failed."),
    };
  }

  const aiReview = await reviewGuideWithAI(guide);
  return { deterministic, aiReview };
}

function finalStatusForGuide(
  deterministic: GuideQualityResult,
  aiReview: AiGuideReview,
): "approved" | "draft" | "rejected" {
  if (!deterministic.passed) {
    return "rejected";
  }

  if (!aiReview.attempted) {
    return "draft";
  }

  if (!aiReview.available) {
    return "rejected";
  }

  return aiReview.passed && aiReview.score >= PUBLISH_THRESHOLD ? "approved" : "rejected";
}

function writeGuideStatus(guide: Guide, status: "draft" | "approved" | "published" | "rejected"): Guide {
  const updatedAt = new Date().toISOString().slice(0, 10);
  return status === "published"
    ? { ...guide, status, updatedAt }
    : status === "approved"
      ? { ...guide, status, updatedAt }
      : { ...guide, status };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  logGuideTopicToolSlugWarnings();

  const openAIDiagnostics = getOpenAIReviewDiagnostics();
  printOpenAIDiagnostics(openAIDiagnostics, options);
  const openAIProbe = openAIDiagnostics.apiKeyPresent
    ? await probeOpenAIEditorialReview()
    : {
        attempted: false,
        available: false,
        model: openAIDiagnostics.model,
        unavailableReason: "OPENAI_API_KEY is not set.",
      };
  const openAIReviewPolicy = determineOpenAIReviewPolicy(openAIDiagnostics, openAIProbe, options);

  if (openAIReviewPolicy.mode === "unavailable") {
    console.log(`AI review unavailable reason: ${openAIReviewPolicy.unavailableReason ?? "Unknown"}`);
  }

  const existingGuides = await getExistingGuides();
  const existingApproved = existingGuides.filter((guide) => guide.status === "approved");
  const existingPublished = existingGuides.filter((guide) => guide.status === "published");
  const existingBlockedSlugs = new Set([...existingApproved, ...existingPublished].map((guide) => guide.slug));
  const approvedQueueBeforeRun = [...existingApproved].sort(sortByUpdatedAtAsc);
  const publishQuota = options.publish ? Math.min(options.count, dailyPublishLimit(), approvedQueueBeforeRun.length) : 0;
  const approvalTarget = options.publish
    ? Math.max(0, options.count - approvedQueueBeforeRun.length)
    : options.count;

  console.log(`Approved guides available before run: ${approvedQueueBeforeRun.length}`);
  if (options.publish) {
    console.log(`Requested publish count: ${options.count}`);
    console.log(`Daily publish limit: ${dailyPublishLimit()}`);
    console.log(`Approved guides publishable this run: ${publishQuota}`);
  }

  if (!options.publish && !options.generateApproved && !options.approve) {
    console.log("No explicit action flag supplied; defaulting to approved generation.");
  }

  const approvedTitlesBeforeRun = approvedQueueBeforeRun.map((guide) => guide.title);
  const publishedThisRun: Guide[] = [];
  const newlyApproved: Guide[] = [];
  const rejectedGuides: Guide[] = [];
  const generatedSummaries: {
    readonly slug: string;
    readonly source: "gold" | "generic";
    readonly sentToAiReview: boolean;
    readonly deterministic: GuideQualityResult;
    readonly aiReview: AiGuideReview;
    readonly finalStatus: "approved" | "draft" | "rejected";
    readonly improveAttempts: number;
    readonly improvementFailureReason?: string;
  }[] = [];
  let candidatesSentToAiReview = 0;
  let genericFallbackUsed = false;
  const improvementFailures: string[] = [];

  const publishCandidates = approvedQueueBeforeRun.slice(0, publishQuota);

  if (options.publish && approvedQueueBeforeRun.length === 0) {
    console.log("No approved guides were available before the run; publishing nothing.");
  }

  if (!options.dryRun && options.publish && publishCandidates.length > 0) {
    await mkdir(GUIDES_DIRECTORY, { recursive: true });

    for (const guide of publishCandidates) {
      const publishedGuide = writeGuideStatus(guide, "published");
      await writeFile(guideFilePath(publishedGuide.slug), `${JSON.stringify(publishedGuide, null, 2)}\n`, "utf8");
      publishedThisRun.push(publishedGuide);
      console.log(`[${publishedGuide.slug}] Published from approved queue.`);
    }
  } else if (options.publish) {
    for (const guide of publishCandidates) {
      publishedThisRun.push(writeGuideStatus(guide, "published"));
      console.log(`[${guide.slug}] Would publish from approved queue (dry run).`);
    }
  }

  const queueSlotCount = Math.max(1, targetSlots(options.type, Math.max(approvalTarget, 1)).length);
  const generationSelectionTarget =
    approvalTarget > 0 && approvedQueueBeforeRun.length === 0
      ? Math.min(MAX_CANDIDATES_PER_RUN, Math.max(approvalTarget, queueSlotCount * MAX_CANDIDATES_PER_SLOT))
      : approvalTarget;
  const desiredNewApprovals =
    options.publish && approvedQueueBeforeRun.length === 0 && approvalTarget > 0
      ? 1
      : approvalTarget;
  const failedTopicSlugsThisRun = new Set<string>();
  const generationSelections = selectQueueCandidates(
    options,
    existingBlockedSlugs,
    existingGuides,
    generationSelectionTarget,
  );

  if (generationSelections.length < generationSelectionTarget && options.allowGenericTopics) {
    genericFallbackUsed = true;
  }

  if (!options.allowGenericTopics && generationSelections.length < generationSelectionTarget) {
    console.log(
      `Gold briefs available for generation: ${generationSelections.length}; no generic fallback used.`,
    );
  }
  console.log(`Gold brief queue candidates selected: ${generationSelections.length}`);

  const generationAvoidToolSlugs = new Set<string>(
    existingGuides
      .filter((guide) => guide.status === "published" || guide.status === "approved")
      .flatMap((guide) => guide.recommendedToolSlugs)
      .slice(0, 16),
  );

  for (const selection of generationSelections) {
    if (desiredNewApprovals > 0 && newlyApproved.length >= desiredNewApprovals) {
      console.log(`Approved generation target met after ${newlyApproved.length} approved guide(s); stopping candidate generation.`);
      break;
    }

    if (failedTopicSlugsThisRun.has(selection.topic.slug)) {
      console.log(`[${selection.topic.slug}] Skipped this run: topic already failed earlier in the run.`);
      continue;
    }

    const brief = selection.brief ?? guideGoldBriefBySlug(selection.topic.slug);
    const draft = buildGuideFromSelection(selection, "draft", generationAvoidToolSlugs);
    const candidate = await reviewAndImproveCandidate({
      topic: selection.topic,
      guide: draft,
      comparisonGuides: existingGuides.filter((entry) => entry.slug !== draft.slug),
      publishedGuides: existingPublished,
      threshold: PUBLISH_THRESHOLD,
      slot: selection.brief?.guideType ?? resolveGuideLayoutType(selection.topic),
      openAIReviewPolicy,
    });
    const finalStatus = candidate.eligible
      ? "approved"
      : !candidate.aiReview.attempted && candidate.deterministic.passed
        ? "draft"
        : "rejected";
    const finalGuide = writeGuideStatus(candidate.guide, finalStatus);

    if (candidate.aiReview.attempted) {
      candidatesSentToAiReview += 1;
    }

    if (candidate.improvementFailureReason) {
      improvementFailures.push(`[${candidate.guide.slug}] ${candidate.improvementFailureReason}`);
    }

    generatedSummaries.push({
      slug: candidate.guide.slug,
      source: selection.source,
      sentToAiReview: candidate.aiReview.attempted,
      deterministic: candidate.deterministic,
      aiReview: candidate.aiReview,
      finalStatus,
      improveAttempts: candidate.improveAttempts,
      improvementFailureReason: candidate.improvementFailureReason,
    });

    if (finalStatus === "approved") {
      newlyApproved.push(finalGuide);
      console.log(`[${finalGuide.slug}] Approved from ${selection.source} ${brief ? "brief" : "topic"}.`);
    } else if (finalStatus === "draft") {
      rejectedGuides.push(finalGuide);
      console.log(`[${finalGuide.slug}] Saved as draft; AI review was unavailable.`);
    } else {
      rejectedGuides.push(finalGuide);
      console.log(`[${finalGuide.slug}] Rejected; AI review score or deterministic checks were below threshold.`);
    }

    if (candidate.aiReview.available && candidate.aiReview.score < LOW_AI_SCORE_RETRY_CUTOFF) {
      failedTopicSlugsThisRun.add(selection.topic.slug);
      console.log(
        `[${selection.topic.slug}] Marked failed for this run after AI score ${candidate.aiReview.score}/100; trying the next gold brief.`,
      );
    }

    console.log(
      `[${finalGuide.slug}] Quality score: ${candidate.deterministic.score}/100 (${candidate.deterministic.passed ? "PASS" : "FAIL"})`,
    );
    for (const warning of candidate.deterministic.warnings) {
      console.log(`[${finalGuide.slug}] Warning: ${warning}`);
    }
    for (const blocker of candidate.deterministic.blockers) {
      console.log(`[${finalGuide.slug}] Blocker: ${blocker}`);
    }
    console.log(
      `[${finalGuide.slug}] Editorial preflight: ${candidate.editorialPreflight.score}/100 (${candidate.editorialPreflight.passed ? "PASS" : "FAIL"})`,
    );
    console.log(`[${finalGuide.slug}] AI review: ${formatAiReviewStatus(candidate.aiReview)}`);
    console.log(`[${finalGuide.slug}] Improvement attempts: ${candidate.improveAttempts}`);
    if (candidate.improvementFailureReason) {
      console.log(`[${finalGuide.slug}] Improvement failure: ${candidate.improvementFailureReason}`);
    }
  }

  if (!options.dryRun) {
    await mkdir(GUIDES_DIRECTORY, { recursive: true });

    for (const guide of newlyApproved) {
      await writeFile(guideFilePath(guide.slug), `${JSON.stringify(guide, null, 2)}\n`, "utf8");
    }

    for (const guide of rejectedGuides) {
      await writeFile(guideFilePath(guide.slug), `${JSON.stringify(guide, null, 2)}\n`, "utf8");
    }
  }

  const remainingApprovedAfterPublish = approvedQueueBeforeRun
    .slice(publishQuota)
    .map((guide) => guide.title);
  const finalApprovedTitles = [...remainingApprovedAfterPublish, ...newlyApproved.map((guide) => guide.title)];
  const finalPublishedTitles = publishedThisRun.map((guide) => guide.title);

  const noGuidesPublished = publishedThisRun.length === 0;
  const noPassingCandidates = newlyApproved.length === 0;
  const finalStatus = noGuidesPublished
    ? noPassingCandidates
      ? "completed_successfully_no_publishable_guides"
      : "completed_successfully_new_guides_approved_for_queue"
    : "completed_successfully_published_from_approved_queue";

  console.log("Auto publish summary:");
  console.log(`Approved guides available before run: ${approvedQueueBeforeRun.length}`);
  console.log(`Approved guides published: ${publishedThisRun.length}`);
  console.log(`New gold brief candidates generated: ${generatedSummaries.filter((entry) => entry.source === "gold").length}`);
  console.log(`Generic fallback used: ${options.allowGenericTopics && genericFallbackUsed ? "yes" : "no"}`);
  console.log(`Candidates sent to AI review: ${candidatesSentToAiReview}`);
  console.log("AI review scores:");
  if (generatedSummaries.length === 0) {
    console.log("None");
  } else {
    for (const candidate of generatedSummaries) {
      console.log(`[${candidate.slug}] ${formatAiReviewStatus(candidate.aiReview)}`);
    }
  }
  console.log("Improvement attempts:");
  if (generatedSummaries.length === 0) {
    console.log("None");
  } else {
    for (const candidate of generatedSummaries) {
      console.log(`[${candidate.slug}] ${candidate.improveAttempts}`);
    }
  }
  console.log("Improvement failures:");
  if (improvementFailures.length === 0) {
    console.log("None");
  } else {
    for (const failure of improvementFailures) {
      console.log(failure);
    }
  }
  console.log(`Guides newly approved: ${newlyApproved.length}`);
  if (newlyApproved.length === 0) {
    console.log("None");
  } else {
    for (const guide of newlyApproved) {
      console.log(guide.title);
    }
  }
  console.log(`Guides rejected: ${rejectedGuides.length}`);
  if (rejectedGuides.length === 0) {
    console.log("None");
  } else {
    for (const guide of rejectedGuides) {
      console.log(guide.title);
    }
  }
  console.log("Final published titles:");
  if (finalPublishedTitles.length === 0) {
    console.log("None");
  } else {
    for (const title of finalPublishedTitles) {
      console.log(title);
    }
  }
  console.log("Final approved titles:");
  if (finalApprovedTitles.length === 0) {
    console.log("None");
  } else {
    for (const title of finalApprovedTitles) {
      console.log(title);
    }
  }
  console.log(`Published from approved queue: ${publishedThisRun.length}`);
  console.log(`Approved queue after run: ${finalApprovedTitles.length}`);
  console.log(`Final status: ${finalStatus}`);

  if (options.dryRun) {
    console.log("Dry run: no guide files modified.");
  }

  if (options.publish && approvedQueueBeforeRun.length === 0) {
    console.log("No approved guides existed before the run, so nothing was published.");
  }

  if (noGuidesPublished && noPassingCandidates) {
    console.log("Completed successfully: no guides were published because no approved or passing candidates were available.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
