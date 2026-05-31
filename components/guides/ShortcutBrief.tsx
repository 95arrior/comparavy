import type { Guide } from "@/lib/guides";

interface ShortcutBriefProps {
  readonly guide: Guide;
}

function firstNeed(guide: Guide): string {
  if (Array.isArray(guide.whatYouNeed) && guide.whatYouNeed.length > 0) {
    return guide.whatYouNeed[0];
  }

  if (typeof guide.whatYouNeed === "string" && guide.whatYouNeed.trim()) {
    return guide.whatYouNeed;
  }

  return guide.userPain;
}

function finishedOutput(guide: Guide): string {
  const stepOutput = guide.steps
    ?.filter((step) => step.output?.trim())
    .at(-1)
    ?.output;

  return (
    stepOutput ??
    guide.visualSummary?.headline ??
    guide.exampleResult ??
    `A reviewed output for ${guide.useCase}.`
  );
}

export default function ShortcutBrief({ guide }: ShortcutBriefProps) {
  const items = [
    {
      label: "Input you have",
      value: firstNeed(guide),
    },
    {
      label: "What you'll finish",
      value: finishedOutput(guide),
    },
    {
      label: "Prompt builder",
      value:
        "Fill in a few details, copy one generated prompt, then paste it into your AI chat tool.",
    },
    {
      label: "Review step",
      value:
        "Check names, dates, claims, missing details, and sensitive information before using the result.",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            AI Shortcut brief
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            From rough input to finished output
          </h2>
        </div>
        {guide.timeEstimate && (
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            {guide.timeEstimate}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 break-words text-sm leading-7 text-slate-800">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
