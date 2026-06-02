import ToolIcon from "@/components/ToolIcon";
import type {
  ShortcutDiscoveryItem,
  ShortcutWorksWithTool,
} from "@/lib/shortcutDiscovery";

const SUPPORTING_AI_TOOL_SLUGS = new Set(["chatgpt", "claude", "gemini", "microsoft-copilot"]);

const PRIMARY_TOOL_PRIORITIES: Record<string, readonly string[]> = {
  "how-to-turn-a-voice-memo-into-a-to-do-list-with-ai": [
    "otter-ai",
    "notion-ai",
    "microsoft-copilot",
    "chatgpt",
    "claude",
    "gemini",
  ],
  "voice-memo-to-task-list": [
    "otter-ai",
    "notion-ai",
    "microsoft-copilot",
    "chatgpt",
    "claude",
    "gemini",
  ],
  "how-to-write-google-business-profile-posts-with-ai": [
    "gemini",
    "canva-magic-studio",
    "microsoft-copilot",
    "chatgpt",
    "claude",
  ],
  "google-business-profile-posts": [
    "gemini",
    "canva-magic-studio",
    "microsoft-copilot",
    "chatgpt",
    "claude",
  ],
  "how-to-write-a-dating-app-bio-with-ai-without-sounding-generic": [
    "gemini",
    "chatgpt",
    "claude",
  ],
  "dating-app-bio": ["gemini", "chatgpt", "claude"],
  "best-ai-tools-for-etsy-product-descriptions": [
    "canva-magic-studio",
    "chatgpt",
    "claude",
  ],
  "etsy-product-descriptions": ["canva-magic-studio", "chatgpt", "claude"],
  "how-to-summarize-a-pdf-into-study-notes-with-ai": [
    "gemini",
    "claude",
    "microsoft-copilot",
    "chatgpt",
  ],
  "pdf-study-notes": ["gemini", "claude", "microsoft-copilot", "chatgpt"],
  "how-to-turn-a-blog-post-into-an-instagram-carousel-with-ai": [
    "canva-magic-studio",
    "chatgpt",
    "claude",
  ],
  "blog-to-instagram-carousel": ["canva-magic-studio", "chatgpt", "claude"],
};

function priorityFor(shortcut: ShortcutDiscoveryItem): readonly string[] {
  return [
    ...(PRIMARY_TOOL_PRIORITIES[shortcut.slug] ?? []),
    ...(shortcut.topicCluster ? PRIMARY_TOOL_PRIORITIES[shortcut.topicCluster] ?? [] : []),
  ];
}

function uniqueTools(tools: readonly ShortcutWorksWithTool[]): ShortcutWorksWithTool[] {
  const seen = new Set<string>();
  const unique: ShortcutWorksWithTool[] = [];

  for (const tool of tools) {
    if (seen.has(tool.slug)) {
      continue;
    }

    seen.add(tool.slug);
    unique.push(tool);
  }

  return unique;
}

export function compactWorksWithTools(
  shortcut: ShortcutDiscoveryItem,
): {
  readonly visibleTools: readonly ShortcutWorksWithTool[];
  readonly remainingToolCount: number;
} {
  const tools = uniqueTools(shortcut.compactWorksWithTools ?? shortcut.worksWithTools);
  const priority = priorityFor(shortcut);
  const prioritized = priority
    .map((slug) => tools.find((tool) => tool.slug === slug))
    .filter((tool): tool is ShortcutWorksWithTool => Boolean(tool));
  const primary =
    prioritized[0] ??
    tools.find((tool) => !SUPPORTING_AI_TOOL_SLUGS.has(tool.slug)) ??
    tools[0];

  if (!primary) {
    return { visibleTools: [], remainingToolCount: 0 };
  }

  const supporting =
    tools.find((tool) => tool.slug !== primary.slug && SUPPORTING_AI_TOOL_SLUGS.has(tool.slug)) ??
    prioritized.find((tool) => tool.slug !== primary.slug) ??
    tools.find((tool) => tool.slug !== primary.slug);

  const visibleTools = [primary, supporting].filter(
    (tool): tool is ShortcutWorksWithTool => Boolean(tool),
  );

  return {
    visibleTools,
    remainingToolCount: Math.max(tools.length - visibleTools.length, 0),
  };
}

export default function ShortcutWorksWithCompact({
  shortcut,
  className = "",
}: {
  readonly shortcut: ShortcutDiscoveryItem;
  readonly className?: string;
}) {
  const { visibleTools, remainingToolCount } = compactWorksWithTools(shortcut);

  if (visibleTools.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Works with
      </p>
      <div className="mt-2 flex min-h-10 flex-wrap items-center gap-2">
        {visibleTools.map((tool) => (
          <span
            key={tool.slug}
            className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800"
            title={tool.name}
          >
            <ToolIcon {...tool} size={22} />
            <span className="truncate">{tool.name}</span>
          </span>
        ))}
        {remainingToolCount > 0 && (
          <span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-500">
            +{remainingToolCount} more
          </span>
        )}
      </div>
    </div>
  );
}
