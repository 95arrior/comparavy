import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ShortcutsDiscovery, {
  type ShortcutDiscoveryItem,
} from "@/components/guides/ShortcutsDiscovery";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides, type Guide } from "@/lib/guides";

export const metadata: Metadata = {
  title: "AI Shortcuts",
  description:
    "Practical AI shortcuts and workflows for turning messy inputs into finished outputs.",
};

function firstGuideInput(guide: Guide): string {
  const whatYouNeed = guide.whatYouNeed;

  if (Array.isArray(whatYouNeed)) {
    return whatYouNeed[0] ?? guide.userPain;
  }

  return typeof whatYouNeed === "string" ? whatYouNeed : guide.userPain;
}

function guideOutput(guide: Guide): string {
  return (
    guide.steps
      ?.filter((step) => step.output)
      .at(-1)
      ?.output ??
    guide.exampleResult ??
    guide.visualSummary.headline
  );
}

function guideToolNames(guide: Guide): readonly string[] {
  const names = guide.recommendedToolSlugs
    .map((slug) => toolsBySlug.get(slug as ToolSlug)?.name)
    .filter((name): name is string => Boolean(name));

  return names.length > 0
    ? names
    : guide.recommendedTools.map((tool) => tool.toolName);
}

function toDiscoveryItem(guide: Guide): ShortcutDiscoveryItem {
  const guideTypeLabel = formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType));
  const input = firstGuideInput(guide);
  const output = guideOutput(guide);
  const toolNames = guideToolNames(guide);
  const searchableValues = [
    guide.title,
    guide.metaDescription,
    guide.quickAnswer,
    guide.quickDecision,
    guide.quickVerdict,
    guide.category,
    input,
    output,
    guide.topicCluster,
    guideTypeLabel,
    ...toolNames,
  ];

  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.quickAnswer ?? guide.quickVerdict ?? guide.metaDescription,
    category: guide.category,
    input,
    output,
    skillLevel: guide.skillLevel,
    timeEstimate: guide.timeEstimate,
    guideTypeLabel,
    topicCluster: guide.topicCluster,
    toolNames,
    searchText: searchableValues
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase(),
  };
}

export default function GuidesPage() {
  const guides = getPublishedGuides();
  const shortcuts = guides.map(toDiscoveryItem);

  return (
    <main className="ateflo-page-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SiteHeader active="shortcuts" className="mb-6 rounded-3xl border border-slate-200 shadow-sm" />
        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm ateflo-reveal sm:px-7 sm:py-7">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            AI Shortcuts
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Search for a shortcut and open the one that matches the task you
            want to finish with AI.
          </p>
        </header>

        <ShortcutsDiscovery shortcuts={shortcuts} />
      </div>
    </main>
  );
}
