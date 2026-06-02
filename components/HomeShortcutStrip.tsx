import Link from "next/link";
import CategoryChip from "@/components/CategoryChip";
import ToolIcon from "@/components/ToolIcon";
import TrackedLink from "@/components/TrackedLink";
import type { ShortcutDiscoveryItem } from "@/lib/shortcutDiscovery";

interface HomeShortcutStripProps {
  readonly shortcuts: readonly ShortcutDiscoveryItem[];
}

function primaryToolFor(shortcut: ShortcutDiscoveryItem) {
  return shortcut.worksWithTools[0];
}

function StripCard({
  shortcut,
  duplicate = false,
}: {
  readonly shortcut: ShortcutDiscoveryItem;
  readonly duplicate?: boolean;
}) {
  const primaryTool = primaryToolFor(shortcut);
  const remainingToolCount = primaryTool
    ? Math.max(shortcut.worksWithTools.length - 1, 0)
    : 0;
  const shortcutHref = `/shortcuts/${shortcut.slug}`;

  return (
    <article
      aria-hidden={duplicate ? "true" : undefined}
      className="ateflo-featured-shortcut-card flex min-h-[430px] w-[300px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:w-[390px] sm:p-7 lg:w-[430px]"
    >
      <CategoryChip label={shortcut.category} />
      <h3 className="ateflo-clamp-2 mt-4 text-lg font-semibold leading-7 tracking-tight text-slate-950 sm:text-xl sm:leading-8">
        {duplicate ? (
          <span>{shortcut.title}</span>
        ) : (
          <Link
            href={shortcutHref}
            className="transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {shortcut.title}
          </Link>
        )}
      </h3>
      <p className="ateflo-clamp-3 mt-4 text-sm leading-6 text-slate-600">
        {shortcut.summary}
      </p>
      {primaryTool && (
        <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Works with
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800">
              <ToolIcon {...primaryTool} size={22} />
              <span className="truncate">{primaryTool.name}</span>
            </span>
            {remainingToolCount > 0 && (
              <span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-500">
                +{remainingToolCount} more
              </span>
            )}
          </div>
        </div>
      )}
      <div className="mt-auto pt-7">
        {duplicate ? (
          <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">
            Open Shortcut
          </span>
        ) : (
          <TrackedLink
            href={shortcutHref}
            eventName="shortcut_card_click"
            eventParams={{
              source_page: "home",
              destination_slug: shortcut.slug,
              destination_title: shortcut.title,
              action_location: "home_shortcut_strip",
            }}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Open Shortcut
          </TrackedLink>
        )}
      </div>
    </article>
  );
}

export default function HomeShortcutStrip({ shortcuts }: HomeShortcutStripProps) {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden border-y border-slate-200/80 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-[1152px] px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-teal-700">
              Featured AI shortcuts
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Start with a task that looks familiar.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Pick a shortcut, fill in a few details, and copy the prompt.
            </p>
          </div>
          <Link
            href="/shortcuts"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Browse all shortcuts
          </Link>
        </div>
      </div>

      <div className="mt-9 px-4 sm:px-6 lg:px-20">
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
