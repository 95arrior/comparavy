import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { guideTopics, type GuideTopic } from "@/data/guideTopics";
import {
  PRICING_NOTICE,
  assertGuideContentQuality,
  checkGuideQuality,
  type GuideQualityResult,
} from "@/lib/contentQuality";
import type { Guide, GuideStatus } from "@/lib/guides";
import { getTopicRecommendations } from "@/lib/topicScoring";

interface GeneratorOptions {
  readonly count: number;
  readonly publish: boolean;
}

interface ResponsesResult {
  readonly output_text?: string;
  readonly output?: readonly {
    readonly content?: readonly {
      readonly type?: string;
      readonly text?: string;
    }[];
  }[];
}

const GUIDES_DIRECTORY = path.join(process.cwd(), "content", "guides");

const GUIDE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    category: { type: "string" },
    persona: { type: "string" },
    useCase: { type: "string" },
    budgetAngle: { type: "string" },
    skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    primaryKeyword: { type: "string" },
    secondaryKeywords: { type: "array", items: { type: "string" } },
    quickVerdict: { type: "string" },
    keyTakeaways: { type: "array", items: { type: "string" } },
    recommendedToolSlugs: { type: "array", items: { type: "string" } },
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
    moneySavingTips: { type: "array", items: { type: "string" } },
    pricingNote: { type: "string" },
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
    ctaToFinder: { type: "string" },
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
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: [
    "slug",
    "title",
    "metaTitle",
    "metaDescription",
    "category",
    "persona",
    "useCase",
    "budgetAngle",
    "skillLevel",
    "primaryKeyword",
    "secondaryKeywords",
    "quickVerdict",
    "keyTakeaways",
    "recommendedToolSlugs",
    "comparisonRows",
    "decisionPath",
    "moneySavingTips",
    "pricingNote",
    "faqs",
    "finalVerdict",
    "ctaToFinder",
    "visualSummary",
    "status",
    "createdAt",
    "updatedAt",
  ],
} as const;

function parseOptions(args: readonly string[]): GeneratorOptions {
  let count = 1;
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

    throw new Error(`Unknown option: ${argument}`);
  }

  return { count, publish };
}

function createTemplateGuide(topic: GuideTopic, status: GuideStatus): Guide {
  const recommendations = getTopicRecommendations(topic, 3);
  const [first, second, third] = recommendations;
  const date = new Date().toISOString().slice(0, 10);

  if (!first || !second || !third) {
    throw new Error(`Not enough catalog matches for ${topic.slug}.`);
  }

  return {
    slug: topic.slug,
    title: topic.title,
    metaTitle: `${topic.title} | Comparavy`,
    metaDescription: `Compare AI tools for ${topic.persona} focused on ${topic.useCase}. See practical fit, tradeoffs, and a free-first decision path.`,
    category: topic.category,
    persona: topic.persona,
    useCase: topic.useCase,
    budgetAngle: topic.budgetAngle,
    skillLevel: topic.skillLevel,
    primaryKeyword: topic.primaryKeyword,
    secondaryKeywords: topic.secondaryKeywords,
    quickVerdict: `For ${topic.persona} at a ${topic.skillLevel} skill level, ${first.tool.name} is the strongest first tool to consider for ${topic.useCase}. Compare ${second.tool.name} when its workflow fits better, and keep ${third.tool.name} on the shortlist for a different balance of control and simplicity.`,
    keyTakeaways: [
      `${first.tool.name} leads this shortlist because it is closely aligned with ${topic.useCase}.`,
      `${second.tool.name} and ${third.tool.name} are useful alternatives when your preferred editing, research, or setup workflow changes.`,
      topic.budgetAngle,
      `This ${topic.skillLevel}-level guide prioritizes a manageable starting workflow for ${topic.persona}.`,
      "Review generated output and confirm tool features on the official site before committing to a workflow.",
    ],
    recommendedToolSlugs: recommendations.map(({ tool }) => tool.slug),
    comparisonRows: recommendations.map(({ tool, reasons }) => ({
      toolSlug: tool.slug,
      toolName: tool.name,
      bestFor: tool.bestFor[0] ?? topic.useCase,
      freePlan: tool.freePlan,
      easeOfUse: `${tool.setupDifficulty} setup; ease ${tool.easeScore}/10 in the Comparavy catalog`,
      whyConsider: reasons[0] ?? "Relevant match for this workflow.",
      watchFor: tool.notFor[0] ?? "Confirm it fits the exact workflow before adopting it.",
    })),
    decisionPath: [
      {
        situation: `If your goal is ${topic.useCase}, start with the most direct shortlisted workflow.`,
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
    faqs: [
      {
        question: `Which tool should ${topic.persona} try first?`,
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
    finalVerdict: `For ${topic.persona}, start by testing ${first.tool.name} on one realistic assignment: ${topic.useCase}. Compare it with ${second.tool.name} if you need a different workflow, respect the stated budget approach, and choose only after reviewing actual output, setup effort, and current official plan details.`,
    ctaToFinder: "Need a recommendation shaped by your workflow and budget? Use the Comparavy finder at /finder.",
    visualSummary: {
      headline: `A practical starting route for ${topic.persona}`,
      points: [
        `Start with ${first.tool.name}`,
        `Compare ${second.tool.name} for an alternate workflow`,
        "Run a real project test before subscribing",
      ],
    },
    status,
    createdAt: date,
    updatedAt: date,
  };
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
      model: process.env.OPENAI_GUIDE_MODEL ?? "gpt-5.4-mini",
      instructions:
        'Improve the supplied Comparavy guide draft for clarity and decision usefulness. Preserve every factual catalog statement, selected tool slug, status, and date. Keep at least five key takeaways, three decision-path options phrased as clear "If you need X, choose Y" decisions, and four FAQs. Explicitly address the persona, use case, budget approach, and skill level. Do not invent tool testing, performance claims, or exact current prices. pricingNote must remain exactly: Pricing can change. Check the official site before subscribing.',
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
    category: template.category,
    persona: template.persona,
    useCase: template.useCase,
    budgetAngle: template.budgetAngle,
    skillLevel: template.skillLevel,
    primaryKeyword: template.primaryKeyword,
    secondaryKeywords: template.secondaryKeywords,
    recommendedToolSlugs: template.recommendedToolSlugs,
    comparisonRows: template.comparisonRows,
    pricingNote: PRICING_NOTICE,
    status: template.status,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };

  assertGuideContentQuality(refined, template.slug);
  return refined;
}

async function getExistingGuides(): Promise<Guide[]> {
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
  const existingGuides = await getExistingGuides();
  const existingSlugs = new Set(existingGuides.map((guide) => guide.slug));
  const selectedTopics = guideTopics
    .filter((topic) => !existingSlugs.has(topic.slug))
    .slice(0, options.count);
  let created = 0;
  let published = 0;
  let drafts = 0;
  let failedQuality = 0;

  await mkdir(GUIDES_DIRECTORY, { recursive: true });

  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set; generating catalog-based guide templates.");
  }

  for (const topic of selectedTopics) {
    const template = createTemplateGuide(topic, status);
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
    created += 1;

    if (guide.status === "published") {
      published += 1;
    } else {
      drafts += 1;
    }

    console.log(`Created ${guide.status} guide: ${guide.slug}`);
  }

  if (selectedTopics.length < options.count) {
    console.log(
      `Created ${selectedTopics.length} guide(s); no unused configured topics remain for the requested count.`,
    );
  }

  console.log("Generation summary");
  console.log(`Created: ${created}`);
  console.log(`Published: ${published}`);
  console.log(`Draft: ${drafts}`);
  console.log(`Failed quality: ${failedQuality}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
