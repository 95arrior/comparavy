import { access } from "node:fs/promises";
import path from "node:path";
import { tools } from "@/data/tools";
import { getFaviconUrl } from "@/lib/favicon";
import { getToolIconConfig } from "@/lib/toolIcons";

function isRemoteIconPath(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  let localIconCount = 0;
  let faviconFallbackCount = 0;
  let safeSimpleIconCount = 0;
  let cssFallbackOnlyCount = 0;
  let missingOfficialUrl = 0;
  let missingIconDomain = 0;
  let brokenLocalIconPath = 0;

  const forcedFaviconTools: string[] = [];
  const warnings: string[] = [];

  for (const tool of tools) {
    const iconConfig = getToolIconConfig(tool.slug);
    const remoteIconPath = tool.iconPath ? isRemoteIconPath(tool.iconPath) : false;
    const localPath = tool.iconPath && !remoteIconPath
      ? path.join(process.cwd(), "public", tool.iconPath.replace(/^\//, ""))
      : undefined;
    const localExists = localPath ? await fileExists(localPath) : false;
    const faviconUrl = getFaviconUrl({
      officialUrl: tool.officialUrl,
      iconDomain: tool.iconDomain ?? iconConfig.iconDomain,
    });
    const safeSimpleIcon = Boolean(iconConfig.simpleIconSlug && !iconConfig.forceFavicon);
    const hasIconDomain = Boolean(tool.iconDomain ?? iconConfig.iconDomain);

    if (!tool.officialUrl) {
      missingOfficialUrl += 1;
      warnings.push(`[${tool.slug}] missing officialUrl`);
    }

    if (!hasIconDomain) {
      missingIconDomain += 1;
      warnings.push(`[${tool.slug}] missing iconDomain`);
    }

    if (tool.iconPath && !remoteIconPath && !localExists) {
      brokenLocalIconPath += 1;
      warnings.push(`[${tool.slug}] missing local icon file: ${tool.iconPath}`);
    }

    if (iconConfig.forceFavicon) {
      forcedFaviconTools.push(tool.slug);
    }

    if (tool.slug === "claude" && (tool.iconDomain ?? iconConfig.iconDomain) !== "claude.ai") {
      warnings.push(`[claude] must use claude.ai favicon`);
    }

    if (
      tool.slug === "notebooklm" &&
      (tool.iconDomain ?? iconConfig.iconDomain) !== "notebooklm.google"
    ) {
      warnings.push(`[notebooklm] must use notebooklm.google favicon`);
    }

    if (
      (tool.slug === "microsoft-copilot" || tool.slug === "copilot") &&
      (tool.iconDomain ?? iconConfig.iconDomain) !== "copilot.microsoft.com"
    ) {
      warnings.push(`[${tool.slug}] must use copilot.microsoft.com favicon`);
    }

    if (localExists) {
      localIconCount += 1;
    }

    if (faviconUrl) {
      faviconFallbackCount += 1;
    }

    if (safeSimpleIcon) {
      safeSimpleIconCount += 1;
    }

    if (!localExists && !faviconUrl && !safeSimpleIcon) {
      cssFallbackOnlyCount += 1;
    }
  }

  console.log("Tool icon summary");
  console.log(`Total tools: ${tools.length}`);
  console.log(`Local icons: ${localIconCount}`);
  console.log(`Favicon fallback: ${faviconFallbackCount}`);
  console.log(`Safe simple-icons: ${safeSimpleIconCount}`);
  console.log(`CSS fallback only: ${cssFallbackOnlyCount}`);
  console.log(`Missing officialUrl: ${missingOfficialUrl}`);
  console.log(`Missing iconDomain: ${missingIconDomain}`);
  console.log(`Broken local iconPath: ${brokenLocalIconPath}`);
  console.log(
    `Forced favicon strategy: ${forcedFaviconTools.length ? forcedFaviconTools.join(", ") : "none"}`,
  );
  console.log(
    "Visual note: ToolIcon resolves local files, then favicon candidates, then CSS fallback avatars.",
  );

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (warnings.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
