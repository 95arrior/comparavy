import Link from "next/link";
import ToolIcon from "@/components/ToolIcon";
import { toolsBySlug } from "@/data/tools";
import type { GuideToolUse } from "@/lib/guides";

interface ToolStackCardProps {
  readonly title?: string;
  readonly description?: string;
  readonly tools: readonly GuideToolUse[];
}

export default function ToolStackCard({
  title = "Tools you can use",
  description,
  tools,
}: ToolStackCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
          Tool stack
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => {
          const catalogTool = toolsBySlug.get(tool.toolSlug);

          return (
            <article
              key={tool.toolSlug}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {catalogTool ? (
                  <ToolIcon {...catalogTool} size={24} />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {tool.toolName.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate whitespace-nowrap text-sm font-semibold text-slate-900">
                    {catalogTool ? (
                      <Link
                        href={`/tools/${catalogTool.slug}`}
                        className="transition hover:text-teal-700"
                      >
                        {tool.toolName}
                      </Link>
                    ) : (
                      tool.toolName
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{tool.why}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
