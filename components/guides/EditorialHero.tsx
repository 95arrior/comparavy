import TopCopyPromptButton from "@/components/guides/TopCopyPromptButton";
import type { Guide } from "@/lib/guides";

interface EditorialHeroProps {
  readonly guide: Guide;
}

function formatSkillLevel(value: Guide["skillLevel"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function heroSummary(guide: Guide): string {
  switch (guide.slug) {
    case "how-to-turn-meeting-notes-into-a-client-recap-with-ai":
      return "You have meeting notes. Use this shortcut to create a clear client recap and follow-up email, then check owners, deadlines, and open questions before sending.";
    case "best-ai-tools-for-etsy-product-descriptions":
      return "You have product details. Use this shortcut to create an Etsy listing draft, then review the facts, claims, and missing seller inputs before publishing.";
    default:
      return guide.quickAnswer ?? guide.quickDecision ?? guide.quickVerdict;
  }
}

export default function EditorialHero({ guide }: EditorialHeroProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-sm ateflo-reveal sm:px-8 sm:py-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        AteFlo AI Shortcut
      </p>
      <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
        {guide.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
        {heroSummary(guide)}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
        {[
          formatSkillLevel(guide.skillLevel),
          guide.timeEstimate,
          guide.category,
          "Works in AI chat tools",
        ]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value, index) => (
            <span
              key={`${value}-${index}`}
              className={`rounded-full px-3 py-1.5 ${
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
