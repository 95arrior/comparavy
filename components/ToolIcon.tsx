"use client";

import { useState } from "react";
import {
  siAirtable,
  siBuffer,
  siClaude,
  siCursor,
  siDeepl,
  siElevenlabs,
  siFramer,
  siGithubcopilot,
  siGooglegemini,
  siGrammarly,
  siHubspot,
  siMake,
  siN8n,
  siNotion,
  siPerplexity,
  siReplit,
  siSemrush,
  siVeed,
  siZapier,
  type SimpleIcon,
} from "simple-icons";

interface ToolIconProps {
  readonly name: string;
  readonly slug: string;
  readonly officialUrl?: string;
  readonly iconPath?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
  readonly size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const ICON_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
} as const;

const SIMPLE_ICONS: Partial<Record<string, SimpleIcon>> = {
  airtable: siAirtable,
  buffer: siBuffer,
  claude: siClaude,
  cursor: siCursor,
  "deepl-write": siDeepl,
  elevenlabs: siElevenlabs,
  "framer-ai": siFramer,
  "github-copilot": siGithubcopilot,
  gemini: siGooglegemini,
  grammarly: siGrammarly,
  hubspot: siHubspot,
  make: siMake,
  n8n: siN8n,
  "notion-ai": siNotion,
  perplexity: siPerplexity,
  replit: siReplit,
  semrush: siSemrush,
  veed: siVeed,
  "zapier-ai": siZapier,
};

function initials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function faviconUrl(iconDomain: string | undefined, officialUrl: string | undefined) {
  try {
    const domain = iconDomain ?? (officialUrl ? new URL(officialUrl).hostname : undefined);
    return domain ? `https://${domain.replace(/^https?:\/\//, "")}/favicon.ico` : undefined;
  } catch {
    return undefined;
  }
}

function iconColor(icon: SimpleIcon, brandColor: string | undefined): string {
  if (!brandColor) {
    return `#${icon.hex}`;
  }

  return brandColor.startsWith("#") ? brandColor : `#${brandColor}`;
}

export default function ToolIcon({
  name,
  slug,
  officialUrl,
  iconPath,
  iconDomain,
  brandColor,
  size = "md",
}: ToolIconProps) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const simpleIcon = SIMPLE_ICONS[slug];
  const favicon = faviconUrl(iconDomain, officialUrl);
  const showLocalIcon = Boolean(iconPath && failedSource !== iconPath);
  const showSimpleIcon = !showLocalIcon && Boolean(simpleIcon);
  const showFavicon =
    !showLocalIcon && !showSimpleIcon && Boolean(favicon && failedSource !== favicon);
  const showsLogo = showLocalIcon || showSimpleIcon || showFavicon;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${SIZE_CLASSES[size]} ${
        showsLogo
          ? "bg-transparent"
          : "border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
      }`}
    >
      {showLocalIcon && iconPath ? (
        <img
          src={iconPath}
          alt={`${name} logo`}
          className={`${ICON_SIZE_CLASSES[size]} object-contain`}
          onError={() => setFailedSource(iconPath)}
        />
      ) : showSimpleIcon && simpleIcon ? (
        <svg
          role="img"
          aria-label={`${name} logo`}
          viewBox="0 0 24 24"
          className={ICON_SIZE_CLASSES[size]}
          fill={iconColor(simpleIcon, brandColor)}
        >
          <path d={simpleIcon.path} />
        </svg>
      ) : showFavicon && favicon ? (
        <img
          src={favicon}
          alt={`${name} logo`}
          className={`${ICON_SIZE_CLASSES[size]} object-contain`}
          onError={() => setFailedSource(favicon)}
        />
      ) : (
        <span aria-label={`${name} logo unavailable`}>{initials(name)}</span>
      )}
    </span>
  );
}
