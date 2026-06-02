import type { MetadataRoute } from "next";
import { statSync } from "node:fs";
import path from "node:path";
import { getActiveKits } from "@/data/kits";
import { tools } from "@/data/tools";
import { getAllGuides, getPublishedGuides } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

const TOOLS_SOURCE_PATH = path.join(process.cwd(), "data", "tools.ts");
const KITS_SOURCE_PATH = path.join(process.cwd(), "data", "kits.ts");

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

const toolsSourceModified = statSync(TOOLS_SOURCE_PATH).mtime;
const kitsSourceModified = statSync(KITS_SOURCE_PATH).mtime;
const allGuides = getAllGuides();
const guideContentModified = allGuides.reduce(
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
    sitemapEntry("/kits", kitsSourceModified, "weekly", 0.85),
    sitemapEntry("/tools", toolsSourceModified, "weekly", 0.9),
    sitemapEntry("/shortcuts", guideContentModified, "weekly", 0.9),
    sitemapEntry("/about", guideContentModified, "monthly", 0.3),
    sitemapEntry("/contact", guideContentModified, "monthly", 0.3),
    sitemapEntry("/privacy", guideContentModified, "monthly", 0.3),
    sitemapEntry("/affiliate-disclosure", guideContentModified, "monthly", 0.3),
  ];

  const toolEntries: MetadataRoute.Sitemap = tools.map((tool) =>
    sitemapEntry(`/tools/${tool.slug}`, toolsSourceModified, "monthly", 0.75),
  );

  const guideEntries: MetadataRoute.Sitemap = getPublishedGuides().map((guide) =>
    sitemapEntry(
      `/shortcuts/${guide.slug}`,
      parseDate(guide.updatedAt, guideContentModified),
      "weekly",
      0.8,
    ),
  );

  const kitEntries: MetadataRoute.Sitemap = getActiveKits().map((kit) =>
    sitemapEntry(`/kits/${kit.slug}`, kitsSourceModified, "weekly", 0.8),
  );

  return [...staticEntries, ...toolEntries, ...guideEntries, ...kitEntries];
}
