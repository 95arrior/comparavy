import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { guideTopics, type GuideTopic } from "@/data/guideTopics";
import {
  PRICING_NOTICE,
  assertGuideContentQuality,
  checkGuideQuality,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import {
  inferGuideLayoutTypeFromTopic,
  type GuideLayoutType,
} from "@/lib/guideTypes";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import type { Guide, GuideStatus } from "@/lib/guides";
import { scoreToolsForTopic } from "@/lib/topicScoring";

interface GeneratorOptions {
  readonly count: number;
  readonly type: GuideGenerationType;
  readonly publish: boolean;
}

export type GuideGenerationType = GuideLayoutType | "mixed";

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
    guideType: { type: "string", enum: ["tool-decision", "how-to", "income", "trend-led"] },
    type: { type: "string", enum: ["tool-decision", "how-to", "income", "trend-led"] },
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
    deviceIntent: { type: "string", enum: ["desktop", "mobile", "both"] },
    desktopUseCase: { type: "string" },
    mobileUseCase: { type: "string" },
    desktopSearchAngle: { type: "string" },
    mobileSearchAngle: { type: "string" },
    visualAssets: {
      type: "object",
      additionalProperties: false,
      properties: {
        hero: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", const: "hero" },
            alt: { type: "string" },
            promptOrDescription: { type: "string" },
            fileNameHint: { type: "string" },
          },
          required: ["type", "alt", "promptOrDescription", "fileNameHint"],
        },
        workflow: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", const: "workflow-diagram" },
            alt: { type: "string" },
            steps: { type: "array", items: { type: "string" } },
          },
          required: ["type", "alt", "steps"],
        },
        toolStack: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", const: "tool-stack" },
            alt: { type: "string" },
            tools: { type: "array", items: { type: "string" } },
          },
          required: ["type", "alt", "tools"],
        },
        beforeAfter: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", const: "before-after" },
            alt: { type: "string" },
            before: { type: "string" },
            after: { type: "string" },
          },
          required: ["type", "alt", "before", "after"],
        },
      },
    },
    quickAnswer: { type: "string" },
    quickDecision: { type: "string" },
    contentGap: { type: "string" },
    uniqueAngle: { type: "string" },
    aiOverviewAnswer: { type: "string" },
    quickVerdict: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          toolSlug: { type: "string" },
          toolName: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    toolsYouCanUse: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          toolSlug: { type: "string" },
          toolName: { type: "string" },
          why: { type: "string" },
        },
        required: ["toolSlug", "toolName", "why"],
      },
    },
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
    realityCheck: { type: "string" },
    skillNeeded: { type: "string" },
    firstStep: { type: "string" },
    commonMistakes: { type: "array", items: { type: "string" } },
    mistakesToAvoid: { type: "array", items: { type: "string" } },
    exampleWorkflow: { type: "string" },
    exampleResult: { type: "string" },
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
    faq: {
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

function resolveTopicGuideType(topic: GuideTopic): GuideLayoutType {
  return inferGuideLayoutTypeFromTopic({
    slug: topic.slug,
    title: topic.title,
    type: topic.type,
    searchIntent: topic.searchIntent,
    decisionQuestion: topic.decisionQuestion,
    uniqueAngle: topic.uniqueAngle,
    notes: topic.notes,
  });
}

function parseGuideType(value: string | undefined): GuideGenerationType {
  if (!value || value === "mixed") {
    return "mixed";
  }

  if (
    value === "tool-decision" ||
    value === "how-to" ||
    value === "income" ||
    value === "trend-led" ||
    value === "practical" ||
    value === "evergreen"
  ) {
    return value === "practical" || value === "evergreen" ? "tool-decision" : value;
  }

  throw new Error(
    `Invalid --type value: ${value}. Use tool-decision, how-to, income, trend-led, mixed, practical, or evergreen.`,
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
  const classified = available.map((topic) => ({
    topic,
    guideType: resolveTopicGuideType(topic),
  }));

  const byType = {
    "how-to": classified.filter((entry) => entry.guideType === "how-to"),
    "tool-decision": classified.filter((entry) => entry.guideType === "tool-decision"),
    income: classified.filter((entry) => entry.guideType === "income"),
    "trend-led": classified.filter((entry) => entry.guideType === "trend-led"),
  } as const;

  if (type !== "mixed") {
    return classified
      .filter((entry) => entry.guideType === type)
      .map((entry) => entry.topic)
      .slice(0, count);
  }

  const selected: GuideTopic[] = [];
  const seenSlugs = new Set<string>();
  const preferredOrder: GuideLayoutType[] = ["how-to", "tool-decision", "income", "trend-led"];

  function takeNext(entries: readonly { readonly topic: GuideTopic }[]): GuideTopic | undefined {
    for (const entry of entries) {
      if (!seenSlugs.has(entry.topic.slug)) {
        seenSlugs.add(entry.topic.slug);
        return entry.topic;
      }
    }

    return undefined;
  }

  for (const guideType of preferredOrder) {
    if (selected.length >= count) {
      break;
    }

    const next = takeNext(byType[guideType]);

    if (next) {
      selected.push(next);
    }
  }

  while (selected.length < count) {
    const next = available.find((topic) => !seenSlugs.has(topic.slug));

    if (!next) {
      break;
    }

    seenSlugs.add(next.slug);
    selected.push(next);
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
  const guideType = resolveTopicGuideType(topic);
  const quickAnswer =
    guideType === "how-to"
      ? `Start by defining the exact output you need for ${topic.searchIntent}, then use ${first.tool.name} for the first pass, ${second.tool.name} to refine the result, and ${third.tool.name} for a final review when you want a different workflow.`
      : `${first.tool.name} is the best starting point for ${topic.searchIntent} because it matches the core workflow most closely. Use ${second.tool.name} if its setup or output style fits your situation better, and compare ${third.tool.name} when you need a different balance of speed, control, and review effort.`;
  const quickDecision =
    guideType === "trend-led"
      ? `Choose ${first.tool.name} when you want the most practical fit for ${topic.searchIntent}; compare ${second.tool.name} if you want a different workflow, and keep ${third.tool.name} in view if you need another option to test.`
      : quickAnswer;
  const steps = [
    {
      title: "Define the outcome",
      detail: `Write down the exact output you want for ${topic.useCase} so the AI pass has a clear target.`,
      toolSlug: first.tool.slug,
      toolName: first.tool.name,
    },
    {
      title: "Run the first draft",
      detail: `Use ${first.tool.name} to handle the initial pass, then check whether the output matches your source material and audience.`,
      toolSlug: first.tool.slug,
      toolName: first.tool.name,
    },
    {
      title: "Refine the result",
      detail: `Switch to ${second.tool.name} when you need a cleaner rewrite, stronger reasoning, or a different output style.`,
      toolSlug: second.tool.slug,
      toolName: second.tool.name,
    },
    {
      title: "Review before sharing",
      detail: `Use ${third.tool.name} or a manual review to catch missing context, awkward phrasing, and factual slips before you publish or send anything.`,
      toolSlug: third.tool.slug,
      toolName: third.tool.name,
    },
  ];
  const toolsYouCanUse = recommendations.slice(0, 3).map(({ tool, reasons }) => ({
    toolSlug: tool.slug,
    toolName: tool.name,
    why: reasons[0] ?? `${tool.name} is relevant for ${topic.searchIntent}.`,
  }));
  const commonMistakes = [
    `Skipping the source review before you rely on AI output for ${topic.searchIntent}.`,
    `Using only one tool and missing a better fit for a later step.`,
    "Publishing or sending the output before checking it against the original inputs.",
  ];
  const mistakesToAvoid = [
    `Do not treat ${first.tool.name} as a final answer without checking the result.`,
    `Do not use ${second.tool.name} or ${third.tool.name} without confirming the workflow still matches your source material.`,
    "Do not skip review if the output will reach clients, customers, or classmates.",
  ];
  const realityCheck =
    guideType === "income"
      ? "AI can help you package and deliver work faster, but it does not guarantee clients, revenue, or repeat demand."
      : "AI can speed up the work, but the user still has to review facts, shape the final result, and decide whether the workflow fits the job.";
  const skillNeeded =
    guideType === "income"
      ? `You need basic prompt writing, simple editing, and a clear understanding of the service you want to sell.`
      : `You need enough familiarity with ${topic.searchIntent} to judge whether the output is accurate and useful.`;
  const firstStep = `Start with one real example of ${topic.useCase} and compare the output against your own standard before you scale the workflow.`;
  const exampleWorkflow = `A simple workflow is: collect the source material, ask ${first.tool.name} for the first draft, then use ${second.tool.name} or ${third.tool.name} to tighten the language and check the final result.`;
  const exampleResult = `The final result should be a clearer, shorter, and more usable version of the original material, with the main ideas preserved and the obvious errors removed.`;
  const deviceIntent: Guide["deviceIntent"] = "both";
  const desktopUseCase = `Best on desktop when you want to compare tools, keep source material open, and edit the output in a wider workspace.`;
  const mobileUseCase = `Best on mobile when you need a fast first pass, a quick summary, or a lightweight edit while away from your desk.`;
  const desktopSearchAngle = `Desktop readers usually want a deeper comparison, file handling, and a more deliberate review workflow.`;
  const mobileSearchAngle = `Mobile readers usually want a short answer first, then a quick next step they can finish in a few taps.`;
  const visualAssets = {
    hero: {
      type: "hero" as const,
      alt: `${topic.title} guide visual`,
      promptOrDescription: `Editorial guide artwork for ${topic.searchIntent} with a clean, problem-solving feel.`,
      fileNameHint: topic.slug,
    },
    workflow: {
      type: "workflow-diagram" as const,
      alt: `${topic.title} workflow diagram`,
      steps: [
        "Problem or source material",
        "AI draft or comparison pass",
        "Human review and final result",
      ],
    },
    toolStack: {
      type: "tool-stack" as const,
      alt: `${topic.title} recommended tool stack`,
      tools: recommendations.slice(0, 3).map(({ tool }) => tool.name),
    },
    beforeAfter: {
      type: "before-after" as const,
      alt: `${topic.title} before and after comparison`,
      before: `Before: manual work and scattered notes for ${topic.searchIntent}.`,
      after: `After: a faster workflow that leaves you with a clear, checked result.`,
    },
  };
  const faqs = [
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
  ] as const;
  const metaDescription =
    guideType === "how-to"
      ? `Learn how to ${topic.searchIntent}. See the workflow, tools you can use, and the safest first step.`
      : guideType === "income"
        ? `Use AI to support this workflow without hype. See the realistic steps, skill needed, and tools that help you deliver faster.`
        : guideType === "trend-led"
          ? `Compare current AI tool options for ${topic.audience}. See practical fit, tradeoffs, and a clear decision path.`
          : `Compare AI tools for ${topic.audience} focused on ${topic.searchIntent}. See practical fit, tradeoffs, and a free-first decision path.`;

  return {
    slug: topic.slug,
    title: topic.title,
    guideType,
    type: guideType,
    metaTitle: `${topic.title} | Comparavy`,
    metaDescription,
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
    deviceIntent,
    desktopUseCase,
    mobileUseCase,
    desktopSearchAngle,
    mobileSearchAngle,
    visualAssets,
    quickAnswer,
    quickDecision,
    contentGap: topic.contentGap,
    uniqueAngle: topic.uniqueAngle,
    aiOverviewAnswer: topic.aiOverviewAnswer,
    quickVerdict: quickAnswer,
    steps,
    toolsYouCanUse,
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
    faqs,
    faq: faqs,
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
    realityCheck,
    skillNeeded,
    firstStep,
    commonMistakes,
    mistakesToAvoid,
    exampleWorkflow,
    exampleResult,
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
        'Improve the supplied Comparavy guide draft for clarity and decision usefulness. Preserve every factual catalog statement, selected tool slug, guideType, type, primaryKeyword, keyword arrays, audience, searchIntent, userPain, decisionQuestion, contentGap, uniqueAngle, aiOverviewAnswer, quickAnswer, quickDecision, steps, toolsYouCanUse, deviceIntent, desktopUseCase, mobileUseCase, desktopSearchAngle, mobileSearchAngle, visualAssets, realityCheck, skillNeeded, firstStep, commonMistakes, mistakesToAvoid, exampleWorkflow, exampleResult, affiliate disclosures, pricing caveats, status, freshness, qualityScore, and dates. Keep at least five key takeaways, three decision-path options phrased as clear "If you need X, choose Y" decisions, and four FAQs. Explicitly address the audience, use case, budget approach, and skill level. Do not invent tool testing, performance claims, exact current prices, guaranteed income claims, or breaking-news style claims. pricingNote and pricingCaveat must remain exactly: Pricing can change. Check the official site before subscribing.',
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
