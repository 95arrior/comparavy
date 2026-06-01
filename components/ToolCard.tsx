import Link from "next/link";
import BadgeRow, { getToolCardBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import GuideToolActions from "@/components/guides/GuideToolActions";
import ToolIcon from "@/components/ToolIcon";
import ToolTagChips from "@/components/ToolTagChips";
import type { AiTool } from "@/types/tool";

interface ToolCardProps {
  readonly tool: AiTool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="flex h-full min-h-[590px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ateflo-card-lift sm:p-5">
      <div className="flex min-h-12 min-w-0 items-center gap-2.5">
        <ToolIcon {...tool} size={24} />
        <h2 className="min-w-0 flex-1 truncate whitespace-nowrap text-base font-semibold tracking-tight text-slate-900">
          <Link href={`/tools/${tool.slug}`} className="block truncate transition hover:text-teal-700">
            {tool.name}
          </Link>
        </h2>
      </div>

      <p className="ateflo-clamp-2 mt-3 min-h-12 text-sm leading-6 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-3 min-h-[58px] overflow-hidden">
        <BadgeRow badges={getToolCardBadges(tool)} maxVisible={3} />
      </div>

      <div className="mt-4 min-h-[132px] rounded-2xl bg-slate-50 p-3.5">
        <MetricBars tool={tool} compact />
      </div>

      <div className="mt-4 min-h-[116px] rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Key tags
        </p>
        <div className="mt-2 max-h-[62px] overflow-hidden">
          <ToolTagChips tags={tool.primaryTags} maxVisible={4} />
        </div>
      </div>

      <div className="mt-auto flex flex-col justify-end gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Pricing checked {tool.pricingLastChecked}
        </p>
        <GuideToolActions
          slug={tool.slug}
          name={tool.name}
          officialUrl={tool.officialUrl}
          affiliateUrl={tool.affiliateUrl}
          sourcePage="tools_directory"
          layout="grid"
        />
      </div>
    </article>
  );
}
