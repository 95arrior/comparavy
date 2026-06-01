import TopCopyPromptButton from "@/components/guides/TopCopyPromptButton";
import type { Guide } from "@/lib/guides";

interface EditorialHeroProps {
  readonly guide: Guide;
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

      <div className="mt-6 flex flex-wrap items-start gap-3">
        <TopCopyPromptButton guideSlug={guide.slug} />
        <a
          href="#prompt-builder"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Fill in details
        </a>
      </div>
    </header>
  );
}
