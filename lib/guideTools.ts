import { resolveToolReference } from "@/lib/toolLookup";
import type { AiTool } from "@/types/tool";

export function resolveGuideTool(
  toolSlug?: string | null,
  toolName?: string | null,
): AiTool | undefined {
  if (!toolSlug && !toolName) {
    return undefined;
  }

  return resolveToolReference({ toolSlug, toolName });
}
