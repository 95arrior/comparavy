import CollapsedGuideSection from "@/components/guides/CollapsedGuideSection";
import type { GuideWorkflowStep } from "@/lib/guides";

interface WorkflowStepsProps {
  readonly steps: readonly GuideWorkflowStep[];
  readonly title?: string;
  readonly description?: string;
}

export default function WorkflowSteps({
  steps,
  title = "Workflow",
  description,
}: WorkflowStepsProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <CollapsedGuideSection
      eyebrow="Step-by-step"
      title={title}
      description={description}
    >
      <ol className="mt-5 grid gap-3 lg:grid-cols-2">
        {steps.map((step, index) => (
          <li
            key={`${step.title}-${index}`}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{step.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  <span className="font-semibold text-slate-900">What to do: </span>
                  {step.detail}
                </p>
                {(step.why || step.output) && (
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                    {step.why && (
                      <p>
                        <span className="font-semibold text-slate-900">Why it matters: </span>
                        {step.why}
                      </p>
                    )}
                    {step.output && (
                      <p>
                        <span className="font-semibold text-slate-900">Expected output: </span>
                        {step.output}
                      </p>
                    )}
                  </div>
                )}
                {(step.toolName || step.toolSlug) && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {step.toolName ?? step.toolSlug}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </CollapsedGuideSection>
  );
}
