import { toolsBySlug, type ToolSlug } from "@/data/tools";
import type { AiTool } from "@/types/tool";

export function resolveGuideTool(toolSlug?: string | null): AiTool | undefined {
  if (!toolSlug) {
    return undefined;
  }

  return toolsBySlug.get(toolSlug as ToolSlug);
}
