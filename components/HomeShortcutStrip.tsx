import Link from "next/link";
import ToolIcon from "@/components/ToolIcon";
import TrackedLink from "@/components/TrackedLink";
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
  return (
    <article className="flex h-full w-[280px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ateflo-card-lift sm:w-[340px]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
        {shortcut.category}
      </p>
      <h3 className="ateflo-clamp-2 mt-3 text-lg font-semibold leading-7 tracking-tight text-slate-950">
        {duplicate ? (
          <span>{shortcut.title}</span>
        ) : (
          <Link
            href={`/shortcuts/${shortcut.slug}`}
            className="transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {shortcut.title}
          </Link>
        )}
      </h3>
      <p className="ateflo-clamp-3 mt-2 text-sm leading-6 text-slate-600">
        {shortcut.summary}
      </p>
      {shortcut.worksWithTools.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Works with
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {shortcut.worksWithTools.slice(0, 2).map((tool) => (
              <span
                key={tool.slug}
                className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                <ToolIcon {...tool} size={20} />
                <span className="truncate">{tool.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {duplicate ? (
        <span className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">
          Open Shortcut
        </span>
      ) : (
        <TrackedLink
          href={`/shortcuts/${shortcut.slug}`}
          eventName="shortcut_card_click"
          eventParams={{
            source_page: "home",
            destination_slug: shortcut.slug,
            destination_title: shortcut.title,
            action_location: "home_shortcut_strip",
          }}
          className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          Open Shortcut
        </TrackedLink>
      )}
    </article>
  );
}

export default function HomeShortcutStrip({ shortcuts }: HomeShortcutStripProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-slate-200/80 bg-white px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              Featured AI shortcuts
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Start with a task that looks familiar.
            </h2>
          </div>
          <Link
            href="/shortcuts"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Browse all shortcuts
          </Link>
        </div>

        <div className="ateflo-shortcut-strip mt-8">
          <div className="ateflo-shortcut-strip-track">
            <div className="flex gap-4 pr-4">
              {shortcuts.map((shortcut) => (
                <StripCard key={shortcut.slug} shortcut={shortcut} />
              ))}
            </div>
            <div className="hidden gap-4 pr-4 md:flex" aria-hidden="true">
              {shortcuts.map((shortcut) => (
                <StripCard key={`${shortcut.slug}-duplicate`} shortcut={shortcut} duplicate />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
