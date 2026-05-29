import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  assertGuideContentQuality,
  checkGuideQuality,
} from "@/lib/contentQuality";
import { logGuideTopicToolSlugWarnings } from "@/lib/guideTopicValidation";
import type { Guide } from "@/lib/guides";

interface LoadedGuide {
  readonly fileName: string;
  readonly guide: Guide;
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
  let invalid = 0;

  for (const fileName of files) {
    try {
      const value: unknown = JSON.parse(
        await readFile(path.join(GUIDES_DIRECTORY, fileName), "utf8"),
      );
      assertGuideContentQuality(value, fileName);
      loadedGuides.push({ fileName, guide: value });
    } catch (error) {
      invalid += 1;
      console.error(`[${fileName}] INVALID: ${String(error)}`);
    }
  }

  let passed = 0;
  let failed = invalid;

  for (const { fileName, guide } of loadedGuides) {
    const otherGuides = loadedGuides
      .filter((entry) => entry.fileName !== fileName)
      .map((entry) => entry.guide);
    const result = checkGuideQuality(guide, otherGuides);

    console.log(
      `[${guide.slug}] Quality score: ${result.score}/100 (${result.passed ? "PASS" : "FAIL"})`,
    );

    for (const warning of result.warnings) {
      console.log(`  Warning: ${warning}`);
    }

    for (const blocker of result.blockers) {
      console.log(`  Blocker: ${blocker}`);
    }

    if (result.passed) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  console.log("Guide quality summary");
  console.log(`Checked: ${files.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
