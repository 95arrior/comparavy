export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function canUseAnalytics(): boolean {
  return Boolean(
    GA_MEASUREMENT_ID &&
      typeof window !== "undefined" &&
      typeof window.gtag === "function",
  );
}

export function pageview(path: string) {
  if (!canUseAnalytics()) {
    return;
  }

  window.gtag?.("config", GA_MEASUREMENT_ID, {
    page_path: path,
    page_location: window.location.href,
    send_page_view: true,
  });
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!canUseAnalytics()) {
    return;
  }

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  window.gtag?.("event", eventName, safeParams);
}
