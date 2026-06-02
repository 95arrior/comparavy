import type { Guide } from "@/lib/guides";

interface EditorialHeroProps {
  readonly guide: Guide;
}

function heroSummary(guide: Guide): string {
  switch (guide.slug) {
    case "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai":
      return "Start with a transcript. This shortcut turns messy spoken notes into tasks, priorities, deadlines, owners, quick wins, and questions to clarify.";
    case "how-to-write-google-business-profile-posts-with-ai":
      return "Write a local update, offer, or announcement that is ready for owner review before it goes on Google Business Profile.";
    case "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic":
      return "Use real details to draft bio options that sound specific, natural, and easy to reply to.";
    case "how-to-turn-meeting-notes-into-a-client-recap-with-ai":
      return "You have meeting notes. Use this shortcut to create a clear client recap and follow-up email, then check owners, deadlines, and open questions before sending.";
    case "best-ai-tools-for-etsy-product-descriptions":
      return "You have product details. Use this shortcut to create an Etsy listing draft, then review the facts, claims, and missing seller inputs before publishing.";
    default:
      return guide.quickAnswer ?? guide.quickDecision ?? guide.quickVerdict;
  }
}

function formatSkillLevel(value: Guide["skillLevel"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function EditorialHero({ guide }: EditorialHeroProps) {
  const pills = [
    formatSkillLevel(guide.skillLevel),
    guide.timeEstimate,
    guide.category,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return (
    <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm ateflo-reveal sm:px-8 sm:py-7">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        AteFlo AI Shortcut
      </p>
      <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
        {guide.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
        {heroSummary(guide)}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {pills.map((pill) => (
          <span
            key={pill}
            className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"
          >
            {pill}
          </span>
        ))}
        <a
          href="#prompt-builder"
          className="inline-flex min-h-9 items-center rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Start shortcut
        </a>
      </div>
    </header>
  );
}
