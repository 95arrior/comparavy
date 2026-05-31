"use client";

import Link from "next/link";
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
}

export default function RelatedShortcuts({ guide, guides }: RelatedShortcutsProps) {
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
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
        Related shortcuts
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
        Open another AteFlo shortcut when your next task starts from a different input.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((relatedGuide) => (
          <article
            key={relatedGuide.slug}
            className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                {relatedGuide.category}
              </span>
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
                    <span
                      key={tool.slug}
                      className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-semibold text-slate-800"
                    >
                      <ToolIcon {...tool} size={22} />
                      <span className="truncate">{tool.name}</span>
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
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition group-hover:bg-teal-800 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                Open Shortcut
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
