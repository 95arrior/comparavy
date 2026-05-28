import type { MetadataRoute } from "next";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { tools } from "@/data/tools";
import { getPublishedGuides } from "@/lib/guides";

const SITE_URL = "https://www.comparavy.com";
const TOOLS_SOURCE_PATH = path.join(process.cwd(), "data", "tools.ts");
const GUIDES_DIRECTORY = path.join(process.cwd(), "content", "guides");

type GuideContent = {
  slug: string;
  updatedAt?: string;
  status?: string;
};

function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname}`;
}

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function maxDate(left: Date, right: Date): Date {
  return left.getTime() >= right.getTime() ? left : right;
}

function readGuideContent(): GuideContent[] {
  if (!existsSync(GUIDES_DIRECTORY)) {
    return [];
  }

  return readdirSync(GUIDES_DIRECTORY)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(GUIDES_DIRECTORY, fileName);
      const value = JSON.parse(readFileSync(filePath, "utf8")) as Partial<GuideContent>;

      return {
        slug: value.slug ?? fileName.replace(/\.json$/, ""),
        updatedAt: value.updatedAt,
        status: value.status,
      };
    });
}

const toolsSourceModified = statSync(TOOLS_SOURCE_PATH).mtime;
const publishedGuideSlugs = new Set(getPublishedGuides().map((guide) => guide.slug));
const guideContent = readGuideContent();
const guideContentModified = guideContent.reduce(
  (latest, guide) => maxDate(latest, parseDate(guide.updatedAt, latest)),
  toolsSourceModified,
);

function sitemapEntry(
  pathname: string,
  lastModified: Date,
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>,
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(pathname),
    lastModified,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    sitemapEntry("/", guideContentModified, "daily", 1),
    sitemapEntry("/finder", guideContentModified, "weekly", 0.9),
    sitemapEntry("/tools", toolsSourceModified, "weekly", 0.9),
    sitemapEntry("/guides", guideContentModified, "weekly", 0.9),
    sitemapEntry("/about", guideContentModified, "monthly", 0.3),
    sitemapEntry("/contact", guideContentModified, "monthly", 0.3),
    sitemapEntry("/privacy", guideContentModified, "monthly", 0.3),
    sitemapEntry("/affiliate-disclosure", guideContentModified, "monthly", 0.3),
  ];

  const toolEntries: MetadataRoute.Sitemap = tools.map((tool) =>
    sitemapEntry(`/tools/${tool.slug}`, toolsSourceModified, "monthly", 0.75),
  );

  const guideEntries: MetadataRoute.Sitemap = guideContent
    .filter((guide) => guide.status === "published" || (!guide.status && publishedGuideSlugs.has(guide.slug)))
    .map((guide) =>
      sitemapEntry(
        `/guides/${guide.slug}`,
        parseDate(guide.updatedAt, guideContentModified),
        "weekly",
        0.8,
      ),
    );

  return [...staticEntries, ...toolEntries, ...guideEntries];
}
