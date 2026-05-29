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

export interface EditorialBrief {
  readonly guideType: GuideLayoutType;
  readonly targetReader: string;
  readonly searchIntent: string;
  readonly userPain: string;
  readonly realWorldScenario: string;
  readonly jobToBeDone: string;
  readonly primaryKeyword: string;
  readonly longTailKeywords: readonly string[];
  readonly deviceIntent: "desktop" | "mobile" | "both";
  readonly mobileScenario: string;
  readonly desktopScenario: string;
  readonly whatTheReaderNeedsInFirst100Words: string;
  readonly whatThisArticleMustNotDo: readonly string[];
  readonly coreWorkflow: readonly string[];
  readonly toolRoleMap: readonly { readonly toolSlug: string; readonly toolName: string; readonly role: string }[];
  readonly decisionCriteria: readonly string[];
  readonly contentGap: string;
  readonly uniqueAngle: string;
  readonly examplesToInclude: readonly string[];
  readonly commonMistakesToWarnAbout: readonly string[];
  readonly FAQQuestions: readonly string[];
  readonly internalLinks: readonly string[];
  readonly nextStepCTA: string;
}

export interface ArticleOutline {
  readonly guideType: GuideLayoutType;
  readonly title: string;
  readonly sections: readonly string[];
}

export const GUIDE_SCHEMA = {
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
    status: { type: "string" },
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
    guideType: topic.guideType,
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

function normalizeSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function lowerFirst(value: string): string {
  const text = normalizeSentence(value);

  if (text.length === 0) {
    return text;
  }

  return `${text[0].toLowerCase()}${text.slice(1)}`;
}

function ensurePeriod(value: string): string {
  const text = normalizeSentence(value);

  if (text.endsWith(".")) {
    return text;
  }

  return `${text}.`;
}

function excerpt(value: string): string {
  return normalizeSentence(value).replace(/\.$/, "");
}

function cleanCatalogPhrase(value: string, toolName?: string): string {
  let text = excerpt(value);

  if (!toolName) {
    return text;
  }

  const escapedName = toolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^${escapedName}\\s+fits\\s+`, "i"),
    new RegExp(`^${escapedName}\\s+is\\s+`, "i"),
    new RegExp(`^${escapedName}\\s+works\\s+best\\s+for\\s+`, "i"),
    new RegExp(`^${escapedName}\\s+`, "i"),
  ];

  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  text = text
    .replace(/^[a-z0-9 .'-]{2,48}\s+fits\s+workflows\s+that\s+need\s+/i, "")
    .replace(/^fits\s+workflows\s+that\s+need\s+/i, "")
    .replace(/^create\s+/i, "")
    .replace(/\s+/g, " ");

  return text.trim();
}

function topicInputFocus(topic: GuideTopic): string {
  const text = `${topic.searchIntent} ${topic.useCase} ${topic.contentGap} ${topic.uniqueAngle}`.toLowerCase();

  if (/\b(pdf|document|documents|notes|study|lecture|class)\b/.test(text)) {
    return "uploaded PDFs, class notes, and other source documents";
  }

  if (/\b(research|sources|citations|industry|market|competitor|brief)\b/.test(text)) {
    return "web sources with visible citations";
  }

  if (/\b(email|message|client email|rewrite)\b/.test(text)) {
    return "draft emails that need careful wording without changing meaning";
  }

  if (/\b(meeting|recap|action items|minutes)\b/.test(text)) {
    return "rough meeting notes and action items";
  }

  if (/\b(blog|carousel|social|post|caption|marketing|content)\b/.test(text)) {
    return "rough content that needs rewriting or repackaging";
  }

  if (/\b(plan|outline|brief|proposal|summary)\b/.test(text)) {
    return "an early draft that needs structure";
  }

  return topic.useCase;
}

function topicFaqTheme(topic: GuideTopic): "research" | "writing" | "content" | "meetings" | "general" {
  const text = `${topic.searchIntent} ${topic.useCase} ${topic.contentGap}`.toLowerCase();

  if (/\b(pdf|study|research|sources|citations|industry|market|brief)\b/.test(text)) {
    return "research";
  }

  if (/\b(email|rewrite|tone|english|message)\b/.test(text)) {
    return "writing";
  }

  if (/\b(blog|carousel|caption|content|marketing|post)\b/.test(text)) {
    return "content";
  }

  if (/\b(meeting|recap|action items|minutes|notes)\b/.test(text)) {
    return "meetings";
  }

  return "general";
}

function toolInputPhrase(tool: { readonly bestFor: readonly string[]; readonly name?: string }, topic: GuideTopic): string {
  return lowerFirst(cleanCatalogPhrase(tool.bestFor[0] ?? topic.searchIntent, tool.name));
}

function toolAvoidPhrase(tool: { readonly avoidIf: readonly string[]; readonly notFor: readonly string[]; readonly name?: string }): string {
  return lowerFirst(
    cleanCatalogPhrase(
      tool.avoidIf[0] ?? tool.notFor[0] ?? "the workflow does not match the tool",
      tool.name,
    ),
  );
}

function toolWatchForPhrase(tool: { readonly notFor: readonly string[]; readonly avoidIf: readonly string[] }, topic: GuideTopic): string {
  return ensurePeriod(
    `Watch for ${lowerFirst(tool.notFor[0] ?? tool.avoidIf[0] ?? "where the workflow starts to drift")}; this matters when the reader is ${topic.searchIntent}.`,
  );
}

function toolSummary(tool: { readonly name: string; readonly bestFor: readonly string[]; readonly useCases: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] }, topic: GuideTopic, position: number): string {
  const inputFocus = topicInputFocus(topic);
  const bestFor = toolInputPhrase(tool, topic);
  const outputFocus =
    tool.useCases[0] ??
    (position === 0
      ? "the first clean draft"
      : position === 1
        ? "the second-pass comparison"
        : "the final review");

  return ensurePeriod(
    `${tool.name} is strongest when you need ${bestFor} and want it tied to ${inputFocus}. It handles ${lowerFirst(outputFocus)} better than a generic assistant, but it is a weaker choice if you need ${toolAvoidPhrase(tool)}.`,
  );
}

function toolBestForText(tool: { readonly bestFor: readonly string[]; readonly useCases: readonly string[] }, topic: GuideTopic, position: number): string {
  const base = toolInputPhrase(tool, topic);

  if (position === 0) {
    return `${base} for ${topic.searchIntent}`;
  }

  if (position === 1) {
    return `${base} when you want a different workflow than the top pick`;
  }

  return `${base} when speed or a lighter setup matters more`;
}

function toolAvoidIfText(tool: { readonly avoidIf: readonly string[]; readonly notFor: readonly string[] }, topic: GuideTopic, position: number): string {
  const base = toolAvoidPhrase(tool);

  if (position === 0) {
    return `${base} if your real input is ${topicInputFocus(topic)}`;
  }

  if (position === 1) {
    return `${base} if your main need is the top tool's exact workflow`;
  }

  if (position === 2) {
    return `${base} if you need the most polished or source-grounded final pass`;
  }

  if (position === 3) {
    return `${base} if the task needs deeper review than a lightweight fallback can provide`;
  }

  return `${base} if the workflow depends on another tool's stronger input handling or editing controls`;
}

function toolWhyConsiderText(tool: { readonly name: string; readonly bestFor: readonly string[]; readonly useCases: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[]; readonly speedScore: number; readonly easeScore: number; readonly qualityScore: number }, topic: GuideTopic, position: number): string {
  const bestFor = toolInputPhrase(tool, topic);
  const outputFocus = position === 0
    ? `it is the clearest fit for ${topic.searchIntent}`
    : position === 1
      ? `it gives you a different tradeoff if you already know the first option is too narrow`
      : `it is a useful fallback when you want a faster or lighter setup`;

  return ensurePeriod(
    `${tool.name} is worth considering because ${outputFocus}. It is built for ${bestFor}, which makes it better than a generic chat tool when the input and output need to stay close to the use case.`,
  );
}

function quickVerdictForGuide(
  topic: GuideTopic,
  firstTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  secondTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  thirdTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
): string {
  const firstReason = toolInputPhrase(firstTool, topic);
  const secondReason = toolInputPhrase(secondTool, topic);
  const avoidReason = toolAvoidPhrase(firstTool);

  return ensurePeriod(
    `For ${topic.searchIntent}, start with ${firstTool.name} because it is best for ${firstReason}. Choose ${secondTool.name} when you need ${secondReason} and want a different workflow. Avoid ${firstTool.name} when ${avoidReason}; in that case ${thirdTool.name} is the better fallback.`,
  );
}

function quickAnswerForGuide(
  topic: GuideTopic,
  firstTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  secondTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  thirdTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  guideType: GuideLayoutType,
): string {
  if (guideType === "how-to") {
    const outcome = workflowVerbPhrase(topic);
    return ensurePeriod(
      `To ${outcome} with AI, start with the real source material, ask for one specific output, and check the draft before you share or publish it. ${firstTool.name} is the best first pass for this workflow, ${secondTool.name} helps when the format or source handling needs a second pass, and ${thirdTool.name} is better saved for cleanup after the facts are right.`,
    );
  }

  return quickVerdictForGuide(topic, firstTool, secondTool, thirdTool);
}

function howToTitleFromTopic(topic: GuideTopic): string {
  if (/^how to\b/i.test(topic.title)) {
    return topic.title;
  }

  const bestMatch = topic.title.match(/^best ai tools for\s+(.+)$/i);
  const base = bestMatch?.[1] ?? topic.searchIntent;
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
    .replace(/^extracting\b/i, "Extract")
    .replace(/\s+with ai$/i, "")
    .trim();

  return ensurePeriod(`How to ${lowerFirst(cleaned)} with AI`).replace(/\.$/, "");
}

function titleForGuide(topic: GuideTopic, guideType: GuideLayoutType): string {
  if (guideType === "how-to") {
    return howToTitleFromTopic(topic);
  }

  return topic.title;
}

function workflowVerbPhrase(topic: GuideTopic): string {
  return topic.searchIntent
    .replace(/^turning\b/i, "turn")
    .replace(/^summarizing\b/i, "summarize")
    .replace(/^summarising\b/i, "summarize")
    .replace(/^creating\b/i, "create")
    .replace(/^writing\b/i, "write")
    .replace(/^drafting\b/i, "draft")
    .replace(/^organizing\b/i, "organize")
    .replace(/^cleaning\b/i, "clean")
    .replace(/^making\b/i, "make")
    .replace(/^building\b/i, "build")
    .replace(/^finding\b/i, "find")
    .replace(/^polishing\b/i, "polish")
    .replace(/\s+with ai$/i, "")
    .trim();
}

function createCoreWorkflow(topic: GuideTopic, guideType: GuideLayoutType): string[] {
  const source = topicInputFocus(topic);
  const outcome = workflowVerbPhrase(topic);

  if (guideType === "how-to") {
    return [
      `Collect ${source} and remove anything the AI should not use.`,
      `Define the final output: what the reader needs to produce, send, post, study, or decide.`,
      `Use AI to create a first structured draft for ${outcome}.`,
      "Check names, numbers, sources, commitments, tone, and missing context against the original material.",
      "Polish the final result, save the reusable prompt, and choose the next tool only if the format or source type changes.",
    ];
  }

  return [
    `Confirm whether the work starts with ${source}, web research, media, or a blank draft.`,
    "Pick the tool whose strengths match the input type before comparing features.",
    "Compare output quality, source reliability, editing control, mobile speed, desktop depth, and review effort.",
    "Choose the simplest paid plan only after one real task proves the fit.",
  ];
}

function toolRole(tool: { readonly name: string; readonly category: string; readonly useCases: readonly string[] }, topic: GuideTopic, position: number): string {
  const useCase = tool.useCases[position % Math.max(1, tool.useCases.length)] ?? topic.searchIntent;

  if (position === 0) {
    return `first-pass help for ${lowerFirst(useCase)} from ${topicInputFocus(topic)}`;
  }

  if (position === 1) {
    return `second-pass support when the output needs ${lowerFirst(useCase)} or a different format`;
  }

  if (position === 2) {
    return `review, cleanup, or alternate wording after the main draft is checked`;
  }

  return `fallback support for ${lowerFirst(tool.category.replace(/-/g, " "))} tasks in this workflow`;
}

function createFaqQuestions(topic: GuideTopic, guideType: GuideLayoutType, firstToolName: string, secondToolName: string): string[] {
  if (guideType === "how-to") {
    return [
      `Can I use AI for ${topic.searchIntent} without losing important details?`,
      `What should I check before I use the AI result?`,
      `Is ${firstToolName} or ${secondToolName} better for this workflow?`,
      "What is the fastest mobile version of this workflow?",
    ];
  }

  return [
    `Which AI tool should I try first for ${topic.searchIntent}?`,
    `When should I choose ${secondToolName} instead of ${firstToolName}?`,
    "Which option is better on a phone?",
    "Which option is better for a longer desktop workflow?",
  ];
}

export function createEditorialBrief(
  topic: GuideTopic,
  guideType: GuideLayoutType,
  tools: readonly { readonly tool: { readonly slug: string; readonly name: string; readonly category: string; readonly useCases: readonly string[] } }[],
): EditorialBrief {
  const date = new Date().toISOString().slice(0, 10);
  const toolRoleMap = tools.slice(0, MAX_RECOMMENDED_TOOLS).map(({ tool }, index) => ({
    toolSlug: tool.slug,
    toolName: tool.name,
    role: toolRole(tool, topic, index),
  }));
  const firstTool = tools[0]?.tool.name ?? "the strongest matched tool";
  const secondTool = tools[1]?.tool.name ?? "the second matched tool";
  const deviceIntent = topic.deviceIntent ?? "both";

  return {
    guideType,
    targetReader: topic.audience,
    searchIntent: topic.searchIntent,
    userPain: topic.userPain,
    realWorldScenario: `${topic.audience} need ${topic.searchIntent} on a real task, not a generic tool roundup. Prepared ${date}.`,
    jobToBeDone: `${workflowVerbPhrase(topic)} into a result the reader can review and use.`,
    primaryKeyword: topic.primaryKeyword,
    longTailKeywords: topic.longTailKeywords,
    deviceIntent,
    mobileScenario: topic.mobileUseCase ?? "The reader needs a short answer, a quick draft, or a review step they can finish from a phone.",
    desktopScenario: topic.desktopUseCase ?? "The reader needs source material, AI output, and final editing space visible at the same time.",
    whatTheReaderNeedsInFirst100Words:
      guideType === "how-to"
        ? `A direct answer that explains the first action, the source material to prepare, and the review step needed for ${topic.searchIntent}.`
        : `A direct verdict naming the best starting tool, when to use the second choice, and when to avoid the top pick for ${topic.searchIntent}.`,
    whatThisArticleMustNotDo: [
      "Sound like a generic AI tool list.",
      "Use placeholder recommendation language.",
      "Promise guaranteed income, rankings, accuracy, engagement, or legal compliance.",
      "Invent exact current prices, fake testing, or unsupported product claims.",
      "Let tools replace the reader's review of source material.",
    ],
    coreWorkflow: createCoreWorkflow(topic, guideType),
    toolRoleMap,
    decisionCriteria: [
      "input type",
      "output format",
      "source reliability",
      "editing control",
      "mobile speed",
      "desktop depth",
      "review effort",
      "subscription risk",
    ],
    contentGap: topic.contentGap,
    uniqueAngle: topic.uniqueAngle,
    examplesToInclude: [
      `A before-and-after example for ${topic.searchIntent}.`,
      `A phone-friendly version using ${firstTool}.`,
      `A desktop workflow that compares ${firstTool} and ${secondTool}.`,
    ],
    commonMistakesToWarnAbout: [
      "Starting with a tool before defining the source material and output.",
      "Copying the first AI result without checking facts, names, dates, links, or commitments.",
      "Using the same prompt for every tool instead of matching the tool to its role.",
      "Turning a practical workflow into a broad ranking page.",
    ],
    FAQQuestions: createFaqQuestions(topic, guideType, firstTool, secondTool),
    internalLinks: ["/finder", "/guides", ...toolRoleMap.slice(0, 3).map((tool) => `/tools/${tool.toolSlug}`)],
    nextStepCTA: "Use the Comparavy finder at /finder for a recommendation matched to your workflow and budget.",
  };
}

export function createArticleOutline(brief: EditorialBrief, title: string): ArticleOutline {
  const sections = brief.guideType === "how-to"
    ? [
        "Quick Answer",
        "What you need",
        "Step-by-step workflow",
        "Best if you are on a computer",
        "Best if you are on your phone",
        "Tools you can use",
        "Example result",
        "Common mistakes",
        "FAQ",
        "Next step",
      ]
    : [
        "Quick Verdict",
        "Best Picks by Situation",
        "Comparison Table",
        "Which one should you choose?",
        "Tool Cards",
        "Who should use this",
        "Who should avoid this",
        "Final Verdict",
        "Finder CTA",
      ];

  return {
    guideType: brief.guideType,
    title,
    sections,
  };
}

function quickDecisionForGuide(
  topic: GuideTopic,
  firstTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  secondTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  thirdTool: { readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
): string {
  return ensurePeriod(
    `For ${topic.searchIntent}, choose ${firstTool.name} for ${toolInputPhrase(firstTool, topic)}. Choose ${secondTool.name} when you need ${toolInputPhrase(secondTool, topic)}. Choose ${thirdTool.name} when the main job is ${toolInputPhrase(thirdTool, topic)} or when you need a lighter alternative.`,
  );
}

function buildBestPicksBySituation(
  topic: GuideTopic,
  firstTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
  secondTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
  thirdTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
): { situation: string; toolSlug: string; toolName: string; why: string }[] {
  return [
    {
      situation: `If you already have ${topicInputFocus(topic)}, choose ${firstTool.tool.name}.`,
      toolSlug: firstTool.tool.slug,
      toolName: firstTool.tool.name,
      why: ensurePeriod(
        `${firstTool.tool.name} is the closest match because it is built for ${toolInputPhrase(firstTool.tool, topic)} and keeps the work tied to the original input.`,
      ),
    },
    {
      situation: `If you need ${topic.searchIntent} and want a different workflow, choose ${secondTool.tool.name}.`,
      toolSlug: secondTool.tool.slug,
      toolName: secondTool.tool.name,
      why: ensurePeriod(
        `${secondTool.tool.name} is the better second choice when you want ${toolInputPhrase(secondTool.tool, topic)} instead of the first tool's exact workflow.`,
      ),
    },
    {
      situation: `If you want the cleanest rewrite or the lightest review step, choose ${thirdTool.tool.name}.`,
      toolSlug: thirdTool.tool.slug,
      toolName: thirdTool.tool.name,
      why: ensurePeriod(
        `${thirdTool.tool.name} helps when you need ${toolInputPhrase(thirdTool.tool, topic)} and want a fallback that is easier to adapt on a phone or desktop.`,
      ),
    },
  ];
}

function buildDecisionPath(
  topic: GuideTopic,
  firstTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
  secondTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
  thirdTool: { readonly tool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] } ; readonly reasons: readonly string[] },
): { situation: string; recommendation: string; reason: string }[] {
  const path = [
    {
      situation: `If you already have ${topicInputFocus(topic)}, start with ${firstTool.tool.name}.`,
      recommendation: firstTool.tool.name,
      reason: ensurePeriod(
        `${firstTool.tool.name} is the most direct first pass because it is built for ${toolInputPhrase(firstTool.tool, topic)}.`,
      ),
    },
    {
      situation: `If you need a different source type or citation style, switch to ${secondTool.tool.name}.`,
      recommendation: secondTool.tool.name,
      reason: ensurePeriod(
        `${secondTool.tool.name} is the better alternative when ${toolInputPhrase(secondTool.tool, topic)} matters more than the top pick.`,
      ),
    },
    {
      situation: `If you need the final polish or the easiest follow-up pass, compare ${thirdTool.tool.name}.`,
      recommendation: thirdTool.tool.name,
      reason: ensurePeriod(
        `${thirdTool.tool.name} is useful when you want ${toolInputPhrase(thirdTool.tool, topic)} and do not want to overbuild the workflow.`,
      ),
    },
  ];

  if (topicInputFocus(topic) !== topic.useCase) {
    path.push({
      situation: "If you are working on a phone and need a quick answer, use the fastest or simplest option in the shortlist.",
      recommendation: secondTool.tool.name,
      reason: ensurePeriod(
        `${secondTool.tool.name} is usually the faster fallback when you need a readable result with less setup.`,
      ),
    });
  } else {
    path.push({
      situation: "If you are on a desktop and want a fuller comparison, keep all three options open and compare their output side by side.",
      recommendation: firstTool.tool.name,
      reason: ensurePeriod(
        `A desktop workflow makes it easier to compare ${firstTool.tool.name}, ${secondTool.tool.name}, and ${thirdTool.tool.name} against the same source material.`,
      ),
    });
  }

  return path;
}

function buildHowToSteps(
  topic: GuideTopic,
  firstTool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  secondTool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
  thirdTool: { readonly slug: string; readonly name: string; readonly bestFor: readonly string[]; readonly avoidIf: readonly string[]; readonly notFor: readonly string[] },
): { title: string; detail: string; toolSlug?: string; toolName?: string }[] {
  const outcome = workflowVerbPhrase(topic);
  const source = topicInputFocus(topic);

  return [
    {
      title: "Collect the source material",
      detail: `Put the real input in one place before opening a tool: ${source}, any required facts, the audience, and the format you need at the end. Remove private details you are not allowed to share.`,
    },
    {
      title: "Ask for the first usable version",
      detail: `Use ${firstTool.name} for a first pass that tries to ${outcome}. Ask it to preserve source facts, flag uncertainty, and organize the result into sections you can review.`,
      toolSlug: firstTool.slug,
      toolName: firstTool.name,
    },
    {
      title: "Check the answer before polishing",
      detail: `Compare the draft with the original material. Fix names, dates, numbers, unsupported claims, missing context, and tone before you ask for nicer wording.`,
    },
    {
      title: "Change the format only after the facts are right",
      detail: `Use ${secondTool.name} when the verified draft needs a different format, structure, or source-aware second pass. Keep the same facts so the rewrite does not drift from the original.`,
      toolSlug: secondTool.slug,
      toolName: secondTool.name,
    },
    {
      title: "Finish with a human review",
      detail: `Use ${thirdTool.name} for cleanup only after the main work is checked. Read the final result as the recipient would: on the device, in the app, or in the document where it will actually be used.`,
      toolSlug: thirdTool.slug,
      toolName: thirdTool.name,
    },
  ];
}

function buildHowToDecisionPath(
  topic: GuideTopic,
  firstTool: { readonly name: string },
  secondTool: { readonly name: string },
  thirdTool: { readonly name: string },
): { situation: string; recommendation: string; reason: string }[] {
  return [
    {
      situation: `If you already have ${topicInputFocus(topic)}, start with ${firstTool.name}.`,
      recommendation: firstTool.name,
      reason: `${firstTool.name} is the first-pass choice when the input is ready and the main job is to structure, summarize, draft, or clean it into a usable result.`,
    },
    {
      situation: `If the output needs a different format after the facts are checked, switch to ${secondTool.name}.`,
      recommendation: secondTool.name,
      reason: `${secondTool.name} is better for the second pass when the job changes from drafting to formatting, layout, or a different presentation style.`,
    },
    {
      situation: `If the result is accurate but still rough, use ${thirdTool.name}.`,
      recommendation: thirdTool.name,
      reason: `${thirdTool.name} fits the final cleanup step because the main source work is already done.`,
    },
    {
      situation: "If you are on your phone, keep the task small and finish one reviewable output.",
      recommendation: firstTool.name,
      reason: "Mobile works best for a short summary, a quick rewrite, or final approval; save side-by-side checking and larger edits for desktop.",
    },
    {
      situation: "If you are on a computer, compare the source, AI draft, and final version side by side.",
      recommendation: secondTool.name,
      reason: "Desktop is better when the workflow needs source checking, longer inputs, file uploads, layout work, or a cleaner audit trail.",
    },
  ];
}

function buildHowToKeyTakeaways(topic: GuideTopic, firstTool: { readonly name: string }, secondTool: { readonly name: string }, thirdTool: { readonly name: string }): string[] {
  return [
    `What you need: the original source material, a clear output format, and a few minutes to review the result.`,
    `Start with ${firstTool.name} for the first pass, but judge the output against ${topic.searchIntent}, not against tool hype.`,
    `Use ${secondTool.name} only when the workflow needs a different format or second pass.`,
    `Use ${thirdTool.name} for cleanup after the main draft is fact-checked.`,
    topic.userPain,
    topic.contentGap,
    "The useful next step is to test one real example before building a repeatable workflow.",
  ];
}

function buildFaqs(
  topic: GuideTopic,
  firstTool: { readonly name: string; readonly bestFor: readonly string[] },
  secondTool: { readonly name: string; readonly bestFor: readonly string[] },
  thirdTool: { readonly name: string; readonly bestFor: readonly string[] },
): { question: string; answer: string }[] {
  const theme = topicFaqTheme(topic);

  if (theme === "research") {
    return [
      {
        question: `Can I use AI to summarize ${topic.searchIntent} without losing important details?`,
        answer: ensurePeriod(
          `Yes, if you keep the source material in view and check the summary against the original. ${firstTool.name} is the safest first choice when the input is already a set of documents, while ${secondTool.name} is better when you need live web sources and ${thirdTool.name} is useful for rewriting the notes after the facts are checked.`,
        ),
      },
      {
        question: "Which AI tool is better for citations or source checking?",
        answer: ensurePeriod(
          `${secondTool.name} is usually the stronger choice when visible sources matter, because it is built for research first. ${firstTool.name} is better when the sources are already uploaded and you need the answer tied to those files.`,
        ),
      },
      {
        question: `Is ${firstTool.name} better than ${secondTool.name} for this workflow?`,
        answer: ensurePeriod(
          `${firstTool.name} is better when your job starts with documents, notes, or a closed source set; ${secondTool.name} is better when you still need to discover sources before you can summarize them.`,
        ),
      },
      {
        question: "What should I avoid when I use AI summaries for school or work?",
        answer: ensurePeriod(
          `Avoid copying the first draft straight into your notes or deliverable. Read the source, check the claims, and use ${thirdTool.name} only after the factual base is solid.`,
        ),
      },
    ];
  }

  if (theme === "writing") {
    return [
      {
        question: `Can I use AI to rewrite ${topic.searchIntent} without changing the meaning?`,
        answer: ensurePeriod(
          `Yes, but you need to keep the original message in view. ${firstTool.name} is the best first pass when you want careful wording, ${secondTool.name} is useful when you need a different rewrite style, and ${thirdTool.name} is the fallback for a final polish.`,
        ),
      },
      {
        question: "Which AI tool is better for tone and clarity?",
        answer: ensurePeriod(
          `${firstTool.name} is usually the safest place to start when you want cleaner tone without losing intent. ${secondTool.name} becomes more useful when you need a more opinionated rewrite.`,
        ),
      },
      {
        question: `Is ${firstTool.name} better than ${secondTool.name} for client emails?`,
        answer: ensurePeriod(
          `${firstTool.name} is better when accuracy and tone control matter more than speed; ${secondTool.name} is the better fallback when you want a wider rewrite or a second opinion on wording.`,
        ),
      },
      {
        question: "What should I avoid before I send the final version?",
        answer: ensurePeriod(
          `Do not send the rewritten text until you have checked the meaning, names, dates, and asks. That matters even more when you use ${thirdTool.name} for the final edit.`,
        ),
      },
    ];
  }

  if (theme === "content") {
    return [
      {
        question: `Can I use AI to turn ${topic.searchIntent} into something usable without making it generic?`,
        answer: ensurePeriod(
          `Yes, if you start with a clear angle and edit the result for your audience. ${firstTool.name} is the best starting point for the first draft, ${secondTool.name} is useful when you need a different format or angle, and ${thirdTool.name} helps when the copy needs a final cleanup.`,
        ),
      },
      {
        question: "Which AI tool is better for repurposing content?",
        answer: ensurePeriod(
          `${firstTool.name} usually works best for the first rewrite, while ${secondTool.name} is better when the job shifts toward a different style or asset format.`,
        ),
      },
      {
        question: `Is ${firstTool.name} better than ${secondTool.name} for this workflow?`,
        answer: ensurePeriod(
          `${firstTool.name} is better when you want a direct content pass; ${secondTool.name} is better when the same input needs a new angle, layout, or structure.`,
        ),
      },
      {
        question: "What should I avoid before I publish or post it?",
        answer: ensurePeriod(
          `Avoid posting the first output without checking the hook, the flow, and the factual details. Use ${thirdTool.name} as the last cleanup step, not the only step.`,
        ),
      },
    ];
  }

  if (theme === "meetings") {
    return [
      {
        question: `Can I use AI to summarize ${topic.searchIntent} into a usable recap?`,
        answer: ensurePeriod(
          `Yes, but the recap should still be checked against the original notes. ${firstTool.name} is the best first pass for a structured recap, ${secondTool.name} is useful when you want a different summary angle, and ${thirdTool.name} helps turn rough notes into a cleaner client version.`,
        ),
      },
      {
        question: "Which AI tool is better for action items?",
        answer: ensurePeriod(
          `${firstTool.name} is the better starting point when action items need to stay close to the source notes. Use ${secondTool.name} when you need a source-backed follow-up or a second look.`,
        ),
      },
      {
        question: `Is ${firstTool.name} better than ${secondTool.name} for client recaps?`,
        answer: ensurePeriod(
          `${firstTool.name} is better when you already have notes from the meeting; ${secondTool.name} is better when the recap needs more context or a broader source check.`,
        ),
      },
      {
        question: "What should I avoid before I send the recap?",
        answer: ensurePeriod(
          `Do not send the recap until commitments, dates, owners, and next steps are confirmed. That is the fastest way to keep the summary useful.`,
        ),
      },
    ];
  }

  return [
    {
      question: `Can I use AI to handle ${topic.searchIntent} without losing the core detail?`,
      answer: ensurePeriod(
        `Yes, if you choose the tool that matches the input type and then review the output yourself. ${firstTool.name} is the best starting point, ${secondTool.name} is the strongest second choice, and ${thirdTool.name} is the safer fallback when you need a different balance of speed and control.`,
      ),
    },
    {
      question: "Which AI tool is better when I need source checking?",
      answer: ensurePeriod(
        `${secondTool.name} is usually the better choice when source checking matters, while ${firstTool.name} is stronger when the job starts with a known set of files or notes.`,
      ),
    },
    {
      question: `Is ${firstTool.name} better than ${secondTool.name} for this workflow?`,
      answer: ensurePeriod(
        `${firstTool.name} is better when you want the most direct match for the main input; ${secondTool.name} is better when the workflow changes enough to justify a different tool.`,
      ),
    },
    {
      question: "What should I avoid before I share the result?",
      answer: ensurePeriod(
        `Avoid sharing the first draft until you have checked facts, tone, and any missing context. Use ${thirdTool.name} as a helper, not a replacement for review.`,
      ),
    },
  ];
}

function buildKeyTakeaways(
  topic: GuideTopic,
  firstTool: { readonly name: string; readonly bestFor: readonly string[] },
  secondTool: { readonly name: string; readonly bestFor: readonly string[] },
  thirdTool: { readonly name: string; readonly bestFor: readonly string[] },
): string[] {
  return [
    `${firstTool.name} is the first tool to test because it best matches ${topic.searchIntent}.`,
    `${secondTool.name} is the right second choice when the input type changes or you need a different output style.`,
    `${thirdTool.name} is the fallback when you want a lighter, faster, or more polished review step.`,
    `The right choice depends on whether you already have ${topicInputFocus(topic)} or still need to discover, rewrite, or organize the material.`,
    topic.userPain,
    topic.contentGap,
    topic.budgetAngle,
  ];
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
  guideTypeOverride?: GuideLayoutType,
): Guide {
  const topicExcluded = new Set(topic.excludedToolSlugs ?? []);
  const scoredRecommendations = scoreToolsForTopic(topic).filter(
    ({ tool }) => !topicExcluded.has(tool.slug),
  );
  const preferredRecommendations = scoredRecommendations.filter(
    ({ tool }) => !avoidToolSlugs.has(tool.slug),
  );
  const fallbackRecommendations = scoredRecommendations.filter(({ tool }) =>
    avoidToolSlugs.has(tool.slug),
  );
  const recommendations = [...preferredRecommendations, ...fallbackRecommendations].slice(
    0,
    MAX_RECOMMENDED_TOOLS,
  );
  const [first, second, third] = recommendations;
  const date = new Date().toISOString().slice(0, 10);
  const disclosureNote =
    "Some Comparavy links may be affiliate links. Review the affiliate disclosure and official site before subscribing.";
  const finderCTA =
    "Use the Comparavy finder at /finder for a recommendation matched to your workflow and budget.";

  if (!first || !second || !third) {
    throw new Error(
      `Not enough catalog matches for ${topic.slug}. Found ${recommendations.length}; ${MIN_RECOMMENDED_TOOLS} are required.`,
    );
  }

  const recommendedToolSlugs = recommendations.map(({ tool }) => tool.slug);
  const qualityScore = 92;
  const guideType = guideTypeOverride ?? resolveTopicGuideType(topic);
  const guideTitle = titleForGuide(topic, guideType);
  const editorialBrief = createEditorialBrief(topic, guideType, recommendations);
  const articleOutline = createArticleOutline(editorialBrief, guideTitle);
  const quickAnswer = quickAnswerForGuide(topic, first.tool, second.tool, third.tool, guideType);
  const quickDecision = quickDecisionForGuide(topic, first.tool, second.tool, third.tool);
  const steps = guideType === "how-to" ? buildHowToSteps(topic, first.tool, second.tool, third.tool) : [
    {
      title: "Define the input type",
      detail: `Decide whether you already have ${topicInputFocus(topic)} or still need to gather it before you touch the tools.`,
      toolSlug: first.tool.slug,
      toolName: first.tool.name,
    },
    {
      title: "Run the strongest first pass",
      detail: `Use ${first.tool.name} on one real example so you can see how it handles ${toolInputPhrase(first.tool, topic)}.`,
      toolSlug: first.tool.slug,
      toolName: first.tool.name,
    },
    {
      title: "Compare the second choice",
      detail: `Try ${second.tool.name} on the same input if you need a different workflow, source style, or output format.`,
      toolSlug: second.tool.slug,
      toolName: second.tool.name,
    },
    {
      title: "Check the final pass",
      detail: `Use ${third.tool.name} or a manual review to catch missing details, tone issues, or weak structure before you publish or send anything.`,
      toolSlug: third.tool.slug,
      toolName: third.tool.name,
    },
  ];
  const toolsYouCanUse = recommendations.slice(0, 3).map(({ tool }, index) => ({
    toolSlug: tool.slug,
    toolName: tool.name,
    why: ensurePeriod(editorialBrief.toolRoleMap[index]?.role ?? `${tool.name} supports ${topic.searchIntent} when its role is clearly limited.`),
  }));
  const commonMistakes = editorialBrief.commonMistakesToWarnAbout;
  const mistakesToAvoid = [
    `Do not treat ${first.tool.name} as the final answer without checking the result against your source material.`,
    `Do not use ${second.tool.name} or ${third.tool.name} as a shortcut around the real decision about input type and output quality.`,
    "Do not skip review if the output will reach clients, customers, classmates, or a public page.",
  ];
  const realityCheck =
    guideType === "income"
      ? "AI can help you package and deliver work faster, but it does not guarantee clients, revenue, or repeat demand."
      : "AI can speed up the work, but the user still has to review facts, shape the final result, and decide whether the workflow fits the job.";
  const skillNeeded =
    guideType === "income"
      ? "You need basic prompt writing, simple editing, and a clear understanding of the service you want to sell."
      : `You need enough familiarity with ${topic.searchIntent} to judge whether the output is accurate and useful.`;
  const firstStep = guideType === "how-to"
    ? `What you need: ${topicInputFocus(topic)}, a clear final format, the audience or recipient, and time to check the AI result before using it.`
    : `Start with one real example of ${topic.useCase} and compare the output against your own standard before you scale the workflow.`;
  const exampleWorkflow = ensurePeriod(
    guideType === "how-to"
      ? editorialBrief.coreWorkflow.join(" ")
      : `Collect the source material, ask ${first.tool.name} for the first draft, use ${second.tool.name} to compare a different workflow, and keep ${third.tool.name} for the final cleanup and review.`,
  );
  const exampleResult = ensurePeriod(
    guideType === "how-to"
      ? `Example result: a checked ${workflowVerbPhrase(topic)} output that keeps the source facts, removes filler, names the next action, and is short enough to review before sending, posting, studying, or saving.`
      : `The final result should be clearer, shorter, and easier to use, with the main ideas preserved and the obvious errors removed.`,
  );
  const deviceIntent: Guide["deviceIntent"] = topic.deviceIntent ?? "both";
  const desktopUseCase = topic.desktopUseCase ?? `Best on desktop when you want to compare tools, keep source material open, and edit the output in a wider workspace.`;
  const mobileUseCase = topic.mobileUseCase ?? `Best on mobile when you need a fast first pass, a quick summary, or a lightweight edit while away from your desk.`;
  const desktopSearchAngle = `Desktop readers usually want a deeper comparison, file handling, and a more deliberate review workflow.`;
  const mobileSearchAngle = `Mobile readers usually want a short answer first, then a quick next step they can finish in a few taps.`;
  const visualAssets = {
    hero: {
      type: "hero" as const,
      alt: `${guideTitle} guide visual`,
      promptOrDescription: `Editorial guide artwork for ${topic.searchIntent} with a clean, problem-solving feel.`,
      fileNameHint: topic.slug,
    },
    workflow: {
      type: "workflow-diagram" as const,
      alt: `${guideTitle} workflow diagram`,
      steps: articleOutline.sections.slice(0, 5),
    },
    toolStack: {
      type: "tool-stack" as const,
      alt: `${guideTitle} recommended tool stack`,
      tools: recommendations.slice(0, 3).map(({ tool }) => tool.name),
    },
    beforeAfter: {
      type: "before-after" as const,
      alt: `${guideTitle} before and after comparison`,
      before: `Before: manual work and scattered notes for ${topic.searchIntent}.`,
      after: `After: a faster workflow that leaves you with a clear, checked result.`,
    },
  };
  const faqs = buildFaqs(topic, first.tool, second.tool, third.tool);
  const metaDescription =
    guideType === "how-to"
      ? `Learn how to ${topic.searchIntent}. See the workflow, tools you can use, and the safest first step.`
      : guideType === "income"
        ? `Use AI to support this workflow without hype. See the realistic steps, skill needed, and tools that help you deliver faster.`
        : guideType === "trend-led"
          ? `Compare current AI tool options for ${topic.audience}. See practical fit, tradeoffs, and a clear decision path.`
          : `Compare AI tools for ${topic.audience} focused on ${topic.searchIntent}. See practical fit, tradeoffs, and a free-first decision path.`;
  const bestPicksBySituation = buildBestPicksBySituation(topic, first, second, third);
  const decisionPath = guideType === "how-to"
    ? buildHowToDecisionPath(topic, first.tool, second.tool, third.tool)
    : buildDecisionPath(topic, first, second, third);

  return {
    slug: topic.slug,
    title: guideTitle,
    guideType,
    type: guideType,
    metaTitle: `${guideTitle} | Comparavy`,
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
    keyTakeaways: guideType === "how-to"
      ? buildHowToKeyTakeaways(topic, first.tool, second.tool, third.tool)
      : buildKeyTakeaways(topic, first.tool, second.tool, third.tool),
    bestPicksBySituation,
    recommendedToolSlugs,
    recommendedTools: recommendations.map(({ tool }, index) => ({
      toolSlug: tool.slug,
      toolName: tool.name,
      summary: toolSummary(tool, topic, index),
      bestFor: toolBestForText(tool, topic, index),
      avoidIf: toolAvoidIfText(tool, topic, index),
      strengths: tool.primaryTags.slice(0, 4),
      tradeoffs: tool.notFor.slice(0, 3),
      toolPagePath: `/tools/${tool.slug}`,
    })),
    comparisonRows: recommendations.map(({ tool }, index) => ({
      toolSlug: tool.slug,
      toolName: tool.name,
      bestFor: toolBestForText(tool, topic, index),
      freePlan: tool.freePlan,
      easeOfUse: `${tool.setupDifficulty} setup; ease ${tool.easeScore}/10 in the Comparavy catalog`,
      whyConsider: toolWhyConsiderText(tool, topic, index),
      watchFor: toolWatchForPhrase(tool, topic),
    })),
    decisionPath,
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
    finalVerdict: ensurePeriod(
      guideType === "how-to"
        ? `The next step is to run this workflow on one real example of ${topic.useCase}. Start with ${first.tool.name}, use ${second.tool.name} only if the format needs a second pass, finish with ${third.tool.name} or manual review, and do not reuse the workflow until the first result is accurate and useful.`
        : `For ${topic.persona}, start by testing ${first.tool.name} on one realistic assignment: ${topic.useCase}. Compare it with ${second.tool.name} if you need a different workflow, use ${third.tool.name} for the final review, and choose only after checking actual output, setup effort, and current official plan details.`,
    ),
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
        `Start with ${first.tool.name} for ${toolInputPhrase(first.tool, topic)}`,
        `Compare ${second.tool.name} when the workflow changes`,
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

async function refineWithOpenAI(template: Guide): Promise<Guide> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return template;
  }

  const topic = guideTopics.find((entry) => entry.slug === template.slug);
  const selectedToolsForBrief = topic
    ? scoreToolsForTopic(topic).filter(({ tool }) => template.recommendedToolSlugs.includes(tool.slug))
    : [];
  const guideType = topic
    ? resolveTopicGuideType(topic)
    : inferGuideLayoutTypeFromTopic({
        slug: template.slug,
        title: template.title,
        type: template.type,
        guideType: template.guideType,
        searchIntent: template.searchIntent,
        decisionQuestion: template.decisionQuestion,
        uniqueAngle: template.uniqueAngle,
        notes: template.contentGap,
      });
  const editorialBrief = topic ? createEditorialBrief(topic, guideType, selectedToolsForBrief) : undefined;
  const articleOutline = editorialBrief ? createArticleOutline(editorialBrief, template.title) : undefined;
  let lastFailure = "OpenAI request failed before a model response was returned.";

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
          'You are producing a complete Comparavy guide from an editorial brief and outline, not filling a template. Return a complete guide JSON object only. Comparavy is a US-focused, AdSense-first AI problem-solving site. The article must be useful enough to bookmark: solve the reader problem first, then show which tools help and what to avoid. For how-to guides, the title must start with "How to", the first 100 words must answer the search intent, tools must be supporting actors, and the required sections are Quick Answer, What you need, Step-by-step workflow, computer guidance, phone guidance, Tools you can use, Example result, Common mistakes, FAQ, and Next step. For tool-decision guides, justify the ranking with a quick verdict, best picks by situation, comparison table, branching decision path, unique tool cards, who should use or avoid this, final verdict, and /finder CTA. Do not use placeholder phrases, generic marketing filler, fake testing, exact current pricing, guaranteed outcomes, or unsupported current-news claims. pricingNote and pricingCaveat must remain exactly: Pricing can change. Check the official site before subscribing.',
        input: JSON.stringify({
          editorialBrief,
          articleOutline,
          selectedToolSlugs: template.recommendedToolSlugs,
          catalogGroundedDraft: template,
        }),
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
      lastFailure = `OpenAI request failed with status ${response.status} using ${model}.`;
      continue;
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

  throw new Error(lastFailure);
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
  const recentPublishedToolSlugs = new Set<string>();

  for (const guide of existingGuides
    .filter((entry) => entry.status === "published")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4)) {
    for (const slug of guide.recommendedToolSlugs) {
      recentPublishedToolSlugs.add(slug);
    }
  }

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

    const avoidToolSlugs = new Set<string>([...usedToolSlugs, ...recentPublishedToolSlugs]);
    const { guide: template, skipped } = tryCreateTemplateGuide(topic, status, avoidToolSlugs);

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
