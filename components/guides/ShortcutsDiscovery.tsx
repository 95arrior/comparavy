"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ToolIcon from "@/components/ToolIcon";
import { trackEvent } from "@/lib/analytics";

export interface ShortcutWorksWithTool {
  readonly slug: string;
  readonly name: string;
  readonly officialUrl?: string;
  readonly iconPath?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
}

export interface ShortcutDiscoveryItem {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly skillLevel: string;
  readonly timeEstimate?: string;
  readonly guideTypeLabel: string;
  readonly topicCluster?: string;
  readonly worksWithTools: readonly ShortcutWorksWithTool[];
  readonly searchText: string;
}

interface ShortcutsDiscoveryProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

const SEARCH_CHIPS = [
  "Meeting notes",
  "Etsy listing",
  "Follow-up email",
  "Product description",
] as const;

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ShortcutsDiscovery({ shortcuts }: ShortcutsDiscoveryProps) {
  const [query, setQuery] = useState("");
  const trackedSearches = useRef<Set<string>>(new Set());
  const normalizedQuery = normalizeSearch(query);
  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) {
      return shortcuts;
    }

    return shortcuts.filter((shortcut) =>
      normalizeSearch(shortcut.searchText).includes(normalizedQuery),
    );
  }, [normalizedQuery, shortcuts]);

  useEffect(() => {
    if (normalizedQuery.length < 2 || trackedSearches.current.has(normalizedQuery)) {
      return;
    }

    const timer = window.setTimeout(() => {
      trackedSearches.current.add(normalizedQuery);
      trackEvent("shortcuts_search_used", {
        source_page: "guides",
        search_query_length: query.trim().length,
        result_count: filteredShortcuts.length,
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [filteredShortcuts.length, normalizedQuery, query]);

  function matchingShortcutCount(chip: string): number {
    const normalizedChip = normalizeSearch(chip);

    return shortcuts.filter((shortcut) =>
      normalizeSearch(shortcut.searchText).includes(normalizedChip),
    ).length;
  }

  function handleSearchChipClick(chip: string) {
    setQuery(chip);
    trackEvent("search_chip_click", {
      source_page: "guides",
      chip_label: chip,
      result_count: matchingShortcutCount(chip),
    });
  }

  function trackShortcutClick(shortcut: ShortcutDiscoveryItem) {
    trackEvent("shortcut_card_click", {
      source_page: "guides",
      destination_slug: shortcut.slug,
      destination_title: shortcut.title,
    });
  }

  return (
    <section className="mt-5 sm:mt-6">
      <div className="rounded-3xl border border-teal-100 bg-white p-3 shadow-sm ateflo-reveal sm:p-4">
        <div className="mb-4 px-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            What are you trying to finish?
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Search for a shortcut by task, input, output, or tool.
          </p>
        </div>
        <label htmlFor="shortcut-search" className="sr-only">
          Search shortcuts
        </label>
        <input
          id="shortcut-search"
          type="search"
          value={query}
          placeholder="Search “meeting notes”, “Etsy listing”, “follow-up email”..."
          data-event="shortcuts_search_used"
          className="min-h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-3 flex items-center justify-between gap-4 px-1 text-sm text-slate-500">
          <p>
            {filteredShortcuts.length} of {shortcuts.length} shortcuts
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 px-1">
          {SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-event="search_chip_click"
              data-search-chip={chip}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              onClick={() => handleSearchChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {filteredShortcuts.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ateflo-reveal sm:mt-7">
          <p className="text-lg font-semibold text-slate-950">
            No matching shortcuts yet.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Try a different task, or use Finder to narrow your workflow.
          </p>
          <Link
            href="/finder"
            data-event="finder_cta_click"
            data-action-location="shortcuts_search_empty_state"
            onClick={() =>
              trackEvent("finder_cta_click", {
                source_page: "guides",
                action_location: "shortcuts_search_empty_state",
              })
            }
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Open Finder
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 sm:mt-7">
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
                <span className="text-xs font-medium text-slate-500">
                  {shortcut.guideTypeLabel} · {shortcut.timeEstimate ?? shortcut.skillLevel}
                </span>
              </div>

              <h2 className="ateflo-clamp-2 mt-4 text-xl font-semibold leading-7 tracking-tight text-slate-950 sm:text-2xl sm:leading-8 md:min-h-16">
                <Link
                  href={`/guides/${shortcut.slug}`}
                  data-event="shortcut_card_click"
                  data-guide-slug={shortcut.slug}
                  data-action-location="shortcuts_listing_title"
                  onClick={() => trackShortcutClick(shortcut)}
                  className="transition group-hover:text-teal-800 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  {shortcut.title}
                </Link>
              </h2>

              <p className="ateflo-clamp-3 mt-3 text-sm leading-7 text-slate-600 md:min-h-[5.25rem]">
                {shortcut.summary}
              </p>

              {shortcut.worksWithTools.length > 0 && (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Works with
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {shortcut.worksWithTools.map((tool, toolIndex) => (
                      <span
                        key={tool.slug}
                        className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-800"
                      >
                        <ToolIcon
                          {...tool}
                          size={22}
                          loading={index === 0 && toolIndex < 2 ? "eager" : "lazy"}
                        />
                        <span className="truncate">{tool.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-5">
                <Link
                  href={`/guides/${shortcut.slug}`}
                  data-event="shortcut_card_click"
                  data-guide-slug={shortcut.slug}
                  data-action-location="shortcuts_listing_button"
                  onClick={() => trackShortcutClick(shortcut)}
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
