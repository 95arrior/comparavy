import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  checkGuideQuality,
  validateGuideContent,
} from "@/lib/contentQuality";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import type { Guide } from "@/lib/guides";

interface LoadedGuide {
  readonly fileName: string;
  readonly guide: Guide;
  readonly status: string;
}

const GUIDES_DIRECTORY = path.join(process.cwd(), "content", "guides");

async function main(): Promise<void> {
  const invalidSuggestedSlugs = logGuideTopicToolSlugWarnings();

  if (invalidSuggestedSlugs.length > 0) {
    console.log(
      `Guide topic validation warning: ${invalidSuggestedSlugs.length} suggested tool slug(s) do not exist in the catalog.`,
    );
  }

  try {
    await access(GUIDES_DIRECTORY);
  } catch {
    console.log("No guide directory found.");
    return;
  }

  const files = (await readdir(GUIDES_DIRECTORY))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  const loadedGuides: LoadedGuide[] = [];

  for (const fileName of files) {
    try {
      const value: unknown = JSON.parse(
        await readFile(path.join(GUIDES_DIRECTORY, fileName), "utf8"),
      );

      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Guide content must be an object.");
      }

      const guideValue = value as Record<string, unknown>;

      loadedGuides.push({
        fileName,
        guide: value as Guide,
        status: typeof guideValue.status === "string" ? guideValue.status : "",
      });
    } catch (error) {
      console.error(`[${fileName}] INVALID: ${String(error)}`);
      process.exitCode = 1;
    }
  }

  const validGuides = loadedGuides.filter(
    (entry) => validateGuideContent(entry.guide).length === 0,
  );
  let publishedChecked = 0;
  let publishedFailed = 0;
  let draftChecked = 0;
  let draftWarnings = 0;

  for (const { fileName, guide } of loadedGuides) {
    const otherGuides = validGuides
      .filter((entry) => entry.fileName !== fileName)
      .map((entry) => entry.guide);
    const result = checkGuideQuality(guide, otherGuides);
    const isPublished = guide.status === "published";
    const blockerLabel = isPublished ? "Blocker" : "Warning";

    console.log(
      `[${guide.slug}] Quality score: ${result.score}/100 (${result.passed ? "PASS" : isPublished ? "FAIL" : "WARN"})`,
    );

    for (const warning of result.warnings) {
      console.log(`  Warning: ${warning}`);
    }

    for (const blocker of result.blockers) {
      console.log(`  ${blockerLabel}: ${blocker}`);
    }

    if (isPublished) {
      publishedChecked += 1;

      if (!result.passed) {
        publishedFailed += 1;
      }
    } else {
      draftChecked += 1;

      if (!result.passed) {
        draftWarnings += 1;
      }
    }
  }

  console.log("Guide quality summary");
  console.log(`Checked: ${files.length}`);
  console.log(`Published checked: ${publishedChecked}`);
  console.log(`Published failed: ${publishedFailed}`);
  console.log(`Draft/rejected checked: ${draftChecked}`);
  console.log(`Draft/rejected warnings: ${draftWarnings}`);

  if (publishedFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
