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

export default function ShortcutBrief({ guide }: ShortcutBriefProps) {
  const worksWith = guideWorksWithTools(guide)
    .slice(0, 3)
    .map((tool) => tool.name)
    .join(", ");
  const items = [
    {
      label: "Input",
      value: firstNeed(guide),
    },
    {
      label: "Output",
      value: finishedOutput(guide),
    },
    {
      label: "Time",
      value: guide.timeEstimate ?? "One focused first pass plus review.",
    },
    {
      label: "Works with",
      value: worksWith || "ChatGPT, Claude, Gemini, Copilot, or another AI chat tool.",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            AI Shortcut brief
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            From rough input to finished output
          </h2>
        </div>
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
            <p className="mt-1.5 break-words text-sm leading-6 text-slate-800">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
