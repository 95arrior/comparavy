import TopCopyPromptButton from "@/components/guides/TopCopyPromptButton";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import type { Guide } from "@/lib/guides";

interface EditorialHeroProps {
  readonly guide: Guide;
}

function chipValues(guide: Guide): readonly string[] {
  return [
    guide.primaryKeyword,
    guide.audience,
    guide.skillLevel,
    guide.deviceIntent ?? "both",
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export default function EditorialHero({ guide }: EditorialHeroProps) {
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
    <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm ateflo-reveal sm:px-10 sm:py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        AteFlo AI Shortcut · {formatGuideLayoutLabel(guideType)}
      </p>
      <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        {guide.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
        {guide.quickAnswer ?? guide.quickDecision ?? guide.quickVerdict}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {chipValues(guide).slice(0, 4).map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
              index === 0 ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-600"
            }`}
          >
            {value}
          </span>
        ))}
      </div>

      <div className="mt-6">
        <TopCopyPromptButton guideSlug={guide.slug} />
      </div>
    </header>
  );
}
