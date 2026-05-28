import Link from "next/link";
import BadgeRow, { getToolBadges } from "@/components/BadgeRow";
import MetricBars from "@/components/MetricBars";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { Guide } from "@/lib/guides";

interface QuickSummaryCardProps {
  readonly guide: Guide;
}

export default function QuickSummaryCard({ guide }: QuickSummaryCardProps) {
  const primaryTool = toolsBySlug.get(guide.recommendedToolSlugs[0] as ToolSlug);

  if (!primaryTool) {
    return null;
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-7 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            At a glance
          </p>
          <div className="mt-4 flex min-w-0 items-center gap-3">
            <ToolIcon {...primaryTool} size={28} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Start with</p>
              <h2 className="truncate whitespace-nowrap text-2xl font-semibold tracking-tight text-slate-900">
                <Link
                  href={`/tools/${primaryTool.slug}`}
                  className="block truncate transition hover:text-teal-700"
                >
                  {primaryTool.name}
                </Link>
              </h2>
            </div>
          </div>
          <div className="mt-5">
            <BadgeRow badges={getToolBadges(primaryTool)} />
          </div>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
            {guide.visualSummary.points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {guide.affiliateDisclosureNote && (
            <p className="mt-5 text-xs leading-6 text-slate-500">
              {guide.affiliateDisclosureNote}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="mb-5 text-sm font-semibold text-slate-900">
            Tool fit signals
          </p>
          <MetricBars tool={primaryTool} />
        </div>
      </div>
    </section>
  );
}
