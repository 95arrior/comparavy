"use client";

import Link from "next/link";
import { useState } from "react";
import ActionLinks from "@/components/ActionLinks";
import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import SiteHeader from "@/components/SiteHeader";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import {
  getRecommendedTools,
  type RecommendationBudget,
  type RecommendationPriority,
  type SkillLevel,
  type ToolRecommendation,
} from "@/lib/recommendTools";

type GoalId =
  | "videos"
  | "writing"
  | "images"
  | "growth"
  | "automation"
  | "free";

interface Choice<T extends string> {
  id: T;
  label: string;
}

interface GoalChoice extends Choice<GoalId> {
  query: string;
}

interface UseCaseChoice extends Choice<string> {
  query: string;
  goalQuery?: string;
}

interface FinderAnswers {
  goal: GoalChoice | null;
  useCase: UseCaseChoice | null;
  budget: RecommendationBudget | null;
  skillLevel: SkillLevel | null;
  priority: RecommendationPriority | null;
}

const GOALS: readonly GoalChoice[] = [
  { id: "videos", label: "Make videos", query: "video" },
  { id: "writing", label: "Write content", query: "writing" },
  { id: "images", label: "Design images", query: "design images" },
  { id: "growth", label: "Grow online", query: "marketing writing design" },
  { id: "automation", label: "Automate work", query: "automation" },
  { id: "free", label: "Start free", query: "general help" },
];

const USE_CASES: Record<GoalId, readonly UseCaseChoice[]> = {
  videos: [
    {
      id: "youtube-shorts",
      label: "YouTube Shorts",
      query: "create short clips youtube social video",
    },
    {
      id: "long-youtube",
      label: "Long-form YouTube",
      query: "edit video recordings youtube",
    },
    {
      id: "podcast-clips",
      label: "Podcast clips",
      query: "edit podcasts create clips transcribe media",
    },
    {
      id: "instagram-reels",
      label: "Instagram Reels",
      query: "edit reels short videos social templates",
    },
    {
      id: "captions",
      label: "Captions/subtitles",
      query: "caption short videos transcribe media",
    },
    {
      id: "voiceover",
      label: "Voiceover",
      query: "generate narration prototype voiceovers voice",
      goalQuery: "audio voiceover video",
    },
  ],
  writing: [
    { id: "blog", label: "Blog posts", query: "outline articles draft blog posts" },
    {
      id: "newsletters",
      label: "Email newsletters",
      query: "draft emails produce marketing copy email",
    },
    {
      id: "english",
      label: "Better English",
      query: "polish messages adjust tone rewrite passages",
    },
    {
      id: "freelance",
      label: "Freelance writing",
      query: "edit articles develop messaging draft briefs",
    },
    {
      id: "seo-writing",
      label: "SEO writing",
      query: "outline articles marketing seo workflow web copy",
    },
    {
      id: "captions",
      label: "Social captions",
      query: "produce marketing copy social media captions",
    },
  ],
  images: [
    {
      id: "social-posts",
      label: "Social media posts",
      query: "create social posts generate social graphics",
    },
    { id: "logos", label: "Logos", query: "test logo directions design branding" },
    {
      id: "mockups",
      label: "Product mockups",
      query: "generate product visuals create asset concepts",
    },
    {
      id: "thumbnails",
      label: "Thumbnails",
      query: "generate social graphics create image concepts",
    },
    {
      id: "pinterest",
      label: "Pinterest pins",
      query: "create social posts design graphics templates",
    },
    {
      id: "ai-art",
      label: "AI art",
      query: "develop visual concepts explore styles illustration",
      goalQuery: "images illustration visual art",
    },
  ],
  growth: [
    {
      id: "seo",
      label: "SEO",
      query: "outline articles marketing seo workflow web copy",
      goalQuery: "writing marketing research",
    },
    {
      id: "email-marketing",
      label: "Email marketing",
      query: "produce marketing copy draft emails campaign copy",
      goalQuery: "writing marketing email",
    },
    {
      id: "scheduling",
      label: "Social scheduling",
      query: "automate content handoffs create social posts social media",
      goalQuery: "automation design social media",
    },
    {
      id: "etsy",
      label: "Etsy sellers",
      query: "generate product visuals create social posts marketing",
      goalQuery: "design images marketing",
    },
    {
      id: "real-estate",
      label: "Real estate content",
      query: "produce marketing copy create social posts campaigns",
      goalQuery: "writing design marketing",
    },
    {
      id: "small-business",
      label: "Small business marketing",
      query: "produce marketing copy create social posts campaign assets",
      goalQuery: "writing design marketing",
    },
  ],
  automation: [
    {
      id: "calendar",
      label: "Content calendar",
      query: "automate content handoffs organize tasks content",
    },
    {
      id: "repetitive",
      label: "Repetitive tasks",
      query: "connect form workflows trigger follow-ups workflow automation",
    },
    {
      id: "research",
      label: "Research",
      query: "research competitors collect source links brief topics",
      goalQuery: "research sources",
    },
    {
      id: "summaries",
      label: "Summaries",
      query: "summarize incoming items summarize documents",
      goalQuery: "productivity research automation",
    },
    {
      id: "no-code",
      label: "No-code workflows",
      query: "connect form workflows automate content handoffs no code",
    },
    {
      id: "crm",
      label: "CRM/admin tasks",
      query: "route leads process leads trigger follow-ups",
    },
  ],
  free: [
    {
      id: "free-writing",
      label: "Free writing tools",
      query: "writing polish messages draft emails",
      goalQuery: "writing",
    },
    {
      id: "free-video",
      label: "Free video tools",
      query: "video create clips edit reels",
      goalQuery: "video",
    },
    {
      id: "free-images",
      label: "Free image tools",
      query: "images create social posts generate image concepts",
      goalQuery: "design images",
    },
    {
      id: "free-automation",
      label: "Free automation tools",
      query: "automation connect form workflows no code",
      goalQuery: "automation",
    },
    {
      id: "free-seo",
      label: "Free SEO tools",
      query: "seo outline articles marketing research",
      goalQuery: "writing marketing research",
    },
  ],
};

const BUDGETS: readonly Choice<RecommendationBudget>[] = [
  { id: "free", label: "Free" },
  { id: "under20", label: "Under $20/month" },
  { id: "under50", label: "Under $50/month" },
  { id: "premium", label: "Best regardless of price" },
];

const SKILL_LEVELS: readonly Choice<SkillLevel>[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const PRIORITIES: readonly Choice<RecommendationPriority>[] = [
  { id: "fastest", label: "Fastest workflow" },
  { id: "quality", label: "Best quality" },
  { id: "easy", label: "Easiest setup" },
  { id: "free", label: "Best free plan" },
  { id: "professional", label: "Professional control" },
];

const INITIAL_ANSWERS: FinderAnswers = {
  goal: null,
  useCase: null,
  budget: null,
  skillLevel: null,
  priority: null,
};

function RecommendationBadge({ label }: { readonly label: string }) {
  return (
    <span className="ateflo-star-badge inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800 ring-1 ring-teal-100">
      <span aria-hidden="true" className="ateflo-star-badge__icon">
        ✦
      </span>
      {label}
    </span>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
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
      {label}
    </button>
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
      className={`rounded-3xl border bg-white p-5 shadow-sm ateflo-card-lift sm:p-6 ${
        rank === 1
          ? "border-teal-200 ring-1 ring-teal-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ToolIcon {...tool} size={26} />
          <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900">
            {tool.name}
          </h3>
          {rank === 1 ? (
            <RecommendationBadge label="Top pick" />
          ) : (
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
              Option {rank}
            </span>
          )}
        </div>
      </div>

      <p className="ateflo-clamp-2 mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-3">
        <BadgeRow badges={getToolBadges(tool, rank === 1)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Why this fits</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-4 text-sm font-semibold text-slate-900">Fit signals</p>
          <MetricBars tool={tool} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-teal-50/70 p-3.5">
          <p className="text-sm font-semibold text-slate-900">Best for</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {tool.bestFor.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-teal-700">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3.5">
          <p className="text-sm font-semibold text-slate-900">Not for</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {tool.notFor.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-amber-50/60 p-3.5">
          <p className="text-sm font-semibold text-slate-900">Avoid if</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {tool.avoidIf.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <p className="font-semibold text-slate-900">Pricing note</p>
          <p className="text-slate-600">
            Free plan: {tool.freePlan ? "Available" : "Not listed"}
          </p>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {tool.pricingNote}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionLinks
          items={[
            {
              href: visitUrl,
              label: "Visit Site",
              external: true,
              tone: "primary",
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
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
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

  const input =
    answers.goal &&
    answers.useCase &&
    answers.budget &&
    answers.skillLevel &&
    answers.priority
      ? {
          goal: answers.useCase.goalQuery ?? answers.goal.query,
          useCase: answers.useCase.query,
          budget: answers.budget,
          skillLevel: answers.skillLevel,
          priority: answers.priority,
        }
      : null;
  const recommendations = input ? getRecommendedTools(input) : [];
  const selectedUseCases = answers.goal ? USE_CASES[answers.goal.id] : [];
  const isResultsStep = step === 5 && recommendations.length > 0;

  function chooseGoal(goal: GoalChoice) {
    setAnswers({
      goal,
      useCase: null,
      budget: null,
      skillLevel: null,
      priority: null,
    });
    setStep(1);
  }

  function chooseUseCase(useCase: UseCaseChoice) {
    setAnswers((current) => ({
      ...current,
      useCase,
      budget: null,
      skillLevel: null,
      priority: null,
    }));
    setStep(2);
  }

  function chooseBudget(budget: RecommendationBudget) {
    setAnswers((current) => ({
      ...current,
      budget,
      skillLevel: null,
      priority: null,
    }));
    setStep(3);
  }

  function chooseSkillLevel(skillLevel: SkillLevel) {
    setAnswers((current) => ({ ...current, skillLevel, priority: null }));
    setStep(4);
  }

  function choosePriority(priority: RecommendationPriority) {
    setAnswers((current) => ({ ...current, priority }));
    setStep(5);
  }

  function resetFinder() {
    setAnswers({ ...INITIAL_ANSWERS });
    setCompareOpen(null);
    setStep(0);
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <SiteHeader active="finder" className="mb-7 rounded-3xl border border-slate-200 shadow-sm sm:mb-10" />
        <header className="mb-7 sm:mb-10">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            What are you trying to finish?
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Make five simple choices. AteFlo starts with the output you need to
            finish, then narrows the workflow and tool options that fit.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            {["Output first", "Workflow fit", "Tools second"].map((label) => (
              <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-2">
                {label}
              </span>
            ))}
          </div>
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
              {step === 0 && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    What do you need to finish?
                  </h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {GOALS.map((goal) => (
                      <OptionButton
                        key={goal.id}
                        label={goal.label}
                        selected={answers.goal?.id === goal.id}
                        onClick={() => chooseGoal(goal)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Which specific workflow fits best?
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Selected: {answers.goal?.label}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedUseCases.map((useCase) => (
                      <OptionButton
                        key={useCase.id}
                        label={useCase.label}
                        selected={answers.useCase?.id === useCase.id}
                        onClick={() => chooseUseCase(useCase)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    What is your budget?
                  </h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {BUDGETS.map((budget) => (
                      <OptionButton
                        key={budget.id}
                        label={budget.label}
                        selected={answers.budget === budget.id}
                        onClick={() => chooseBudget(budget.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    What is your skill level?
                  </h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {SKILL_LEVELS.map((level) => (
                      <OptionButton
                        key={level.id}
                        label={level.label}
                        selected={answers.skillLevel === level.id}
                        onClick={() => chooseSkillLevel(level.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    What matters most?
                  </h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PRIORITIES.map((priority) => (
                      <OptionButton
                        key={priority.id}
                        label={priority.label}
                        selected={answers.priority === priority.id}
                        onClick={() => choosePriority(priority.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {isResultsStep && (
            <div className="mt-8">
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-50 px-3 py-2">
                  {answers.goal?.label}
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-2">
                  {answers.useCase?.label}
                </span>
              </div>
            </div>
          )}
        </section>

        {isResultsStep && (
          <section id="finder-results" aria-live="polite" className="mt-8">
            <div className="mb-6">
              <p className="text-sm font-medium text-teal-700">Shortcut match</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                Your best workflow fit
              </h2>
            </div>
            <div className="space-y-4 sm:space-y-5">
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
