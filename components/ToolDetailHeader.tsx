import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import type { AiTool } from "@/types/tool";

function formatCategory(category: AiTool["category"]): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBudgetLabel(budgetLevel: AiTool["budgetLevel"]): string {
  switch (budgetLevel) {
    case "free":
      return "Free";
    case "under20":
      return "Under $20";
    case "under50":
      return "Under $50";
    case "premium":
      return "Premium";
    default:
      return budgetLevel;
  }
}

interface ToolDetailHeaderProps {
  readonly tool: AiTool;
}

export default function ToolDetailHeader({ tool }: ToolDetailHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {tool.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">
              {formatCategory(tool.category)}
            </span>
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {formatBudgetLabel(tool.budgetLevel)}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            {tool.description}
          </p>
          <div className="mt-5">
            <BadgeRow badges={getToolBadges(tool)} />
          </div>
        </div>

        <dl className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:min-w-72">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Setup difficulty
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{tool.setupDifficulty}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pricing
            </dt>
            <dd className="mt-1 font-medium text-slate-800">
              {tool.freePlan ? "Free plan available" : "Paid plan focused"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pricing checked
            </dt>
            <dd className="mt-1 font-medium text-slate-800">
              {tool.pricingLastChecked}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
