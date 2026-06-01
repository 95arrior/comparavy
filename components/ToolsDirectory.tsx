"use client";

import { useMemo, useState } from "react";
import ToolCard from "@/components/ToolCard";
import TrackedLink from "@/components/TrackedLink";
import type { AiTool, BudgetLevel, ToolCategory } from "@/types/tool";
import { TOOL_CATEGORIES } from "@/types/tool";

type FreePlanFilter = "all" | "free" | "paid";

interface ToolsDirectoryProps {
  readonly tools: readonly AiTool[];
}

const BUDGET_LABELS: Record<BudgetLevel, string> = {
  free: "Free",
  under20: "Under $20",
  under50: "Under $50",
  premium: "Premium",
};

function formatCategory(category: ToolCategory): string {
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function matchesSearch(tool: AiTool, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    tool.name,
    tool.description,
    tool.category,
    ...tool.bestFor,
    ...tool.notFor,
    ...tool.useCases,
    ...tool.personas,
    ...tool.primaryTags,
    ...tool.alternatives,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default function ToolsDirectory({ tools }: ToolsDirectoryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [freePlanFilter, setFreePlanFilter] = useState<FreePlanFilter>("all");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel | "all">("all");

  const filteredTools = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesCategory = category === "all" || tool.category === category;
      const matchesFreePlan =
        freePlanFilter === "all" ||
        (freePlanFilter === "free" ? tool.freePlan : !tool.freePlan);
      const matchesBudget =
        budgetLevel === "all" || tool.budgetLevel === budgetLevel;

      return (
        matchesCategory &&
        matchesFreePlan &&
        matchesBudget &&
        matchesSearch(tool, normalizedSearch)
      );
    });
  }, [budgetLevel, category, freePlanFilter, search, tools]);

  const activeFilterCount = [
    search.trim(),
    category !== "all",
    freePlanFilter !== "all",
    budgetLevel !== "all",
  ].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setFreePlanFilter("all");
    setBudgetLevel("all");
  }

  return (
    <>
      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ateflo-reveal sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] lg:items-end">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Search tools</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by shortcut task, use case, or tag"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ToolCategory | "all")
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">All categories</option>
              {TOOL_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {formatCategory(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Free plan</span>
            <select
              value={freePlanFilter}
              onChange={(event) =>
                setFreePlanFilter(event.target.value as FreePlanFilter)
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">All tools</option>
              <option value="free">Free plan only</option>
              <option value="paid">Paid only</option>
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Budget</span>
              <select
                value={budgetLevel}
                onChange={(event) =>
                  setBudgetLevel(event.target.value as BudgetLevel | "all")
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
              >
                <option value="all">Any budget</option>
                {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Showing {filteredTools.length} of {tools.length} tools
            {activeFilterCount > 0 ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}.` : "."}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <section className="mt-8">
        {filteredTools.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">
              No tools match these filters.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Try clearing one filter or jump to the Finder for a more
              guided recommendation.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
              >
                Reset filters
              </button>
              <TrackedLink
                href="/finder"
                eventName="finder_cta_click"
                eventParams={{
                  source_page: "tools",
                  action_location: "tools_empty_state",
                }}
                className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Use Finder
              </TrackedLink>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-300">
              Not sure which one fits you?
            </p>
            <p className="mt-3 text-lg leading-8 text-slate-200">
              Use Finder to get a shortlist matched to your workflow,
              budget, and the output you need to finish.
            </p>
          </div>
          <TrackedLink
            href="/finder"
            eventName="finder_cta_click"
            eventParams={{
              source_page: "tools",
              action_location: "tools_bottom_cta",
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-teal-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            Use Finder
          </TrackedLink>
        </div>
      </section>
    </>
  );
}
