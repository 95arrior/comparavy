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
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const SIZE_CLASSES = {
  sm: "h-[30px] w-[30px]",
  md: "h-[32px] w-[32px]",
  lg: "h-[34px] w-[34px]",
} as const;

const IMAGE_CLASSES = "block h-full w-full object-contain scale-[1.08]";

function firstLetter(name: string): string {
  const initial = name.trim().charAt(0).toUpperCase();
  return initial || "?";
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
  const localIconSource = iconPath?.trim() || undefined;
  const faviconSources = getFaviconCandidates({
    officialUrl,
    iconDomain: iconDomain ?? iconConfig.iconDomain,
  });
  const imageSources = localIconSource
    ? [localIconSource, ...faviconSources]
    : faviconSources;

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);

  useEffect(() => {
    setActiveSourceIndex(0);
    setLoadedSource(null);
  }, [localIconSource, iconDomain, officialUrl, slug]);

  const activeSource = imageSources[activeSourceIndex];
  const showFallback = !activeSource || loadedSource !== activeSource;

  function handleError() {
    setLoadedSource(null);
    setActiveSourceIndex((current) => {
      const nextIndex = current + 1;
      return nextIndex < imageSources.length ? nextIndex : imageSources.length;
    });
  }

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border ${SIZE_CLASSES[size]} ${
        showFallback
          ? "border-slate-200 bg-slate-100 text-slate-700"
          : "border-slate-200 bg-white"
      } ${className ?? ""}`}
      aria-label={`${name} logo`}
    >
      {activeSource ? (
        <img
          src={activeSource}
          alt={`${name} logo`}
          className={`${IMAGE_CLASSES} absolute inset-0 transition-opacity duration-150`}
          style={{
            opacity: loadedSource === activeSource ? 1 : 0,
            visibility: "visible",
          }}
          onLoad={() => setLoadedSource(activeSource)}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden="true" />
      )}
      <span
        className={`absolute inset-0 flex items-center justify-center rounded-[10px] bg-slate-100 text-sm font-semibold tracking-tight text-slate-700 transition-opacity duration-150 ${
          loadedSource === activeSource ? "opacity-0" : "opacity-100"
        }`}
        style={{ color: effectiveBrandColor ?? "#334155" }}
        aria-label={`${name} logo fallback`}
      >
        {firstLetter(name)}
      </span>
    </span>
  );
}
