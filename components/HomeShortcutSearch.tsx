"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";
import CategoryChip from "@/components/CategoryChip";
import ShortcutWorksWithCompact from "@/components/ShortcutWorksWithCompact";
import { trackEvent } from "@/lib/analytics";
import {
  normalizeSearch,
  shortcutSearchRelevance,
  type ShortcutDiscoveryItem,
} from "@/lib/shortcutDiscovery";

interface HomeShortcutSearchProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

const SEARCH_CHIPS = [
  "Voice memo",
  "Google Business Profile",
  "Dating app bio",
  "Local business post",
] as const;

export default function HomeShortcutSearch({ shortcuts }: HomeShortcutSearchProps) {
  const [query, setQuery] = useState("");
  const trackedSearches = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const hasActiveSearch = normalizedQuery.length > 0;
  const hasQueryText = query.length > 0;
  const filteredShortcuts = useMemo(() => {
    if (!hasActiveSearch) {
      return [];
    }

    return shortcuts
      .filter((shortcut) =>
        normalizeSearch(shortcut.searchText).includes(normalizedQuery),
      )
      .map((shortcut) => ({
        shortcut,
        relevance: shortcutSearchRelevance(shortcut, normalizedQuery),
      }))
      .sort((left, right) => right.relevance - left.relevance)
      .map((item) => item.shortcut);
  }, [hasActiveSearch, normalizedQuery, shortcuts]);

  function trackSearchUsage() {
    if (normalizedQuery.length < 2 || trackedSearches.current.has(normalizedQuery)) {
      return;
    }

    trackedSearches.current.add(normalizedQuery);
    trackEvent("shortcuts_search_used", {
      source_page: "home",
      search_query_length: query.trim().length,
      result_count: filteredShortcuts.length,
    });
  }

  useEffect(() => {
    if (normalizedQuery.length < 2 || trackedSearches.current.has(normalizedQuery)) {
      return;
    }

    const timer = window.setTimeout(() => {
      trackSearchUsage();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [filteredShortcuts.length, normalizedQuery, query]);

  function matchingShortcutCount(chip: string): number {
    const normalizedChip = normalizeSearch(chip);

    return shortcuts.filter((shortcut) =>
      normalizeSearch(shortcut.searchText).includes(normalizedChip),
    ).length;
  }

  function handleChipClick(chip: string) {
    setQuery(chip);
    inputRef.current?.focus();
    trackEvent("search_chip_click", {
      source_page: "home",
      chip_label: chip,
      result_count: matchingShortcutCount(chip),
    });
  }

  function handleClearSearch() {
    const previousQueryLength = query.trim().length;
    const previousResultCount = filteredShortcuts.length;

    setQuery("");
    trackEvent("shortcuts_search_cleared", {
      source_page: "home",
      previous_query_length: previousQueryLength,
      previous_result_count: previousResultCount,
      result_count: 0,
    });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function trackShortcutClick(shortcut: ShortcutDiscoveryItem, actionLocation: string) {
    trackEvent("shortcut_card_click", {
      source_page: "home",
      destination_slug: shortcut.slug,
      destination_title: shortcut.title,
      action_location: actionLocation,
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-14">
      <div className="ateflo-reveal">
        <div className="mx-auto max-w-4xl">
          <label htmlFor="home-shortcut-search" className="sr-only">
            Search shortcuts
          </label>
          <div className="ateflo-home-search-box group flex items-center gap-3 rounded-[2rem] border border-teal-200 bg-white px-4 py-3 shadow-[0_18px_55px_rgba(15,118,110,0.13)] transition focus-within:border-teal-500 focus-within:shadow-[0_22px_70px_rgba(15,118,110,0.2),0_0_0_5px_rgba(20,184,166,0.13)] sm:rounded-[2.25rem] sm:px-5 sm:py-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"
              aria-hidden="true"
            >
              <AteFloIcon name="search" className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              id="home-shortcut-search"
              type="search"
              value={query}
              placeholder="Search by task, input, or output..."
              data-event="shortcuts_search_used"
              data-action-location="home_search"
              className="ateflo-home-search-input min-h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-lg"
              onChange={(event) => setQuery(event.target.value)}
            />
            {hasQueryText && (
              <button
                type="button"
                aria-label="Clear search"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 active:scale-95 sm:h-14 sm:w-14"
                onClick={handleClearSearch}
              >
                <AteFloIcon name="close" className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-event="search_chip_click"
              data-search-chip={chip}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {hasActiveSearch && (
          <div className="mx-auto mt-7 max-w-5xl rounded-[2rem] border border-teal-100 bg-white/95 p-3 shadow-xl shadow-teal-950/5 ateflo-search-results sm:p-4">
            {filteredShortcuts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  No matching shortcuts yet.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Try another task, or browse free shortcuts.
                </p>
                <Link
                  href="/shortcuts"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Browse free shortcuts
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredShortcuts.slice(0, 4).map((shortcut, index) => (
                    <article
                      key={shortcut.slug}
                      style={{ animationDelay: `${index * 45}ms` }}
                      className="ateflo-search-result-card"
                    >
                      <Link
                        href={`/shortcuts/${shortcut.slug}`}
                        aria-label={`Open shortcut: ${shortcut.title}`}
                        data-event="shortcut_card_click"
                        data-guide-slug={shortcut.slug}
                        data-action-location="home_search_result_card"
                        onClick={() =>
                          trackShortcutClick(shortcut, "home_search_result_card")
                        }
                        className="group flex h-full cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:p-6"
                      >
                        <div>
                          <CategoryChip label={shortcut.category} />
                          <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                            <span className="transition group-hover:text-teal-800">
                              {shortcut.title}
                            </span>
                          </h2>
                          <p className="ateflo-clamp-2 mt-2 text-sm leading-6 text-slate-600">
                            {shortcut.summary}
                          </p>
                          <ShortcutWorksWithCompact shortcut={shortcut} className="mt-4" />
                        </div>
                        <span className="mt-auto inline-flex pt-5 text-sm font-semibold text-teal-800">
                          Open this shortcut
                        </span>
                      </Link>
                    </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
