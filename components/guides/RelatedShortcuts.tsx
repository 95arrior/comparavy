"use client";

import Link from "next/link";
import { useId, useState } from "react";
import CategoryChip from "@/components/CategoryChip";
import ToolIcon from "@/components/ToolIcon";
import { trackEvent } from "@/lib/analytics";
import type { Guide } from "@/lib/guides";
import type { ShortcutWorksWithTool } from "@/components/guides/ShortcutsDiscovery";

export interface RelatedShortcutItem {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly skillLevel: string;
  readonly worksWithTools: readonly ShortcutWorksWithTool[];
}

interface RelatedShortcutsProps {
  readonly guide: Guide;
  readonly guides: readonly RelatedShortcutItem[];
  readonly sectionTitle?: string;
  readonly sectionSubtitle?: string;
}

export default function RelatedShortcuts({
  guide,
  guides,
  sectionTitle = "Related shortcuts",
  sectionSubtitle = "Open another AteFlo shortcut when your next task starts from a different input.",
}: RelatedShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  if (guides.length === 0) {
    return null;
  }

  function trackRelatedClick(destination: RelatedShortcutItem) {
    trackEvent("related_shortcut_click", {
      guide_slug: guide.slug,
      guide_title: guide.title,
      topic_cluster: guide.topicCluster,
      destination_slug: destination.slug,
      destination_title: destination.title,
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            {sectionTitle}
          </span>
          <span className="mt-2 block max-w-2xl text-sm leading-7 text-slate-600">
            {sectionSubtitle}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-normal text-teal-700 transition motion-reduce:transition-none ${
            isOpen ? "rotate-45 bg-teal-50" : ""
          }`}
        >
          +
        </span>
      </button>
      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((relatedGuide, index) => (
              <article
                key={relatedGuide.slug}
                style={{ animationDelay: `${Math.min(index * 60, 180)}ms` }}
                className="ateflo-related-shortcut-card group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-teal-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryChip label={relatedGuide.category} />
                  <span className="text-xs font-medium capitalize text-slate-500">
                    {relatedGuide.skillLevel}
                  </span>
                </div>
                <h3 className="ateflo-clamp-3 mt-4 text-base font-semibold leading-6 text-slate-950">
                  <Link
                    href={`/shortcuts/${relatedGuide.slug}`}
                    data-event="related_shortcut_click"
                    data-guide-slug={guide.slug}
                    data-destination-slug={relatedGuide.slug}
                    data-action-location="related_shortcuts_title"
                    onClick={() => trackRelatedClick(relatedGuide)}
                    className="transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  >
                    {relatedGuide.title}
                  </Link>
                </h3>
                <p className="ateflo-clamp-3 mt-2 text-sm leading-6 text-slate-600">
                  {relatedGuide.summary}
                </p>
                {relatedGuide.worksWithTools.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Works with
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {relatedGuide.worksWithTools.map((tool) => (
                        <span key={tool.slug} className="group/tool relative inline-flex">
                          <span
                            tabIndex={0}
                            role="img"
                            aria-label={tool.name}
                            title={tool.name}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-800 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                          >
                            <ToolIcon {...tool} size={22} />
                          </span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-sm transition group-hover/tool:opacity-100 group-focus-within/tool:opacity-100 motion-reduce:transition-none"
                          >
                            {tool.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-auto pt-4">
                  <Link
                    href={`/shortcuts/${relatedGuide.slug}`}
                    aria-label={`Open shortcut: ${relatedGuide.title}`}
                    data-event="related_shortcut_click"
                    data-guide-slug={guide.slug}
                    data-destination-slug={relatedGuide.slug}
                    data-action-location="related_shortcuts_button"
                    onClick={() => trackRelatedClick(relatedGuide)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition group-hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                  >
                    Open Shortcut
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
