import Link from "next/link";
import ToolIcon from "@/components/ToolIcon";
import type { AiTool } from "@/types/tool";

interface AlternativeToolsProps {
  readonly currentTool: AiTool;
  readonly alternatives: readonly AiTool[];
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
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
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm comparavy-reveal"
    >
      <div>
        <p className="text-sm font-semibold text-teal-700">Alternatives</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Compare {currentTool.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Open the official site or jump to the related tool page.
        </p>
      </div>

      <div className="mt-5 grid gap-2.5">
        {alternatives.map((alternative) => (
          <div
            key={alternative.slug}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <ToolIcon {...alternative} size={22} />
              <Link
                href={`/tools/${alternative.slug}`}
                className="min-w-0 truncate whitespace-nowrap text-sm font-semibold leading-6 text-slate-900 transition group-hover:text-teal-800"
              >
                {alternative.name}
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href={alternative.affiliateUrl ?? alternative.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${alternative.name} official site`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-white transition hover:-translate-y-0.5 hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <HomeIcon />
              </a>
              <Link
                href={`/tools/${alternative.slug}`}
                aria-label={`View ${alternative.name} tool page`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <SearchIcon />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
