import Link from "next/link";
import ToolIcon from "@/components/ToolIcon";
import type { AiTool } from "@/types/tool";

interface AlternativeToolsProps {
  readonly currentTool: AiTool;
  readonly alternatives: readonly AiTool[];
}

export default function AlternativeTools({
  currentTool,
  alternatives,
}: AlternativeToolsProps) {
  if (alternatives.length === 0) {
    return null;
  }

  return (
    <section
      id="alternatives"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Alternatives</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Compare {currentTool.name} with related tools
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Pick a close match before you subscribe.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {alternatives.map((alternative) => (
          <Link
            key={alternative.slug}
            href={`/tools/${alternative.slug}`}
            className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <div className="flex items-center gap-2">
              <ToolIcon {...alternative} size={25} className="shrink-0" />
              <p className="min-w-0 font-semibold leading-6 text-slate-900 transition group-hover:text-teal-800">
                {alternative.name}
              </p>
            </div>
            <div className="mt-2">
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {alternative.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
