"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function HomeShortcutSearch({ shortcuts }: HomeShortcutSearchProps) {
  const [query, setQuery] = useState("");
  const trackedSearches = useRef<Set<string>>(new Set());
  const normalizedQuery = normalizeSearch(query);
  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) {
      return shortcuts.slice(0, 3);
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
        source_page: "home",
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

  function handleChipClick(chip: string) {
    setQuery(chip);
    trackEvent("search_chip_click", {
      source_page: "home",
      chip_label: chip,
      result_count: matchingShortcutCount(chip),
    });
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
    <section className="mx-auto -mt-2 max-w-4xl px-4 pb-10 sm:px-6 sm:pb-12">
      <div className="rounded-3xl border border-teal-100 bg-white p-4 shadow-sm ateflo-reveal sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              What are you trying to finish?
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Search published shortcuts by task, input, output, or tool.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {shortcuts.length} AI shortcuts available
          </p>
        </div>

        <label htmlFor="home-shortcut-search" className="sr-only">
          Search shortcuts
        </label>
        <input
          id="home-shortcut-search"
          type="search"
          value={query}
          placeholder="Search “meeting notes”, “Etsy listing”, “PDF study notes”..."
          data-event="shortcuts_search_used"
          data-action-location="home_search"
          className="mt-5 min-h-14 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100 placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              data-event="search_chip_click"
              data-search-chip={chip}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              onClick={() => handleChipClick(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {filteredShortcuts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            filteredShortcuts.slice(0, 4).map((shortcut) => (
              <article
                key={shortcut.slug}
                className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-teal-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                      {shortcut.category}
                    </p>
                    <h2 className="mt-2 text-base font-semibold leading-6 text-slate-950 sm:text-lg">
                      <Link
                        href={`/shortcuts/${shortcut.slug}`}
                        data-event="shortcut_card_click"
                        data-guide-slug={shortcut.slug}
                        data-action-location="home_search_result_title"
                        onClick={() => trackShortcutClick(shortcut, "home_search_result_title")}
                        className="transition group-hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                      >
                        {shortcut.title}
                      </Link>
                    </h2>
                    <p className="ateflo-clamp-2 mt-1 text-sm leading-6 text-slate-600">
                      {shortcut.summary}
                    </p>
                  </div>
                  <Link
                    href={`/shortcuts/${shortcut.slug}`}
                    data-event="shortcut_card_click"
                    data-guide-slug={shortcut.slug}
                    data-action-location="home_search_result_button"
                    onClick={() => trackShortcutClick(shortcut, "home_search_result_button")}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  >
                    Open Shortcut
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
