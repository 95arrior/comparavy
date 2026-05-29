"use client";

import { useEffect, useState } from "react";
import { getFaviconCandidates } from "@/lib/favicon";
import { getToolIconConfig } from "@/lib/toolIcons";

interface ToolIconProps {
  readonly name: string;
  readonly slug: string;
  readonly officialUrl?: string;
  readonly iconPath?: string;
  readonly iconDomain?: string;
  readonly brandColor?: string;
  readonly size?: number | "sm" | "md" | "lg";
  readonly className?: string;
}

const SIZE_MAP = {
  sm: 26,
  md: 28,
  lg: 32,
} as const;

const IMAGE_CLASSES = "block h-full w-full object-contain scale-[1.04]";

function firstLetter(name: string): string {
  const initial = name.trim().charAt(0).toUpperCase();
  return initial || "?";
}

function getSizePixels(size: ToolIconProps["size"]): number {
  if (typeof size === "number") {
    return size;
  }

  return SIZE_MAP[size ?? "md"];
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
  const effectiveBrandColor = brandColor ?? iconConfig.brandColor;
  const localIconSource = iconPath?.trim() || iconConfig.iconPath?.trim() || undefined;
  const resolvedIconDomain = iconConfig.iconDomain ?? iconDomain;
  const faviconSources = getFaviconCandidates({
    officialUrl,
    iconDomain: resolvedIconDomain,
  });
  const imageSources = localIconSource ? [localIconSource, ...faviconSources] : faviconSources;

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);

  useEffect(() => {
    setActiveSourceIndex(0);
    setLoadedSource(null);
  }, [localIconSource, resolvedIconDomain, officialUrl, slug]);

  const activeSource = imageSources[activeSourceIndex];
  const showImage = Boolean(activeSource && loadedSource === activeSource);
  const showFallback = !showImage;

  function handleError() {
    setLoadedSource(null);
    setActiveSourceIndex((current) => {
      const nextIndex = current + 1;
      return nextIndex < imageSources.length ? nextIndex : imageSources.length;
    });
  }

  const sizePixels = getSizePixels(size);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-slate-200 bg-white ${className ?? ""}`}
      style={{ width: sizePixels, height: sizePixels }}
      aria-label={`${name} logo`}
    >
      {activeSource && (
        <img
          src={activeSource}
          alt={`${name} logo`}
          className={`${IMAGE_CLASSES} absolute inset-0 transition-opacity duration-150`}
          style={{
            opacity: showImage ? 1 : 0,
            visibility: "visible",
          }}
          onLoad={() => setLoadedSource(activeSource)}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}
      {showFallback && (
        <span
          className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-slate-100 text-[0.9rem] font-semibold tracking-tight text-slate-700"
          style={{ color: effectiveBrandColor ?? "#334155" }}
          aria-label={`${name} logo fallback`}
        >
          {firstLetter(name)}
        </span>
      )}
    </span>
  );
}
