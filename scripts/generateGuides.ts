import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { guideTopics, type GuideTopic, type GuideType } from "@/data/guideTopics";
import {
  PRICING_NOTICE,
  assertGuideContentQuality,
  checkGuideQuality,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import type { Guide, GuideStatus } from "@/lib/guides";
import { scoreToolsForTopic } from "@/lib/topicScoring";

interface GeneratorOptions {
  readonly count: number;
  readonly type: GuideGenerationType;
  readonly publish: boolean;
}

export type GuideGenerationType = GuideType | "mixed";

interface ResponsesResult {
  readonly output_text?: string;
  readonly output?: readonly {
    readonly content?: readonly {
      readonly type?: string;
      readonly text?: string;
    }[];
  }[];
}

export const GUIDES_DIRECTORY = path.join(process.cwd(), "content", "guides");
const MIN_RECOMMENDED_TOOLS = 3;
const MAX_RECOMMENDED_TOOLS = 5;

interface SkippedGuideTopic {
  readonly slug: string;
  readonly reason: string;
}

const GUIDE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    guideType: { type: "string", enum: ["practical", "income", "trend-led", "evergreen"] },
    type: { type: "string", enum: ["practical", "income", "trend-led", "evergreen"] },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    category: { type: "string" },
    persona: { type: "string" },
    useCase: { type: "string" },
    budgetAngle: { type: "string" },
    skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    primaryKeyword: { type: "string" },
    secondaryKeywords: { type: "array", items: { type: "string" } },
    longTailKeywords: { type: "array", items: { type: "string" } },
    audience: { type: "string" },
    searchIntent: { type: "string" },
    userPain: { type: "string" },
    decisionQuestion: { type: "string" },
    contentGap: { type: "string" },
    uniqueAngle: { type: "string" },
    aiOverviewAnswer: { type: "string" },
    quickVerdict: { type: "string" },
    keyTakeaways: { type: "array", items: { type: "string" } },
    bestPicksBySituation: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          situation: { type: "string" },
          toolSlug: { type: "string" },
          toolName: { type: "string" },
          why: { type: "string" },
        },
        required: ["situation", "toolSlug", "toolName", "why"],
      },
    },
    recommendedToolSlugs: { type: "array", items: { type: "string" } },
    recommendedTools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          toolSlug: { type: "string" },
          toolName: { type: "string" },
          summary: { type: "string" },
          bestFor: { type: "string" },
          avoidIf: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          tradeoffs: { type: "array", items: { type: "string" } },
          toolPagePath: { type: "string" },
        },
        required: [
          "toolSlug",
          "toolName",
          "summary",
          "bestFor",
          "avoidIf",
          "strengths",
          "tradeoffs",
          "toolPagePath",
        ],
      },
    },
    comparisonRows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          toolSlug: { type: "string" },
          toolName: { type: "string" },
          bestFor: { type: "string" },
          freePlan: { type: "boolean" },
          easeOfUse: { type: "string" },
          whyConsider: { type: "string" },
          watchFor: { type: "string" },
        },
        required: [
          "toolSlug",
          "toolName",
          "bestFor",
          "freePlan",
          "easeOfUse",
          "whyConsider",
          "watchFor",
        ],
      },
    },
    decisionPath: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          situation: { type: "string" },
          recommendation: { type: "string" },
          reason: { type: "string" },
        },
        required: ["situation", "recommendation", "reason"],
      },
    },
    whoShouldUseThis: { type: "array", items: { type: "string" } },
    whoShouldAvoidThis: { type: "array", items: { type: "string" } },
    moneySavingTips: { type: "array", items: { type: "string" } },
    pricingNote: { type: "string" },
    pricingCaveat: { type: "string" },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
    finalVerdict: { type: "string" },
    affiliateDisclosureNote: { type: "string" },
    affiliateDisclosure: { type: "string" },
    ctaToFinder: { type: "string" },
    finderCTA: { type: "string" },
    visualSummary: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string" },
        points: { type: "array", items: { type: "string" } },
      },
      required: ["headline", "points"],
    },
    status: { type: "string", enum: ["draft", "published"] },
    freshness: { type: "string", enum: ["evergreen", "current", "seasonal"] },
    qualityScore: { type: "number" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "slug",
    "title",
    "guideType",
    "type",
    "metaTitle",
    "metaDescription",
    "category",
    "persona",
    "useCase",
    "budgetAngle",
    "skillLevel",
    "primaryKeyword",
    "secondaryKeywords",
    "longTailKeywords",
    "audience",
    "searchIntent",
    "userPain",
    "decisionQuestion",
    "contentGap",
    "uniqueAngle",
    "aiOverviewAnswer",
    "quickVerdict",
    "keyTakeaways",
    "bestPicksBySituation",
    "recommendedToolSlugs",
    "recommendedTools",
    "comparisonRows",
    "decisionPath",
    "whoShouldUseThis",
    "whoShouldAvoidThis",
    "moneySavingTips",
    "pricingNote",
    "pricingCaveat",
    "faqs",
    "finalVerdict",
    "affiliateDisclosureNote",
    "affiliateDisclosure",
    "ctaToFinder",
    "finderCTA",
    "visualSummary",
    "status",
    "freshness",
    "qualityScore",
    "createdAt",
    "updatedAt",
  ],
} as const;

function sortTopicsByPriority(left: GuideTopic, right: GuideTopic): number {
  return right.priority - left.priority || left.slug.localeCompare(right.slug);
}

function parseGuideType(value: string | undefined): GuideGenerationType {
  if (!value || value === "mixed") {
    return "mixed";
  }

  if (
    value === "practical" ||
    value === "income" ||
    value === "trend-led" ||
    value === "evergreen"
  ) {
    return value;
  }

  throw new Error(
    `Invalid --type value: ${value}. Use practical, income, trend-led, evergreen, or mixed.`,
  );
}

function parseOptions(args: readonly string[]): GeneratorOptions {
  let count = 1;
  let type: GuideGenerationType = "mixed";
  let publish = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--publish") {
      publish = true;
      continue;
    }

    if (argument === "--count") {
      const rawCount = args[index + 1];
      const parsedCount = Number(rawCount);

      if (!Number.isInteger(parsedCount) || parsedCount < 0) {
        throw new Error("--count must be a non-negative integer.");
      }

      count = parsedCount;
      index += 1;
      continue;
    }

    if (argument === "--type") {
      type = parseGuideType(args[index + 1]);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  return { count, type, publish };
}

export interface GuideSelectionOptions {
  readonly count: number;
  readonly type: GuideGenerationType;
  readonly existingSlugs?: ReadonlySet<string>;
}

export function selectGuideTopics({
  count,
  type,
  existingSlugs = new Set<string>(),
}: GuideSelectionOptions): readonly GuideTopic[] {
  if (count <= 0) {
    return [];
  }

  const available = guideTopics
    .filter((topic) => topic.status === "active" && !existingSlugs.has(topic.slug))
    .sort(sortTopicsByPriority);

  const practical = available.filter((topic) => topic.type === "practical");
  const income = available.filter((topic) => topic.type === "income");
  const trendLed = available.filter((topic) => topic.type === "trend-led");
  const evergreen = available.filter((topic) => topic.type === "evergreen");
  const practicalOrIncome = available.filter(
    (topic) => topic.type === "practical" || topic.type === "income",
  );

  if (type !== "mixed") {
    return available.filter((topic) => topic.type === type).slice(0, count);
  }

  if (count === 1) {
    return available.slice(0, 1);
  }

  const selected: GuideTopic[] = [];
  const practicalCursor = [...practical];
  const incomeCursor = [...income];
  const practicalOrIncomeCursor = [...practicalOrIncome];
  const trendLedCursor = [...trendLed];
  const evergreenCursor = [...evergreen];

  if (count === 2) {
    if (practicalCursor[0] && (!incomeCursor[0] || practicalCursor[0].priority >= incomeCursor[0].priority)) {
      selected.push(practicalCursor.shift() as GuideTopic);
    } else if (incomeCursor[0]) {
      selected.push(incomeCursor.shift() as GuideTopic);
    } else if (practicalOrIncomeCursor[0]) {
      selected.push(practicalOrIncomeCursor.shift() as GuideTopic);
    } else if (evergreenCursor[0]) {
      selected.push(evergreenCursor.shift() as GuideTopic);
    }

    if (trendLedCursor[0]) {
      selected.push(trendLedCursor.shift() as GuideTopic);
    }
  }

  while (
    selected.length < count &&
    (practicalCursor.length > 0 ||
      incomeCursor.length > 0 ||
      trendLedCursor.length > 0 ||
      evergreenCursor.length > 0)
  ) {
    const nextPractical = practicalCursor[0];
    const nextIncome = incomeCursor[0];
    const nextTrend = trendLedCursor[0];
    const nextEvergreen = evergreenCursor[0];
    const candidates = [nextPractical, nextIncome, nextTrend, nextEvergreen].filter(
      (topic): topic is GuideTopic => Boolean(topic),
    );
    const next = candidates.sort(sortTopicsByPriority)[0];

    if (!next) {
      break;
    }

    selected.push(next);

    if (next.type === "practical") {
      practicalCursor.shift();
      continue;
    }

    if (next.type === "income") {
      incomeCursor.shift();
      continue;
    }

    if (next.type === "trend-led") {
      trendLedCursor.shift();
      continue;
    }

    evergreenCursor.shift();
  }

  return selected.slice(0, count);
}

export function createTemplateGuide(
  topic: GuideTopic,
  status: GuideStatus,
  avoidToolSlugs: ReadonlySet<string> = new Set<string>(),
): Guide {
  const topicExcluded = new Set(topic.excludedToolSlugs ?? []);
  const recommendations = scoreToolsForTopic(topic)
    .filter(({ tool }) => !topicExcluded.has(tool.slug) && !avoidToolSlugs.has(tool.slug))
    .slice(0, MAX_RECOMMENDED_TOOLS);
  const [first, second, third] = recommendations;
  const date = new Date().toISOString().slice(0, 10);
  const disclosureNote =
    "Some Comparavy links may be affiliate links. Review the affiliate disclosure and official site before subscribing.";
  const finderCTA = "Use the Comparavy finder at /finder for a recommendation matched to your workflow and budget.";

  if (!first || !second || !third) {
    throw new Error(
      `Not enough catalog matches for ${topic.slug}. Found ${recommendations.length}; ${MIN_RECOMMENDED_TOOLS} are required.`,
    );
  }

  const recommendedToolSlugs = recommendations.map(({ tool }) => tool.slug);
  const qualityScore = 92;

  return {
    slug: topic.slug,
    title: topic.title,
    guideType: topic.type,
    type: topic.type,
    metaTitle: `${topic.title} | Comparavy`,
    metaDescription:
      topic.type === "trend-led"
        ? `Compare current AI tool options for ${topic.audience}. See practical fit, tradeoffs, and a clear decision path.`
        : `Compare AI tools for ${topic.audience} focused on ${topic.searchIntent}. See practical fit, tradeoffs, and a free-first decision path.`,
    category: topic.category,
    persona: topic.persona,
    useCase: topic.useCase,
    budgetAngle: topic.budgetAngle,
    skillLevel: topic.skillLevel,
    primaryKeyword: topic.primaryKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    longTailKeywords: topic.longTailKeywords,
    audience: topic.audience,
    searchIntent: topic.searchIntent,
    userPain: topic.userPain,
    decisionQuestion: topic.decisionQuestion,
    contentGap: topic.contentGap,
    uniqueAngle: topic.uniqueAngle,
    aiOverviewAnswer: topic.aiOverviewAnswer,
    quickVerdict: `${first.tool.name} is the best starting point for ${topic.searchIntent} because it matches the core workflow most closely. Use ${second.tool.name} if its setup or output style fits your situation better, and compare ${third.tool.name} when you need a different balance of speed, control, and review effort.`,
    keyTakeaways: [
      `${first.tool.name} leads this shortlist because it is closely aligned with ${topic.searchIntent} for ${topic.audience}.`,
      `${second.tool.name} and ${third.tool.name} are useful alternatives when your preferred editing, research, or setup workflow changes.`,
      topic.userPain,
      topic.contentGap,
      topic.budgetAngle,
      "Review generated output and confirm tool features on the official site before committing to a workflow.",
    ],
    bestPicksBySituation: recommendations.slice(0, 3).map(({ tool, reasons }, index) => ({
      situation:
        index === 0
          ? `If you need the most direct answer to: ${topic.decisionQuestion}`
          : `If your priority is ${tool.bestFor[0]?.toLowerCase() ?? "a different workflow"}`,
      toolSlug: tool.slug,
      toolName: tool.name,
      why: reasons[0] ?? `${tool.name} is a relevant catalog match for this workflow.`,
    })),
    recommendedToolSlugs,
    recommendedTools: recommendations.map(({ tool, reasons }) => ({
      toolSlug: tool.slug,
      toolName: tool.name,
      summary: `${tool.name} fits ${topic.searchIntent} when ${tool.bestFor[0]?.toLowerCase() ?? "the workflow matches its strengths"}.`,
      bestFor: tool.bestFor[0] ?? topic.searchIntent,
      avoidIf: tool.avoidIf[0] ?? tool.notFor[0] ?? "Avoid it if the workflow does not match your source material or review process.",
      strengths: tool.primaryTags.slice(0, 4),
      tradeoffs: tool.notFor.slice(0, 3),
      toolPagePath: `/tools/${tool.slug}`,
    })),
    comparisonRows: recommendations.map(({ tool, reasons }) => ({
      toolSlug: tool.slug,
      toolName: tool.name,
      bestFor: tool.bestFor[0] ?? topic.searchIntent,
      freePlan: tool.freePlan,
      easeOfUse: `${tool.setupDifficulty} setup; ease ${tool.easeScore}/10 in the Comparavy catalog`,
      whyConsider: reasons[0] ?? "Relevant match for this workflow.",
      watchFor: tool.notFor[0] ?? "Confirm it fits the exact workflow before adopting it.",
    })),
    decisionPath: [
      {
        situation: `If your goal is ${topic.searchIntent}, start with the most direct shortlisted workflow.`,
        recommendation: first.tool.name,
        reason: first.reasons[0] ?? "It is the leading catalog match for this guide.",
      },
      {
        situation: `If ${second.tool.name}'s fit for ${second.tool.bestFor[0]?.toLowerCase() ?? "an alternative workflow"} matters most, compare this alternative.`,
        recommendation: second.tool.name,
        reason: second.reasons[0] ?? "It offers a relevant alternative workflow.",
      },
      {
        situation: `If ${third.tool.name}'s fit for ${third.tool.bestFor[0]?.toLowerCase() ?? "another option to compare"} is relevant, include this option in your test.`,
        recommendation: third.tool.name,
        reason: third.reasons[0] ?? "It broadens the comparison for this use case.",
      },
    ],
    moneySavingTips: [
      "Test one representative project before paying for a longer-term workflow.",
      "Use a listed free plan when it covers the experiment you need to run.",
      "Avoid overlapping subscriptions until one tool has proven where it saves effort.",
    ],
    pricingNote: PRICING_NOTICE,
    pricingCaveat: PRICING_NOTICE,
    faqs: [
      {
        question: `Which tool should ${topic.audience} try first?`,
        answer: `${first.tool.name} is the first tool to evaluate for this use case based on the current Comparavy catalog match. Test it on a real project and compare the result with your requirements.`,
      },
      {
        question: "Should I choose a free plan before subscribing?",
        answer:
          "A free-plan workflow is useful when it lets you test output quality and setup effort. Confirm current limits and plan details on the official site.",
      },
      {
        question: "Can AI output be published without review?",
        answer:
          "No. Review accuracy, brand fit, permissions, and final presentation before publishing or sharing client-facing work.",
      },
      {
        question: `When should I compare ${second.tool.name} with ${first.tool.name}?`,
        answer: `Compare ${second.tool.name} when its fit for ${second.tool.bestFor[0]?.toLowerCase() ?? "your alternate workflow"} matters more than the first-choice workflow. Use the same realistic project so the decision is based on output and effort.`,
      },
    ],
    whoShouldUseThis: [
      `${topic.audience} who need ${topic.searchIntent}.`,
      `Readers asking: ${topic.decisionQuestion}`,
      `Teams that understand this pain point: ${topic.userPain}`,
    ],
    whoShouldAvoidThis: [
      "Readers who need legal, financial, or compliance advice rather than tool comparison.",
      "Users who want guaranteed outcomes instead of a workflow shortlist to evaluate.",
    ],
    finalVerdict: `For ${topic.persona}, start by testing ${first.tool.name} on one realistic assignment: ${topic.useCase}. Compare it with ${second.tool.name} if you need a different workflow, respect the stated budget approach, and choose only after reviewing actual output, setup effort, and current official plan details.`,
    ctaToFinder: finderCTA,
    finderCTA,
    visualSummary: {
      headline: `A practical starting route for ${topic.audience}`,
      points: [
        `Start with ${first.tool.name}`,
        `Compare ${second.tool.name} for an alternate workflow`,
        "Run a real project test before subscribing",
      ],
    },
    affiliateDisclosureNote: disclosureNote,
    affiliateDisclosure: disclosureNote,
    freshness: topic.freshness,
    qualityScore,
    status,
    createdAt: date,
    updatedAt: date,
  };
}

function tryCreateTemplateGuide(
  topic: GuideTopic,
  status: GuideStatus,
  avoidToolSlugs: ReadonlySet<string>,
): { readonly guide?: Guide; readonly skipped?: SkippedGuideTopic } {
  try {
    return { guide: createTemplateGuide(topic, status, avoidToolSlugs) };
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
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return undefined;
}

async function refineWithOpenAI(template: Guide): Promise<Guide> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return template;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
      body: JSON.stringify({
      model: process.env.OPENAI_GUIDE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      instructions:
        'Improve the supplied Comparavy guide draft for clarity and decision usefulness. Preserve every factual catalog statement, selected tool slug, guideType, type, primaryKeyword, keyword arrays, audience, searchIntent, userPain, decisionQuestion, contentGap, uniqueAngle, aiOverviewAnswer, affiliate disclosures, pricing caveats, status, freshness, qualityScore, and dates. Keep at least five key takeaways, three decision-path options phrased as clear "If you need X, choose Y" decisions, and four FAQs. Explicitly address the audience, use case, budget approach, and skill level. Do not invent tool testing, performance claims, exact current prices, guaranteed income claims, or breaking-news style claims. pricingNote and pricingCaveat must remain exactly: Pricing can change. Check the official site before subscribing.',
      input: JSON.stringify(template),
      text: {
        format: {
          type: "json_schema",
          name: "comparavy_guide",
          strict: true,
          schema: GUIDE_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const result = (await response.json()) as ResponsesResult;
  const text = readOutputText(result);

  if (!text) {
    throw new Error("OpenAI response did not contain guide text.");
  }

  const generated = JSON.parse(text) as Guide;
  const refined = {
    ...generated,
    slug: template.slug,
    title: template.title,
    guideType: template.guideType,
    type: template.type,
    metaTitle: template.metaTitle,
    metaDescription: template.metaDescription,
    category: template.category,
    persona: template.persona,
    useCase: template.useCase,
    budgetAngle: template.budgetAngle,
    skillLevel: template.skillLevel,
    primaryKeyword: template.primaryKeyword,
    secondaryKeywords: template.secondaryKeywords,
    longTailKeywords: template.longTailKeywords,
    audience: template.audience,
    searchIntent: template.searchIntent,
    userPain: template.userPain,
    decisionQuestion: template.decisionQuestion,
    contentGap: template.contentGap,
    uniqueAngle: template.uniqueAngle,
    aiOverviewAnswer: template.aiOverviewAnswer,
    recommendedToolSlugs: template.recommendedToolSlugs,
    comparisonRows: template.comparisonRows,
    pricingNote: PRICING_NOTICE,
    pricingCaveat: PRICING_NOTICE,
    affiliateDisclosureNote: template.affiliateDisclosureNote,
    affiliateDisclosure: template.affiliateDisclosure,
    finderCTA: template.finderCTA,
    freshness: template.freshness,
    qualityScore: template.qualityScore,
    status: template.status,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };

  assertGuideContentQuality(refined, template.slug);
  return refined;
}

export async function getExistingGuides(): Promise<Guide[]> {
  try {
    await access(GUIDES_DIRECTORY);
  } catch {
    return [];
  }

  const files = await readdir(GUIDES_DIRECTORY);
  const guides: Guide[] = [];

  for (const file of files.filter((entry) => entry.endsWith(".json"))) {
    const value: unknown = JSON.parse(
      await readFile(path.join(GUIDES_DIRECTORY, file), "utf8"),
    );
    assertGuideContentQuality(value, file);
    guides.push(value);
  }

  return guides;
}

function logQuality(slug: string, result: GuideQualityResult): void {
  console.log(
    `[${slug}] Quality score: ${result.score}/100 (${result.passed ? "PASS" : "FAIL"})`,
  );

  for (const warning of result.warnings) {
    console.log(`[${slug}] Warning: ${warning}`);
  }

  for (const blocker of result.blockers) {
    console.log(`[${slug}] Blocker: ${blocker}`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const status: GuideStatus = options.publish ? "published" : "draft";
  logGuideTopicToolSlugWarnings();
  const existingGuides = await getExistingGuides();
  const existingSlugs = new Set(existingGuides.map((guide) => guide.slug));
  const candidateTopics = selectGuideTopics({
    count: guideTopics.length,
    type: options.type,
    existingSlugs,
  });
  let created = 0;
  let published = 0;
  let drafts = 0;
  let failedQuality = 0;
  const usedToolSlugs = new Set<string>();
  const skippedTopics: SkippedGuideTopic[] = [];

  await mkdir(GUIDES_DIRECTORY, { recursive: true });

  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set; generating safe catalog/template-based guide drafts only.");
  }

  for (const topic of candidateTopics) {
    if (created >= options.count) {
      break;
    }

    const { guide: template, skipped } = tryCreateTemplateGuide(topic, status, usedToolSlugs);

    if (!template) {
      if (skipped) {
        skippedTopics.push(skipped);
      }
      continue;
    }

    let guide = template;

    if (process.env.OPENAI_API_KEY) {
      try {
        guide = await refineWithOpenAI(template);
      } catch (error) {
        console.warn(
          `OpenAI refinement failed for ${topic.slug}; writing validated template instead. ${String(error)}`,
        );
      }
    }

    assertGuideContentQuality(guide, topic.slug);
    const result = checkGuideQuality(guide, existingGuides);
    logQuality(guide.slug, result);

    if (!result.passed) {
      failedQuality += 1;
      guide = { ...guide, status: "draft" };

      if (options.publish) {
        console.log(`[${guide.slug}] Publishing blocked; saving the guide as a draft.`);
      } else {
        console.log(`[${guide.slug}] Quality gate failed; retaining this guide as a draft.`);
      }
    }

    const filePath = path.join(GUIDES_DIRECTORY, `${guide.slug}.json`);
    await writeFile(filePath, `${JSON.stringify(guide, null, 2)}\n`, "utf8");
    existingGuides.push(guide);
    for (const slug of guide.recommendedToolSlugs) {
      usedToolSlugs.add(slug);
    }
    created += 1;

    if (guide.status === "published") {
      published += 1;
    } else {
      drafts += 1;
    }

    console.log(`Created ${guide.status} guide: ${guide.slug}`);
  }

  if (created < options.count) {
    console.log(
      `Created ${created} guide(s); no more valid unused configured topics were available for the requested count.`,
    );
  }

  if (skippedTopics.length > 0) {
    console.log("Skipped topics");
    for (const skipped of skippedTopics) {
      console.log(`[${skipped.slug}] ${skipped.reason}`);
    }
  }

  console.log(`Guide track: ${options.type}`);
  console.log(`Publishing enabled: ${options.publish ? "yes" : "no"}`);

  console.log("Generation summary");
  console.log(`Created: ${created}`);
  console.log(`Published: ${published}`);
  console.log(`Draft: ${drafts}`);
  console.log(`Failed quality: ${failedQuality}`);
  console.log(`Skipped topics: ${skippedTopics.length}`);

  if (options.count > 0 && created === 0) {
    console.error("No valid guide candidates could be generated.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
