"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ToolIcon from "@/components/ToolIcon";
import { trackEvent } from "@/lib/analytics";
import {
  normalizeSearch,
  type ShortcutDiscoveryItem,
} from "@/lib/shortcutDiscovery";

interface HomeShortcutSearchProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

const SEARCH_CHIPS = [
  "Meeting notes",
  "Etsy listing",
  "PDF study notes",
  "Content calendar",
] as const;

const PRIMARY_TOOL_BY_SLUG: Record<string, string> = {
  "best-ai-tools-for-etsy-product-descriptions": "canva-magic-studio",
  "best-ai-tools-for-small-business-content-calendars": "canva-magic-studio",
  "how-to-summarize-a-pdf-into-study-notes-with-ai": "claude",
  "how-to-turn-meeting-notes-into-a-client-recap-with-ai": "otter-ai",
};

function primaryToolFor(shortcut: ShortcutDiscoveryItem) {
  const preferredSlug = PRIMARY_TOOL_BY_SLUG[shortcut.slug];
  return (
    shortcut.worksWithTools.find((tool) => tool.slug === preferredSlug) ??
    shortcut.worksWithTools[0]
  );
}

export default function HomeShortcutSearch({ shortcuts }: HomeShortcutSearchProps) {
  const [query, setQuery] = useState("");
  const trackedSearches = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const hasActiveSearch = normalizedQuery.length > 0;
  const filteredShortcuts = useMemo(() => {
    if (!hasActiveSearch) {
      return [];
    }

    return shortcuts.filter((shortcut) =>
      normalizeSearch(shortcut.searchText).includes(normalizedQuery),
    );
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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    inputRef.current?.focus();

    trackSearchUsage();
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
        <form className="mx-auto max-w-4xl" onSubmit={handleSearchSubmit}>
          <label htmlFor="home-shortcut-search" className="sr-only">
            Search shortcuts
          </label>
          <div className="ateflo-home-search-box group flex items-center gap-3 rounded-[2rem] border border-teal-200 bg-white px-4 py-3 shadow-[0_18px_55px_rgba(15,118,110,0.13)] transition focus-within:border-teal-500 focus-within:shadow-[0_22px_70px_rgba(15,118,110,0.2),0_0_0_5px_rgba(20,184,166,0.13)] sm:rounded-[2.25rem] sm:px-5 sm:py-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m21 21-4.35-4.35" />
                <circle cx="11" cy="11" r="7" />
              </svg>
            </span>
            <input
              ref={inputRef}
              id="home-shortcut-search"
              type="search"
              value={query}
              placeholder="Find the right prompt or shortcut for your task..."
              data-event="shortcuts_search_used"
              data-action-location="home_search"
              className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400 sm:min-h-14 sm:text-lg"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Search shortcuts"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 active:scale-95 sm:h-14 sm:w-14"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </form>

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
          <div className="mx-auto mt-7 max-w-5xl rounded-[2rem] border border-teal-100 bg-white/85 p-3 shadow-xl shadow-teal-950/5 backdrop-blur ateflo-search-results sm:p-4">
            {filteredShortcuts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-950">
                  No matching shortcuts yet.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Try another task, or browse all shortcuts.
                </p>
                <Link
                  href="/shortcuts"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Browse all shortcuts
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredShortcuts.slice(0, 4).map((shortcut, index) => {
                  const primaryTool = primaryToolFor(shortcut);
                  const remainingToolCount = primaryTool
                    ? Math.max(shortcut.worksWithTools.length - 1, 0)
                    : 0;

                  return (
                    <article
                      key={shortcut.slug}
                      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md ateflo-search-result-card sm:p-6"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div className="flex gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                            {shortcut.category}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                            <Link
                              href={`/shortcuts/${shortcut.slug}`}
                              data-event="shortcut_card_click"
                              data-guide-slug={shortcut.slug}
                              data-action-location="home_search_result_title"
                              onClick={() =>
                                trackShortcutClick(shortcut, "home_search_result_title")
                              }
                              className="transition group-hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                            >
                              {shortcut.title}
                            </Link>
                          </h2>
                          <p className="ateflo-clamp-2 mt-2 text-sm leading-6 text-slate-600">
                            {shortcut.summary}
                          </p>
                          {primaryTool && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Works with
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-800">
                                  <ToolIcon {...primaryTool} size={22} />
                                  <span className="truncate">{primaryTool.name}</span>
                                </span>
                                {remainingToolCount > 0 && (
                                  <span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-500">
                                    +{remainingToolCount} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/shortcuts/${shortcut.slug}`}
                          aria-label={`Open shortcut: ${shortcut.title}`}
                          data-event="shortcut_card_click"
                          data-guide-slug={shortcut.slug}
                          data-action-location="home_search_result_button"
                          onClick={() =>
                            trackShortcutClick(shortcut, "home_search_result_button")
                          }
                          className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 active:scale-95 sm:h-14 sm:w-14"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.2"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                          </svg>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
