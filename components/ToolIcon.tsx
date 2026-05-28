"use client";

import { useEffect, useState } from "react";
import type { SimpleIcon } from "simple-icons";
import { getFaviconUrl } from "@/lib/favicon";
import { getSimpleIcon, getToolIconConfig } from "@/lib/toolIcons";

interface ToolIconProps {
  readonly name: string;
  readonly slug: string;
  readonly officialUrl?: string;
  readonly iconPath?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const SIZE_CLASSES = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const ICON_CLASSES = {
  sm: "p-1.5",
  md: "p-1.5",
  lg: "p-1.5",
} as const;

function firstLetter(name: string): string {
  const initial = name.trim().charAt(0).toUpperCase();
  return initial || "?";
}

function sourceKey(source: string | undefined): string | undefined {
  return source ? source : undefined;
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
  className,
}: ToolIconProps) {
  const iconConfig = getToolIconConfig(slug);
  const simpleIcon = iconConfig.forceFavicon ? undefined : getSimpleIcon(iconConfig.simpleIconSlug);
  const effectiveBrandColor =
    brandColor ?? iconConfig.brandColor ?? (simpleIcon ? `#${simpleIcon.hex}` : undefined);
  const favicon = getFaviconUrl({ officialUrl, iconDomain: iconDomain ?? iconConfig.iconDomain });

  const [failedSources, setFailedSources] = useState<Record<string, true>>({});
  const [loadedSources, setLoadedSources] = useState<Record<string, true>>({});

  useEffect(() => {
    setFailedSources({});
    setLoadedSources({});
  }, [iconPath, iconDomain, officialUrl, slug]);

  const showLocalIcon = Boolean(iconPath && !failedSources[iconPath]);
  const showFavicon = !showLocalIcon && Boolean(favicon && !failedSources[favicon]);
  const showSimpleIcon = !showLocalIcon && !showFavicon && Boolean(simpleIcon);
  const showFallback = !showLocalIcon && !showFavicon && !showSimpleIcon;

  function markFailed(source: string | undefined) {
    const key = sourceKey(source);
    if (!key) {
      return;
    }

    setFailedSources((current) =>
      current[key] ? current : { ...current, [key]: true },
    );
  }

  function markLoaded(source: string | undefined) {
    const key = sourceKey(source);
    if (!key) {
      return;
    }

    setLoadedSources((current) =>
      current[key] ? current : { ...current, [key]: true },
    );
  }

  const imageSource = showLocalIcon ? iconPath : showFavicon ? favicon : undefined;
  const imageLoaded = imageSource ? Boolean(loadedSources[imageSource]) : false;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${SIZE_CLASSES[size]} ${
        showFallback
          ? "border border-slate-200 bg-slate-100 text-slate-700"
          : "bg-transparent"
      } ${className ?? ""}`}
      aria-label={`${name} logo`}
    >
      {showLocalIcon && iconPath ? (
        <img
          src={iconPath}
          alt={`${name} logo`}
          className={`block h-full w-full object-contain ${ICON_CLASSES[size]}`}
          style={{ visibility: imageLoaded ? "visible" : "hidden" }}
          onLoad={() => markLoaded(iconPath)}
          onError={() => markFailed(iconPath)}
          loading="lazy"
          decoding="async"
        />
      ) : showSimpleIcon && simpleIcon ? (
        <svg
          role="img"
          aria-label={`${name} logo`}
          viewBox="0 0 24 24"
          className={`block h-full w-full ${ICON_CLASSES[size]}`}
          fill={iconColor(simpleIcon, effectiveBrandColor)}
        >
          <path d={simpleIcon.path} />
        </svg>
      ) : showFavicon && favicon ? (
        <img
          src={favicon}
          alt={`${name} logo`}
          className={`block h-full w-full object-contain ${ICON_CLASSES[size]}`}
          style={{ visibility: imageLoaded ? "visible" : "hidden" }}
          onLoad={() => markLoaded(favicon)}
          onError={() => markFailed(favicon)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-2xl text-sm font-semibold tracking-tight"
          style={{ color: effectiveBrandColor ?? "#334155" }}
          aria-label={`${name} logo fallback`}
        >
          {firstLetter(name)}
        </span>
      )}
    </span>
  );
}
