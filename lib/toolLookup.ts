import { tools, toolsBySlug, type ToolSlug } from "@/data/tools";
import type { AiTool } from "@/types/tool";

function normalizeToolKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

const toolsByNormalizedName = new Map<string, AiTool[]>();
const NAME_ALIASES: Record<string, string> = {
  copilot: "microsoft-copilot",
  microsoft365copilot: "microsoft-copilot",
};

for (const tool of tools) {
  const normalizedName = normalizeToolKey(tool.name);
  const bucket = toolsByNormalizedName.get(normalizedName) ?? [];
  bucket.push(tool);
  toolsByNormalizedName.set(normalizedName, bucket);
}

export function resolveToolBySlug(toolSlug?: string | null): AiTool | undefined {
  if (!toolSlug) {
    return undefined;
  }

  return toolsBySlug.get(toolSlug as ToolSlug);
}

export function resolveToolByName(toolName?: string | null): AiTool | undefined {
  if (!toolName) {
    return undefined;
  }

  const normalizedName = normalizeToolKey(toolName);
  const aliasSlug = NAME_ALIASES[normalizedName];

  if (aliasSlug) {
    const aliasTool = toolsBySlug.get(aliasSlug as ToolSlug);

    if (aliasTool) {
      return aliasTool;
    }
  }

  const matches = toolsByNormalizedName.get(normalizedName);

  if (!matches || matches.length === 0) {
    return undefined;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  return (
    matches.find((tool) => normalizeToolKey(tool.slug) === normalizedName) ??
    matches[0]
  );
}

export function resolveToolReference(input: {
  readonly toolSlug?: string | null;
  readonly toolName?: string | null;
}): AiTool | undefined {
  return resolveToolBySlug(input.toolSlug) ?? resolveToolByName(input.toolName);
}
