import FinderPageClient, {
  type ShortcutMatch,
} from "@/components/FinderPageClient";
import { toolsBySlug, type ToolSlug } from "@/data/tools";
import { getPublishedGuides, type Guide } from "@/lib/guides";
import { shortcutSearchValues } from "@/lib/shortcutDiscovery";

export const revalidate = 0;

function validToolSlugs(slugs: readonly string[]): ToolSlug[] {
  return slugs.filter((slug): slug is ToolSlug => toolsBySlug.has(slug as ToolSlug));
}

function toShortcutMatch(guide: Guide): ShortcutMatch {
  return {
    slug: guide.slug,
    title: guide.title,
    description: guide.quickAnswer ?? guide.metaDescription,
    useCase: guide.useCase,
    category: guide.category,
    persona: guide.persona,
    searchText: shortcutSearchValues(guide).join(" "),
    recommendedToolSlugs: validToolSlugs(guide.recommendedToolSlugs),
  };
}

export default function FinderPage() {
  const shortcuts = getPublishedGuides().map(toShortcutMatch);

  return <FinderPageClient shortcuts={shortcuts} />;
}
