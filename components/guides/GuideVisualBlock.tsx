import Link from "next/link";
import GuideToolActions from "@/components/guides/GuideToolActions";
import ToolIcon from "@/components/ToolIcon";
import { resolveGuideTool } from "@/lib/guideTools";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";

interface GuideVisualBlockProps {
  readonly guide: Guide;
}

function FallbackHero({ guide }: { readonly guide: Guide }) {
  const type = resolveGuideLayoutType({
    slug: guide.slug,
    title: guide.title,
    type: guide.type,
    guideType: guide.guideType,
    searchIntent: guide.searchIntent,
    decisionQuestion: guide.decisionQuestion,
    uniqueAngle: guide.uniqueAngle,
    notes: guide.contentGap,
  });
  const primaryRecommendation = guide.recommendedTools[0];
  const primaryToolSlug =
    primaryRecommendation?.toolSlug ?? guide.recommendedToolSlugs[0];
  const primaryTool = resolveGuideTool(
    primaryToolSlug,
    primaryRecommendation?.toolName,
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-5 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
        {formatGuideLayoutLabel(type)}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
        {guide.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-200">
        {guide.quickAnswer ?? guide.quickVerdict}
      </p>
      {primaryTool && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <ToolIcon {...primaryTool} size={24} className="border-white/20 bg-white" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-300">Primary tool</p>
                <p className="truncate whitespace-nowrap text-base font-semibold text-white">
                  <Link href={`/tools/${primaryTool.slug}`}>{primaryTool.name}</Link>
                </p>
              </div>
            </div>
            <GuideToolActions
              className="sm:justify-end"
              slug={primaryTool.slug}
              name={primaryTool.name}
              officialUrl={primaryTool.officialUrl}
              affiliateUrl={primaryTool.affiliateUrl}
              showViewToolPage={false}
            />
          </div>
        </div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {guide.recommendedToolSlugs.slice(0, 3).map((slug) => {
          const tool = resolveGuideTool(slug);

          return (
            <div key={slug} className="rounded-2xl bg-white/10 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {tool ? (
                  <ToolIcon {...tool} size={22} className="border-white/20 bg-white" />
                ) : (
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[8px] bg-white/20 text-[11px] font-semibold">
                    {slug.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="truncate whitespace-nowrap text-sm font-semibold text-white">
                  {tool ? <Link href={`/tools/${tool.slug}`}>{tool.name}</Link> : slug}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowCard({ guide }: { readonly guide: Guide }) {
  const steps = guide.visualAssets?.workflow?.steps ?? [
    "Problem or source material",
    "AI process",
    "Checked result",
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        Workflow diagram
      </p>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <div
            key={step}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-sm text-slate-700"
          >
            <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolStackVisual({ guide }: { readonly guide: Guide }) {
  const tools = guide.visualAssets?.toolStack?.tools ?? guide.recommendedToolSlugs.slice(0, 4);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        Tool stack
      </p>
      <div className="mt-4 grid gap-2">
        {tools.map((slug) => {
          const tool = resolveGuideTool(slug);

          return (
            <div key={slug} className="flex items-center gap-3 rounded-2xl bg-slate-50/70 p-3">
              {tool ? (
                <ToolIcon {...tool} size={24} />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  {slug.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate whitespace-nowrap text-sm font-semibold text-slate-900">
                  {tool ? <Link href={`/tools/${tool.slug}`}>{tool.name}</Link> : slug}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {tool ? tool.bestFor[0] : "Recommended workflow support"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BeforeAfterVisual({ guide }: { readonly guide: Guide }) {
  const before = guide.visualAssets?.beforeAfter?.before ?? `Before: scattered notes or a messy first draft for ${guide.searchIntent}.`;
  const after = guide.visualAssets?.beforeAfter?.after ?? `After: a checked, usable result that is ready to review, refine, or send.`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
        Before and after
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-7 text-amber-950/80">
          <p className="font-semibold text-amber-900">Before</p>
          {before}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-7 text-emerald-950/80">
          <p className="font-semibold text-emerald-900">After</p>
          {after}
        </div>
      </div>
    </div>
  );
}

export default function GuideVisualBlock({ guide }: GuideVisualBlockProps) {
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

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <FallbackHero guide={guide} />
      {guideType === "how-to" ? (
        <WorkflowCard guide={guide} />
      ) : guideType === "income" ? (
        <BeforeAfterVisual guide={guide} />
      ) : guideType === "trend-led" ? (
        <ToolStackVisual guide={guide} />
      ) : (
        <ToolStackVisual guide={guide} />
      )}
    </section>
  );
}
