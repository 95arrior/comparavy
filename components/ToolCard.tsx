import Link from "next/link";
import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import GuideToolActions from "@/components/guides/GuideToolActions";
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
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ateflo-card-lift sm:p-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <ToolIcon {...tool} size={24} />
        <h2 className="min-w-0 flex-1 truncate whitespace-nowrap text-base font-semibold tracking-tight text-slate-900">
          <Link href={`/tools/${tool.slug}`} className="block truncate transition hover:text-teal-700">
            {tool.name}
          </Link>
        </h2>
        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {tool.setupDifficulty} setup
        </span>
      </div>

      <p className="ateflo-clamp-2 mt-3 text-sm leading-6 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
          {formatCategory(tool.category)}
        </span>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {formatBudgetLabel(tool.budgetLevel)}
        </span>
        {tool.freePlan && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            Free plan
          </span>
        )}
      </div>

      <div className="mt-3">
        <BadgeRow badges={getToolBadges(tool)} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
        <MetricBars tool={tool} compact />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Key tags
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {tool.primaryTags.join(" · ")}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Pricing checked {tool.pricingLastChecked}
        </p>
        <GuideToolActions
          slug={tool.slug}
          name={tool.name}
          officialUrl={tool.officialUrl}
          affiliateUrl={tool.affiliateUrl}
        />
      </div>
    </article>
  );
}
