"use client";

import Link from "next/link";
import CategoryChip from "@/components/CategoryChip";
import ShortcutWorksWithCompact from "@/components/ShortcutWorksWithCompact";
import { trackEvent } from "@/lib/analytics";
import type { ShortcutDiscoveryItem } from "@/lib/shortcutDiscovery";

interface HomeShortcutStripProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

function StripCard({
  shortcut,
  duplicate = false,
}: {
  readonly shortcut: ShortcutDiscoveryItem;
  readonly duplicate?: boolean;
}) {
  const shortcutHref = `/shortcuts/${shortcut.slug}`;

  function trackShortcutClick() {
    trackEvent("shortcut_card_click", {
      source_page: "home",
      destination_slug: shortcut.slug,
      destination_title: shortcut.title,
    });
  }

  return (
    <Link
      href={shortcutHref}
      aria-hidden={duplicate ? "true" : undefined}
      tabIndex={duplicate ? -1 : undefined}
      data-event="shortcut_card_click"
      data-destination-slug={shortcut.slug}
      onClick={trackShortcutClick}
      className="ateflo-featured-shortcut-card group flex min-h-[430px] w-[300px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-[390px] sm:p-7 lg:w-[430px]"
    >
      <article className="flex h-full min-w-0 flex-col">
        <CategoryChip label={shortcut.category} />
        <h3 className="ateflo-clamp-2 mt-4 text-lg font-semibold leading-7 tracking-tight text-slate-950 transition group-hover:text-teal-800 sm:text-xl sm:leading-8">
          {shortcut.title}
        </h3>
        <p className="ateflo-clamp-3 mt-4 text-sm leading-6 text-slate-600">
          {shortcut.summary}
        </p>
        <ShortcutWorksWithCompact
          shortcut={shortcut}
          className="mt-7 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
        />
        <div className="mt-auto pt-7">
          <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-teal-800">
            Open Shortcut
          </span>
        </div>
      </article>
    </Link>
  );
}

export default function HomeShortcutStrip({ shortcuts }: HomeShortcutStripProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden border-y border-slate-200/80 bg-white py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-700">
              Free sample shortcuts
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Try a shortcut before buying a full kit.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Use these free workflows as samples of AteFlo prompt quality.
            </p>
          </div>
          <Link
            href="/shortcuts"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Browse free shortcuts
          </Link>
        </div>
      </div>

      <div className="mt-7 px-4 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-[1600px]">
          <div className="ateflo-shortcut-strip">
            <div className="ateflo-shortcut-strip-track">
              <div className="flex items-stretch gap-5 pr-5">
                {shortcuts.map((shortcut) => (
                  <StripCard key={shortcut.slug} shortcut={shortcut} />
                ))}
              </div>
              <div className="hidden items-stretch gap-5 pr-5 md:flex">
                {shortcuts.map((shortcut) => (
                  <StripCard key={`${shortcut.slug}-duplicate`} shortcut={shortcut} duplicate />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
