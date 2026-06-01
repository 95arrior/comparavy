"use client";

import Link from "next/link";
import { useState } from "react";
import ActionLinks from "@/components/ActionLinks";
import BadgeRow, { getToolCardBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import SiteHeader from "@/components/SiteHeader";
import ToolIcon from "@/components/ToolIcon";
import ToolTagChips from "@/components/ToolTagChips";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import {
  getRecommendedTools,
  type RecommendationBudget,
  type RecommendationPriority,
  type SkillLevel,
  type ToolRecommendation,
} from "@/lib/recommendTools";

type TaskId =
  | "content"
  | "summarize"
  | "social"
  | "product-copy"
  | "messy-notes"
  | "compare-tools";
type SourceId =
  | "meeting-notes"
  | "pdf-text"
  | "product-details"
  | "blog-post"
  | "business-idea"
  | "nothing-yet";
type OutputId =
  | "email-recap"
  | "study-notes"
  | "product-listing"
  | "content-calendar"
  | "instagram-carousel"
  | "tool-recommendation";
type ContextId =
  | "work"
  | "school"
  | "etsy"
  | "small-business"
  | "social-media"
  | "personal";
type EnvironmentId =
  | "any-chat"
  | "google-workspace"
  | "microsoft-365"
  | "notion"
  | "canva"
  | "unsure";

interface FinderChoice<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly query: string;
  readonly description?: string;
  readonly goalQuery?: string;
  readonly useCaseQuery?: string;
  readonly budget?: RecommendationBudget;
  readonly priority?: RecommendationPriority;
  readonly preferredToolSlugs?: readonly ToolSlug[];
}

interface FinderAnswers {
  task: FinderChoice<TaskId> | null;
  source: FinderChoice<SourceId> | null;
  output: FinderChoice<OutputId> | null;
  context: FinderChoice<ContextId> | null;
  environment: FinderChoice<EnvironmentId> | null;
}

interface ShortcutMatch {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly useCase: string;
  readonly category: string;
  readonly persona: string;
  readonly searchText: string;
  readonly recommendedToolSlugs: readonly ToolSlug[];
}

interface ScoredShortcut {
  readonly shortcut: ShortcutMatch;
  readonly score: number;
}

const PUBLISHED_SHORTCUTS: readonly ShortcutMatch[] = [
  {
    slug: "how-to-turn-meeting-notes-into-a-client-recap-with-ai",
    title: "How to Turn Meeting Notes Into a Client Recap and Follow-Up Email with AI",
    description:
      "Turn messy meeting notes into a client recap and follow-up email with decisions, action items, owners, open questions, and review steps.",
    useCase: "turning meeting notes into a client recap",
    category: "Productivity",
    persona: "client service professionals",
    searchText:
      "meeting notes client recap follow-up email action items meeting summary client email call notes owners deadlines open questions work messy notes",
    recommendedToolSlugs: ["chatgpt", "claude", "otter-ai", "fireflies"],
  },
  {
    slug: "how-to-summarize-a-pdf-into-study-notes-with-ai",
    title: "How to Summarize a PDF Into Study Notes and Quiz Questions with AI",
    description:
      "Turn a PDF or pasted document text into study notes, key concepts, quiz questions, and review prompts.",
    useCase: "summarizing a PDF into study notes",
    category: "Study",
    persona: "Students",
    searchText:
      "pdf document text class notes lecture notes textbook chapter study notes quiz questions flashcards review questions school student exam prep summarize",
    recommendedToolSlugs: ["chatgpt", "claude", "gemini", "microsoft-copilot"],
  },
  {
    slug: "how-to-write-etsy-product-descriptions-with-ai",
    title: "How to Write Etsy Product Descriptions with AI",
    description:
      "Turn product facts into accurate Etsy descriptions with buyer-focused copy and a review step.",
    useCase: "writing Etsy product descriptions",
    category: "Ecommerce",
    persona: "Etsy sellers",
    searchText:
      "etsy product details product description listing copy handmade product shop seller product listing title tags ecommerce online shop",
    recommendedToolSlugs: ["chatgpt", "claude", "jasper", "grammarly"],
  },
  {
    slug: "best-ai-tools-for-etsy-product-descriptions",
    title: "Best AI Tools for Etsy Product Descriptions, Titles, and Listings",
    description:
      "Compare AI tools for Etsy product descriptions, titles, listings, prompts, and safer listing workflows.",
    useCase: "choosing AI tools for Etsy product descriptions",
    category: "Ecommerce",
    persona: "Etsy sellers",
    searchText:
      "etsy product description product title listing copy tags keywords handmade product shop seller compare tools product listing",
    recommendedToolSlugs: ["chatgpt", "claude", "canva-magic-studio", "jasper"],
  },
  {
    slug: "how-to-create-a-content-calendar-for-a-small-business-with-ai",
    title: "How to Create a Content Calendar for a Small Business with AI",
    description:
      "Create a small business content calendar from offers, events, audience notes, and brand voice.",
    useCase: "creating a content calendar for a small business",
    category: "Marketing",
    persona: "Small business owners",
    searchText:
      "small business content calendar social media planning weekly content plan marketing calendar content ideas social posts business promotion local business",
    recommendedToolSlugs: ["chatgpt", "notion-ai", "buffer", "canva-magic-studio"],
  },
  {
    slug: "best-ai-tools-for-small-business-content-calendars",
    title: "Best AI Tools for Small Business Content Calendars and Social Media Planning",
    description:
      "Compare AI tools for planning small business content calendars, social posts, weekly themes, and marketing ideas.",
    useCase: "choosing AI tools for small business content calendars",
    category: "Marketing",
    persona: "Small business owners",
    searchText:
      "small business content calendar social media planning instagram posts facebook posts weekly content plan marketing calendar compare tools",
    recommendedToolSlugs: ["chatgpt", "claude", "canva-magic-studio", "notion-ai"],
  },
  {
    slug: "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai",
    title: "How to Turn a Blog Post Into an Instagram Carousel with AI",
    description:
      "Turn a blog post into an Instagram carousel outline, slide text, caption, visual notes, and review checklist.",
    useCase: "turning a blog post into an Instagram carousel",
    category: "Social Media",
    persona: "Content creators",
    searchText:
      "blog post instagram carousel carousel slides social media content repurpose blog post instagram caption slide outline canva carousel content creator",
    recommendedToolSlugs: ["canva-magic-studio", "chatgpt", "claude"],
  },
];

const TASKS: readonly FinderChoice<TaskId>[] = [
  { id: "content", label: "Write or improve content", query: "writing content copy draft improve" },
  { id: "summarize", label: "Summarize notes or documents", query: "summarize notes documents pdf study recap" },
  { id: "social", label: "Plan social media", query: "social media content calendar carousel captions" },
  { id: "product-copy", label: "Create business or product copy", query: "business product copy etsy listing marketing" },
  { id: "messy-notes", label: "Turn messy notes into a finished output", query: "messy notes finished output recap email summary" },
  { id: "compare-tools", label: "Compare AI tools", query: "compare ai tools recommendations alternatives", priority: "professional" },
];

const SOURCES: readonly FinderChoice<SourceId>[] = [
  { id: "meeting-notes", label: "Meeting notes", query: "meeting notes call notes decisions action items" },
  { id: "pdf-text", label: "PDF or document text", query: "pdf document text class notes lecture textbook" },
  { id: "product-details", label: "Product details", query: "product details materials dimensions product facts etsy" },
  { id: "blog-post", label: "Blog post", query: "blog post article source content" },
  { id: "business-idea", label: "Business idea", query: "business idea offer audience small business" },
  { id: "nothing-yet", label: "Nothing yet", query: "start from scratch brainstorm plan", budget: "free" },
];

const OUTPUTS: readonly FinderChoice<OutputId>[] = [
  { id: "email-recap", label: "Email or recap", query: "email recap follow-up client summary", priority: "quality" },
  { id: "study-notes", label: "Study notes", query: "study notes quiz questions flashcards review", priority: "quality" },
  { id: "product-listing", label: "Product listing", query: "product listing etsy description title tags", priority: "quality" },
  { id: "content-calendar", label: "Content calendar", query: "content calendar weekly social media plan", priority: "easy" },
  { id: "instagram-carousel", label: "Instagram carousel", query: "instagram carousel slide outline caption canva", priority: "easy" },
  { id: "tool-recommendation", label: "Tool recommendation", query: "tool recommendation compare alternatives", priority: "professional" },
];

const CONTEXTS: readonly FinderChoice<ContextId>[] = [
  { id: "work", label: "Work", query: "work client professional productivity" },
  { id: "school", label: "School", query: "school student study notes class" },
  { id: "etsy", label: "Etsy or online shop", query: "etsy online shop ecommerce product listing seller" },
  { id: "small-business", label: "Small business", query: "small business local business content marketing" },
  { id: "social-media", label: "Social media", query: "social media instagram carousel content calendar" },
  { id: "personal", label: "Personal productivity", query: "personal productivity notes tasks" },
];

const ENVIRONMENTS: readonly FinderChoice<EnvironmentId>[] = [
  {
    id: "any-chat",
    label: "Any AI chat tool",
    query: "chatgpt claude gemini copilot chat tool",
    budget: "free",
    preferredToolSlugs: ["chatgpt", "claude", "gemini"],
  },
  {
    id: "google-workspace",
    label: "Google Workspace",
    query: "google workspace gemini docs gmail sheets",
    preferredToolSlugs: ["gemini", "notebooklm"],
  },
  {
    id: "microsoft-365",
    label: "Microsoft 365",
    query: "microsoft 365 copilot word outlook teams",
    preferredToolSlugs: ["microsoft-copilot"],
  },
  {
    id: "notion",
    label: "Notion",
    query: "notion workspace notes project docs",
    preferredToolSlugs: ["notion-ai"],
  },
  {
    id: "canva",
    label: "Canva",
    query: "canva design carousel social graphics",
    preferredToolSlugs: ["canva-magic-studio"],
    priority: "easy",
  },
  {
    id: "unsure",
    label: "I am not sure",
    query: "not sure beginner simple recommendation",
    budget: "free",
    priority: "easy",
  },
];

const STEP_TITLES = [
  "What are you trying to finish?",
  "What input do you already have?",
  "What finished output do you need?",
  "Where will you use the result?",
  "Which tool environment do you prefer?",
] as const;

const INITIAL_ANSWERS: FinderAnswers = {
  task: null,
  source: null,
  output: null,
  context: null,
  environment: null,
};

const DIRECT_SHORTCUT_BOOSTS: Record<string, readonly string[]> = {
  "meeting-notes:email-recap": ["how-to-turn-meeting-notes-into-a-client-recap-with-ai"],
  "pdf-text:study-notes": ["how-to-summarize-a-pdf-into-study-notes-with-ai"],
  "product-details:product-listing": [
    "how-to-write-etsy-product-descriptions-with-ai",
    "best-ai-tools-for-etsy-product-descriptions",
  ],
  "blog-post:instagram-carousel": ["how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai"],
  "business-idea:content-calendar": [
    "how-to-create-a-content-calendar-for-a-small-business-with-ai",
    "best-ai-tools-for-small-business-content-calendars",
  ],
};

const STOP_WORDS = new Set([
  "and",
  "for",
  "the",
  "with",
  "into",
  "from",
  "that",
  "this",
  "tool",
  "tools",
  "output",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function selectedText(answers: FinderAnswers): string {
  return [
    answers.task?.query,
    answers.source?.query,
    answers.output?.query,
    answers.context?.query,
    answers.environment?.query,
  ]
    .filter(Boolean)
    .join(" ");
}

function wantsToolRecommendation(answers: FinderAnswers): boolean {
  return (
    answers.task?.id === "compare-tools" ||
    answers.output?.id === "tool-recommendation"
  );
}

function getShortcutMatches(answers: FinderAnswers): ScoredShortcut[] {
  if (
    !answers.task ||
    !answers.source ||
    !answers.output ||
    !answers.context ||
    !answers.environment ||
    wantsToolRecommendation(answers)
  ) {
    return [];
  }

  const terms = tokenize(selectedText(answers));
  const directKey = `${answers.source.id}:${answers.output.id}`;
  const boostedSlugs = new Set(DIRECT_SHORTCUT_BOOSTS[directKey] ?? []);
  const contextTerm = answers.context.query.split(" ")[0] ?? "";

  return PUBLISHED_SHORTCUTS.map((shortcut) => {
    const haystack = `${shortcut.title} ${shortcut.description} ${shortcut.useCase} ${shortcut.category} ${shortcut.persona} ${shortcut.searchText}`.toLowerCase();
    const overlapScore = terms.reduce(
      (score, term) => score + (haystack.includes(term) ? 1 : 0),
      0,
    );
    const directBoost = boostedSlugs.has(shortcut.slug) ? 20 : 0;
    const contextBoost = haystack.includes(contextTerm) ? 2 : 0;

    return { shortcut, score: overlapScore + directBoost + contextBoost };
  })
    .filter((match) => match.score >= 7)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2);
}

function buildRecommendationInput(answers: FinderAnswers) {
  if (
    !answers.task ||
    !answers.source ||
    !answers.output ||
    !answers.context ||
    !answers.environment
  ) {
    return null;
  }

  const budget: RecommendationBudget =
    answers.environment.budget ?? answers.source.budget ?? "under20";
  const skillLevel: SkillLevel = "beginner";
  const priority: RecommendationPriority =
    answers.output.priority ?? answers.environment.priority ?? answers.task.priority ?? "easy";

  return {
    goal: [
      answers.task.goalQuery ?? answers.task.query,
      answers.context.query,
      answers.environment.goalQuery ?? answers.environment.query,
    ].join(" "),
    useCase: [
      answers.source.query,
      answers.output.useCaseQuery ?? answers.output.query,
      answers.context.query,
      answers.environment.useCaseQuery ?? answers.environment.query,
    ].join(" "),
    budget,
    skillLevel,
    priority,
  };
}

function getShortcutToolRecommendations(
  shortcuts: readonly ScoredShortcut[],
  generalRecommendations: readonly ToolRecommendation[],
  answers: FinderAnswers,
): ToolRecommendation[] {
  const preferredSlugs = answers.environment?.preferredToolSlugs ?? [];
  const shortcutSlugs = shortcuts.flatMap((match) => match.shortcut.recommendedToolSlugs);
  const orderedSlugs = [...preferredSlugs, ...shortcutSlugs];
  const seen = new Set<string>();
  const shortcutTools: ToolRecommendation[] = [];

  for (const slug of orderedSlugs) {
    if (seen.has(slug)) {
      continue;
    }

    const tool = toolsBySlug.get(slug);

    if (!tool) {
      continue;
    }

    seen.add(slug);
    shortcutTools.push({
      tool,
      score: 1000 - shortcutTools.length,
      reasons: [
        "Fits the shortcut path matched above.",
        "Works with the input and output you selected.",
      ],
    });
  }

  for (const recommendation of generalRecommendations) {
    if (seen.has(recommendation.tool.slug)) {
      continue;
    }

    seen.add(recommendation.tool.slug);
    shortcutTools.push(recommendation);
  }

  return shortcutTools.slice(0, 3);
}

function RecommendationBadge({ label }: { readonly label: string }) {
  return (
    <span className="ateflo-star-badge inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800 ring-1 ring-teal-100">
      <span aria-hidden="true" className="ateflo-star-badge__icon">
        *
      </span>
      {label}
    </span>
  );
}

function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-14 rounded-2xl border px-4 py-4 text-left text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
        selected
          ? "border-teal-700 bg-teal-700 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50"
      }`}
    >
      <span className="block leading-5">{label}</span>
      {description && (
        <span className={`mt-1 block text-sm leading-5 ${selected ? "text-teal-50" : "text-slate-500"}`}>
          {description}
        </span>
      )}
    </button>
  );
}

function ShortcutResultCard({
  match,
  rank,
}: {
  readonly match: ScoredShortcut;
  readonly rank: number;
}) {
  const { shortcut } = match;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-teal-200 bg-white p-5 shadow-sm ring-1 ring-teal-100 ateflo-card-lift sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            {rank === 1 ? "Best shortcut match" : "Also relevant"}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            <Link href={`/shortcuts/${shortcut.slug}`} className="transition hover:text-teal-700">
              {shortcut.title}
            </Link>
          </h3>
        </div>
        <RecommendationBadge label="Shortcut" />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{shortcut.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[shortcut.category, shortcut.persona].map((label) => (
          <span
            key={label}
            className="inline-flex min-h-7 items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-700 ring-1 ring-inset ring-slate-200"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <Link
          href={`/shortcuts/${shortcut.slug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Open Shortcut
        </Link>
      </div>
    </article>
  );
}

function RecommendationCard({
  recommendation,
  rank,
  compareOpen,
  onCompare,
}: {
  recommendation: ToolRecommendation;
  rank: number;
  compareOpen: boolean;
  onCompare: () => void;
}) {
  const { tool, reasons } = recommendation;
  const visitUrl = tool.affiliateUrl ?? tool.officialUrl;
  const alternatives = tool.alternatives
    .map((slug) => toolsBySlug.get(slug as ToolSlug))
    .filter((alternative) => alternative !== undefined);

  return (
    <article
      className={`flex h-full min-h-[620px] flex-col rounded-3xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_38px_rgba(15,23,42,0.035)] ateflo-card-lift sm:p-6 ${
        rank === 1
          ? "border-teal-200 ring-1 ring-teal-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
            <ToolIcon {...tool} size={26} />
          </div>
          <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
            {tool.name}
          </h3>
        </div>
        {rank === 1 ? (
          <RecommendationBadge label="Top tool" />
        ) : (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
            Option {rank}
          </span>
        )}
      </div>

      <p className="ateflo-clamp-2 mt-3 min-h-12 max-w-2xl text-sm leading-6 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-3 min-h-16">
        <BadgeRow badges={getToolCardBadges(tool)} maxVisible={3} />
      </div>

      <div className="mt-5 grid gap-4">
        <div className="flex min-h-48 flex-col rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Why this fits</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-52 flex-col rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Fit signals</p>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          </div>
          <MetricBars tool={tool} />
        </div>
      </div>

      <div className="mt-5 min-h-[92px] rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="max-h-12 overflow-hidden">
          <ToolTagChips tags={tool.primaryTags} maxVisible={5} animate />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <p className="font-semibold text-slate-900">Pricing note</p>
          <p className="text-slate-600">
            Free plan: {tool.freePlan ? "Available" : "Not listed"}
          </p>
        </div>
        <p className="ateflo-clamp-2 text-sm leading-6 text-slate-600">
          {tool.pricingNote}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        <ActionLinks
          items={[
            {
              href: visitUrl,
              label: "Visit Site",
              external: true,
              tone: "primary",
              eventName: "tool_visit_click",
              eventParams: {
                tool_slug: tool.slug,
                tool_name: tool.name,
                source_page: "finder",
                action_location: "finder_tool_result",
              },
            },
            {
              href: `/tools/${tool.slug}`,
              label: "View Tool Page",
            },
          ]}
        />
        <button
          type="button"
          aria-expanded={compareOpen}
          onClick={onCompare}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Compare Alternatives
        </button>
      </div>

      {compareOpen && (
        <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Compare with these alternatives
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {alternatives.map((alternative) => (
              <a
                key={alternative.id}
                href={alternative.affiliateUrl ?? alternative.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200 transition hover:ring-teal-300"
              >
                <ToolIcon {...alternative} size={26} />
                <span className="min-w-0 truncate whitespace-nowrap">
                  {alternative.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function FinderPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>(INITIAL_ANSWERS);
  const [compareOpen, setCompareOpen] = useState<string | null>(null);

  const input = buildRecommendationInput(answers);
  const shortcutMatches = getShortcutMatches(answers);
  const generalRecommendations = input ? getRecommendedTools(input) : [];
  const recommendations = input
    ? shortcutMatches.length > 0 && !wantsToolRecommendation(answers)
      ? getShortcutToolRecommendations(shortcutMatches, generalRecommendations, answers)
      : generalRecommendations.slice(0, 3)
    : [];
  const isResultsStep = step === 5 && input !== null;

  function chooseAnswer<Key extends keyof FinderAnswers>(
    key: Key,
    value: NonNullable<FinderAnswers[Key]>,
    nextStep: number,
  ) {
    setAnswers((current) => {
      const next = { ...current, [key]: value };

      if (key === "task") {
        next.source = null;
        next.output = null;
        next.context = null;
        next.environment = null;
      }

      if (key === "source") {
        next.output = null;
        next.context = null;
        next.environment = null;
      }

      if (key === "output") {
        next.context = null;
        next.environment = null;
      }

      if (key === "context") {
        next.environment = null;
      }

      return next;
    });
    setCompareOpen(null);
    setStep(nextStep);
  }

  function resetFinder() {
    setAnswers({ ...INITIAL_ANSWERS });
    setCompareOpen(null);
    setStep(0);
  }

  const summaryChips = [
    answers.task?.label,
    answers.source?.label,
    answers.output?.label,
    answers.context?.label,
    answers.environment?.label,
  ].filter(Boolean);

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <SiteHeader active="finder" className="mb-7 rounded-3xl border border-slate-200 shadow-sm sm:mb-10" />
        <header className="mb-7 sm:mb-10">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Find the right AI shortcut or tool.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Answer a few simple questions and AteFlo will point you toward a
            shortcut or tool that fits the task you want to finish.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-600">
              {isResultsStep ? "5 of 5 complete" : `Step ${step + 1} of 5`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={resetFinder}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2" aria-label="Finder progress">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < step ? "bg-teal-700" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {!isResultsStep && (
            <div className="mt-8 sm:mt-10">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {STEP_TITLES[step]}
              </h2>
              {step > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  {summaryChips.slice(0, step).join(" / ")}
                </p>
              )}

              {step === 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TASKS.map((choice) => (
                    <OptionButton
                      key={choice.id}
                      label={choice.label}
                      selected={answers.task?.id === choice.id}
                      onClick={() => chooseAnswer("task", choice, 1)}
                    />
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {SOURCES.map((choice) => (
                    <OptionButton
                      key={choice.id}
                      label={choice.label}
                      selected={answers.source?.id === choice.id}
                      onClick={() => chooseAnswer("source", choice, 2)}
                    />
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {OUTPUTS.map((choice) => (
                    <OptionButton
                      key={choice.id}
                      label={choice.label}
                      selected={answers.output?.id === choice.id}
                      onClick={() => chooseAnswer("output", choice, 3)}
                    />
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CONTEXTS.map((choice) => (
                    <OptionButton
                      key={choice.id}
                      label={choice.label}
                      selected={answers.context?.id === choice.id}
                      onClick={() => chooseAnswer("context", choice, 4)}
                    />
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ENVIRONMENTS.map((choice) => (
                    <OptionButton
                      key={choice.id}
                      label={choice.label}
                      selected={answers.environment?.id === choice.id}
                      onClick={() => chooseAnswer("environment", choice, 5)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {isResultsStep && (
            <div className="mt-8">
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                {summaryChips.map((label) => (
                  <span key={label} className="rounded-full bg-slate-50 px-3 py-2">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {isResultsStep && (
          <section id="finder-results" aria-live="polite" className="mt-8">
            <div className="mb-6">
              <p className="text-sm font-medium text-teal-700">
                {shortcutMatches.length > 0 ? "Shortcut first" : "Closest fit"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Your best workflow fit
              </h2>
              {shortcutMatches.length === 0 && !wantsToolRecommendation(answers) && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  AteFlo does not have an exact published shortcut for this path
                  yet. Start with the closest tools below, or browse all current
                  shortcuts.
                </p>
              )}
            </div>

            {shortcutMatches.length > 0 && !wantsToolRecommendation(answers) && (
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                {shortcutMatches.map((match, index) => (
                  <ShortcutResultCard
                    key={match.shortcut.slug}
                    match={match}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}

            {shortcutMatches.length === 0 && !wantsToolRecommendation(answers) && (
              <div className="mb-6">
                <Link
                  href="/shortcuts"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Browse Published Shortcuts
                </Link>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900">
                {shortcutMatches.length > 0 && !wantsToolRecommendation(answers)
                  ? "Tools that fit this shortcut"
                  : "Tool recommendations"}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {recommendations.map((recommendation, index) => (
                <RecommendationCard
                  key={recommendation.tool.id}
                  recommendation={recommendation}
                  rank={index + 1}
                  compareOpen={compareOpen === recommendation.tool.id}
                  onCompare={() =>
                    setCompareOpen((current) =>
                      current === recommendation.tool.id
                        ? null
                        : recommendation.tool.id,
                    )
                  }
                />
              ))}
            </div>
            <p className="mt-7 text-sm leading-6 text-slate-500">
              Some links may be affiliate links. We recommend tools based on
              fit, not commission.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
