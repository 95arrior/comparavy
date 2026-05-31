"use client";

import Link from "next/link";
import BadgeRow from "@/components/BadgeRow";
import { trackEvent } from "@/lib/analytics";
import type { Guide } from "@/lib/guides";

interface RelatedShortcutsProps {
  readonly guide: Guide;
  readonly guides: readonly Guide[];
}

export default function RelatedShortcuts({ guide, guides }: RelatedShortcutsProps) {
  if (guides.length === 0) {
    return null;
  }

  function trackRelatedClick(destination: Guide) {
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
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        Choose the next useful shortcut
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
        Use another AteFlo shortcut when your next task starts from a different input.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guides.map((relatedGuide) => (
          <article
            key={relatedGuide.slug}
            className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <BadgeRow badges={[{ label: relatedGuide.category, tone: "teal" }]} />
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                {relatedGuide.skillLevel}
              </span>
            </div>
            <h3 className="ateflo-clamp-3 mt-4 text-base font-semibold leading-6 text-slate-950 md:min-h-[4.5rem]">
              <Link
                href={`/guides/${relatedGuide.slug}`}
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
            <p className="ateflo-clamp-3 mt-2 text-sm leading-6 text-slate-600 md:min-h-[4.5rem]">
              {relatedGuide.metaDescription}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Input -&gt; Output
              </p>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Input
                  </dt>
                  <dd className="mt-1 break-words leading-6 text-slate-700">
                    {Array.isArray(relatedGuide.whatYouNeed)
                      ? relatedGuide.whatYouNeed[0]
                      : relatedGuide.whatYouNeed || relatedGuide.userPain}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Output
                  </dt>
                  <dd className="mt-1 break-words leading-6 text-slate-700">
                    {relatedGuide.steps
                      ?.filter((step) => step.output)
                      .at(-1)
                      ?.output ??
                      relatedGuide.exampleResult ??
                      relatedGuide.visualSummary.headline}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-auto pt-4">
              <Link
                href={`/guides/${relatedGuide.slug}`}
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
