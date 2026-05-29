import SectionHeading from "@/components/SectionHeading";
import ToolIcon from "@/components/ToolIcon";
import { resolveGuideTool } from "@/lib/guideTools";
import type { GuideDecisionStep } from "@/lib/guides";

interface DecisionTreeProps {
  readonly title?: string;
  readonly description?: string;
  readonly steps: readonly GuideDecisionStep[];
}

function formatSituation(value: string): string {
  return /^\s*if\b/i.test(value) ? value : `If ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export default function DecisionTree({
  title = "Which one should you choose?",
  description = "Use the branch that matches your real constraint first. Then read the tool cards only if you need more detail.",
  steps,
}: DecisionTreeProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading eyebrow="Decision tree" description={description}>
        {title}
      </SectionHeading>
      <div className="mt-5 grid gap-3">
        {steps.map((step, index) => {
          const tool = resolveGuideTool(undefined, step.recommendation);

          return (
            <article
              key={`${step.situation}-${index}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-6 text-slate-900">
                    {formatSituation(step.situation)}
                  </p>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    {tool && <ToolIcon {...tool} size={22} />}
                    <p className="truncate whitespace-nowrap text-sm font-semibold text-teal-800">
                      Choose {tool?.name ?? step.recommendation}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.reason}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
