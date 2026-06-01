import type { Guide } from "@/lib/guides";
import { guideWorksWithTools } from "@/lib/shortcutDiscovery";

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

function bestFor(guide: Guide): string {
  if (guide.persona?.trim()) {
    return guide.persona;
  }

  if (guide.audience?.trim()) {
    return guide.audience;
  }

  return guide.useCase;
}

export default function ShortcutBrief({ guide }: ShortcutBriefProps) {
  const worksWith = guideWorksWithTools(guide)
    .slice(0, 3)
    .map((tool) => tool.name)
    .join(", ");
  const items = [
    {
      label: "You'll make",
      value: finishedOutput(guide),
    },
    {
      label: "You'll need",
      value: firstNeed(guide),
    },
    {
      label: "Time estimate",
      value: guide.timeEstimate ?? "One focused first pass plus review.",
    },
    {
      label: "Best for",
      value: bestFor(guide),
    },
  ];
  const toolSummary = worksWith || "ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.";

  return (
    <section className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Action summary
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            Use this shortcut when you want the prompt first.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-slate-600">
          Works with {toolSummary}.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {item.label}
            </p>
            <p className="ateflo-clamp-3 mt-1.5 break-words text-sm leading-6 text-slate-800">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
