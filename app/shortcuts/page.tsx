import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import ShortcutsDiscovery, {
  type ShortcutDiscoveryItem,
  type ShortcutWorksWithTool,
} from "@/components/guides/ShortcutsDiscovery";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { formatGuideLayoutLabel, resolveGuideLayoutType } from "@/lib/guideTypes";
import { getPublishedGuides, type Guide } from "@/lib/guides";

export const metadata: Metadata = {
  title: "AI Shortcuts",
  description:
    "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
  alternates: {
    canonical: "/shortcuts",
  },
  openGraph: {
    title: "AI Shortcuts | AteFlo",
    description:
      "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
    url: "/shortcuts",
  },
  twitter: {
    card: "summary",
    title: "AI Shortcuts | AteFlo",
    description:
      "Shortcuts for finishing real work with AI by turning messy inputs into finished outputs.",
  },
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

function guideWorksWithTools(guide: Guide): readonly ShortcutWorksWithTool[] {
  const tools = guide.recommendedToolSlugs.flatMap((slug) => {
    const tool = toolsBySlug.get(slug as ToolSlug);
    return tool ? [tool] : [];
  });

  return tools.slice(0, 3).map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    officialUrl: tool.officialUrl,
    iconPath: tool.iconPath,
    iconDomain: tool.iconDomain,
    brandColor: tool.brandColor,
  }));
}

function guideSearchAliases(guide: Guide): readonly string[] {
  switch (guide.slug) {
    case "how-to-turn-meeting-notes-into-a-client-recap-with-ai":
      return [
        "meeting notes",
        "client recap",
        "follow-up email",
        "follow up email",
        "action items",
        "meeting summary",
        "client email",
        "call notes",
        "owners",
        "deadlines",
        "open questions",
      ];
    case "best-ai-tools-for-etsy-product-descriptions":
      return [
        "Etsy",
        "Etsy listing",
        "product description",
        "product title",
        "listing copy",
        "tags",
        "keywords",
        "handmade product",
        "shop",
        "seller",
      ];
    default:
      return [];
  }
}

function toDiscoveryItem(guide: Guide): ShortcutDiscoveryItem {
  const guideTypeLabel = formatGuideLayoutLabel(resolveGuideLayoutType(guide.guideType));
  const input = firstGuideInput(guide);
  const output = guideOutput(guide);
  const worksWithTools = guideWorksWithTools(guide);
  const searchAliases = guideSearchAliases(guide);
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
    guide.audience,
    guideTypeLabel,
    ...worksWithTools.map((tool) => tool.name),
    ...searchAliases,
  ];

  return {
    slug: guide.slug,
    title: guide.title,
    summary: guide.quickAnswer ?? guide.quickVerdict ?? guide.metaDescription,
    category: guide.category,
    skillLevel: guide.skillLevel,
    timeEstimate: guide.timeEstimate,
    guideTypeLabel,
    topicCluster: guide.topicCluster,
    worksWithTools,
    searchText: searchableValues
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase(),
  };
}

export default function ShortcutsPage() {
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
