export interface FaviconInput {
  readonly officialUrl?: string;
  readonly iconDomain?: string;
}

export function getDomainFromUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function getFaviconUrl({
  officialUrl,
  iconDomain,
}: FaviconInput): string | undefined {
  const domain = iconDomain?.trim() || getDomainFromUrl(officialUrl);

  if (!domain) {
    return undefined;
  }

  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(normalizedDomain)}&sz=128`;
}
