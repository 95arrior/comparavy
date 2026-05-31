import Link from "next/link";
import GuideToolActions from "@/components/guides/GuideToolActions";
import ToolIcon from "@/components/ToolIcon";
import { resolveGuideTool } from "@/lib/guideTools";

interface GuideToolCardProps {
  readonly toolSlug: string;
  readonly toolName: string;
  readonly role?: string;
  readonly bestUseCase?: string;
  readonly useItWhen?: string;
  readonly avoidItIf?: string;
  readonly watchFor?: string;
  readonly practicalExample?: string;
  readonly sourcePage?: string;
  readonly guideSlug?: string;
  readonly compact?: boolean;
  readonly highlight?: boolean;
}

export default function GuideToolCard({
  toolSlug,
  toolName,
  role,
  bestUseCase,
  useItWhen,
  avoidItIf,
  watchFor,
  practicalExample,
  sourcePage,
  guideSlug,
  compact = false,
  highlight = false,
}: GuideToolCardProps) {
  const catalogTool = resolveGuideTool(toolSlug, toolName);
  const name = catalogTool?.name ?? toolName;
  const slug = catalogTool?.slug ?? toolSlug;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm ${
        highlight ? "border-teal-200 bg-teal-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {catalogTool ? (
          <ToolIcon {...catalogTool} size={24} />
        ) : (
          <ToolIcon name={name} slug={slug} size={24} />
        )}
        <h3 className="min-w-0 flex-1 truncate whitespace-nowrap text-base font-semibold tracking-tight text-slate-900">
          <Link href={`/tools/${slug}`} className="block truncate transition hover:text-teal-700">
            {name}
          </Link>
        </h3>
      </div>

      {role && (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">Role: </span>
          {role}
        </p>
      )}
      {bestUseCase && (
        <p className="mt-2 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">Best use: </span>
          {bestUseCase}
        </p>
      )}

      {!compact && (
        <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
          {useItWhen && (
            <p>
              <span className="font-semibold text-slate-900">Use it when: </span>
              {useItWhen}
            </p>
          )}
          {avoidItIf && (
            <p>
              <span className="font-semibold text-slate-900">Avoid it if: </span>
              {avoidItIf}
            </p>
          )}
          {watchFor && (
            <p>
              <span className="font-semibold text-slate-900">Watch for: </span>
              {watchFor}
            </p>
          )}
          {practicalExample && (
            <p>
              <span className="font-semibold text-slate-900">Example: </span>
              {practicalExample}
            </p>
          )}
        </div>
      )}

      <GuideToolActions
        className="mt-auto pt-4"
        slug={slug}
        name={name}
        officialUrl={catalogTool?.officialUrl}
        affiliateUrl={catalogTool?.affiliateUrl}
        sourcePage={sourcePage}
        guideSlug={guideSlug}
      />
    </article>
  );
}
