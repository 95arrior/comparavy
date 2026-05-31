import ActionLinks from "@/components/ActionLinks";
import type { Guide } from "@/lib/guides";

interface FinderCtaProps {
  readonly guide: Guide;
  readonly secondaryHref?: string;
  readonly secondaryLabel?: string;
}

export default function FinderCta({
  guide,
  secondaryHref = "/shortcuts",
  secondaryLabel = "Browse Shortcuts",
}: FinderCtaProps) {
  return (
    <div className="mt-7 rounded-3xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-lg font-semibold text-white">
          Need a recommendation for your exact input?
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          {guide.finderCTA || guide.ctaToFinder} Use it when your source material,
          output format, or tool budget is different from this shortcut.
        </p>
      </div>
      <ActionLinks
        className="mt-5 sm:mt-0"
        items={[
          {
            href: "/finder",
            label: "Open Finder",
            tone: "primary",
            eventName: "finder_cta_click",
            eventParams: {
              source_page: "shortcut_detail",
              guide_slug: guide.slug,
              guide_title: guide.title,
              topic_cluster: guide.topicCluster,
              action_location: "guide_finder_cta",
            },
          },
          { href: secondaryHref, label: secondaryLabel },
        ]}
      />
    </div>
  );
}
