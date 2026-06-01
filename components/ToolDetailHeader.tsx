import ActionLinks from "@/components/ActionLinks";
import BadgeRow, { getToolCardBadges } from "@/components/BadgeRow";
import ToolIcon from "@/components/ToolIcon";
import ToolTagChips from "@/components/ToolTagChips";
import type { AiTool } from "@/types/tool";

function formatCategory(category: AiTool["category"]): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

interface ToolDetailHeaderProps {
  readonly tool: AiTool;
}

export default function ToolDetailHeader({ tool }: ToolDetailHeaderProps) {
  const visitUrl = tool.affiliateUrl ?? tool.officialUrl;

  return (
    <header className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm ateflo-reveal sm:px-8 sm:py-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex min-w-0 items-center gap-3">
            <ToolIcon {...tool} size={28} loading="eager" />
            <h1 className="min-w-0 flex-1 truncate whitespace-nowrap text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {tool.name}
            </h1>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            {tool.description}
          </p>
          <div className="mt-5">
            <BadgeRow badges={getToolCardBadges(tool)} maxVisible={5} />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <ToolTagChips tags={tool.primaryTags} maxVisible={6} />
          </div>
          <ActionLinks
            className="mt-6"
            items={[
              {
                href: visitUrl,
                label: "Visit Official Site",
                external: true,
                tone: "primary",
                eventName: "tool_visit_click",
                eventParams: {
                  tool_slug: tool.slug,
                  tool_name: tool.name,
                  source_page: "tool_detail",
                },
              },
              {
                href: "#alternatives",
                label: "Compare Alternatives",
              },
              {
                href: "/finder",
                label: "Use Finder",
                eventName: "finder_cta_click",
                eventParams: {
                  source_page: "tool_detail",
                  tool_slug: tool.slug,
                  tool_name: tool.name,
                  action_location: "tool_detail_header",
                },
              },
            ]}
          />
        </div>

        <dl className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm sm:min-w-80">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Category
            </dt>
            <dd className="mt-1 font-medium text-slate-800">
              {formatCategory(tool.category)}
            </dd>
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
              Setup difficulty
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{tool.setupDifficulty}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Best for
            </dt>
            <dd className="mt-1 font-medium text-slate-800">
              {tool.bestFor[0] ?? "General use"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Official website
            </dt>
            <dd className="mt-1 break-all font-medium text-slate-800">
              {tool.officialUrl}
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
