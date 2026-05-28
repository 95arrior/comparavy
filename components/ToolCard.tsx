import Link from "next/link";
import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import ToolIcon from "@/components/ToolIcon";
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

interface ToolCardProps {
  readonly tool: AiTool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 sm:p-6">
      <div className="flex items-start gap-3">
        <ToolIcon {...tool} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">
              {formatCategory(tool.category)}
            </span>
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {formatBudgetLabel(tool.budgetLevel)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            <Link
              href={`/tools/${tool.slug}`}
              className="transition hover:text-teal-700"
            >
              {tool.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Setup: {tool.setupDifficulty}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <BadgeRow badges={getToolBadges(tool)} />
      </div>

      <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <MetricBars tool={tool} compact />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Pricing checked {tool.pricingLastChecked}
        </p>
        <Link
          href={`/tools/${tool.slug}`}
          className="rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          View tool page
        </Link>
      </div>
    </article>
  );
}
