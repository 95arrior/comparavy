"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ShortcutDiscoveryItem {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly input: string;
  readonly output: string;
  readonly skillLevel: string;
  readonly timeEstimate?: string;
  readonly guideTypeLabel: string;
  readonly topicCluster?: string;
  readonly toolNames: readonly string[];
  readonly searchText: string;
}

interface ShortcutsDiscoveryProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export default function ShortcutsDiscovery({ shortcuts }: ShortcutsDiscoveryProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) {
      return shortcuts;
    }

    return shortcuts.filter((shortcut) =>
      shortcut.searchText.includes(normalizedQuery),
    );
  }, [normalizedQuery, shortcuts]);

  return (
    <section className="mt-6">
      <label htmlFor="shortcut-search" className="sr-only">
        Search shortcuts
      </label>
      <input
        id="shortcut-search"
        type="search"
        value={query}
        placeholder="Search shortcuts by task, input, output, or tool..."
        data-event="shortcuts_search_used"
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400"
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-500">
        <p>
          {filteredShortcuts.length} of {shortcuts.length} shortcuts
        </p>
      </div>

      {filteredShortcuts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ateflo-reveal">
          <p className="text-lg font-semibold text-slate-950">
            No matching shortcuts yet.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Try a different task, or use Finder to narrow your workflow.
          </p>
          <Link
            href="/finder"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Open Finder
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filteredShortcuts.map((shortcut, index) => (
            <article
              key={shortcut.slug}
              className={`group flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ateflo-card-lift ateflo-reveal sm:p-6 ${
                index % 2 === 1 ? "ateflo-reveal-delay-1" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                  {shortcut.category}
                </span>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {shortcut.guideTypeLabel}
                </span>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {shortcut.timeEstimate ?? shortcut.skillLevel}
                </span>
              </div>

              <h2 className="ateflo-clamp-2 mt-4 text-xl font-semibold leading-7 tracking-tight text-slate-950 sm:text-2xl sm:leading-8">
                <Link
                  href={`/guides/${shortcut.slug}`}
                  data-event="shortcut_card_click"
                  data-guide-slug={shortcut.slug}
                  data-action-location="shortcuts_listing_title"
                  className="transition group-hover:text-teal-800 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  {shortcut.title}
                </Link>
              </h2>

              <p className="ateflo-clamp-3 mt-3 text-sm leading-7 text-slate-600">
                {shortcut.summary}
              </p>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                  Input -&gt; Output
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Input
                    </dt>
                    <dd className="ateflo-clamp-2 mt-1 leading-6 text-slate-700">
                      {shortcut.input}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Output
                    </dt>
                    <dd className="ateflo-clamp-2 mt-1 leading-6 text-slate-700">
                      {shortcut.output}
                    </dd>
                  </div>
                </dl>
              </div>

              {shortcut.toolNames.length > 0 && (
                <p className="ateflo-clamp-1 mt-4 text-sm text-slate-500">
                  Tools: {shortcut.toolNames.join(", ")}
                </p>
              )}

              <div className="mt-auto pt-5">
                <Link
                  href={`/guides/${shortcut.slug}`}
                  data-event="shortcut_card_click"
                  data-guide-slug={shortcut.slug}
                  data-action-location="shortcuts_listing_button"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Open Shortcut
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
