export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ANALYTICS_DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

const ALLOWED_PARAM_KEYS = new Set([
  "guide_slug",
  "guide_title",
  "guide_type",
  "kit_slug",
  "topic_cluster",
  "action_location",
  "field_key",
  "filled_field_count",
  "has_user_input",
  "destination_slug",
  "destination_title",
  "share_method",
  "tool_slug",
  "tool_name",
  "source_page",
  "search_query_length",
  "previous_query_length",
  "previous_result_count",
  "preview_field_count",
  "result_count",
  "has_preview_generated",
  "chip_label",
]);

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

function debugLog(eventName: string, params: AnalyticsParams) {
  if (!ANALYTICS_DEBUG || typeof window === "undefined") {
    return;
  }

  console.info("[AteFlo analytics]", eventName, params);
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
  const safeParams = Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) => ALLOWED_PARAM_KEYS.has(key) && value !== undefined,
    ),
  );

  debugLog(eventName, safeParams);

  if (!canUseAnalytics()) {
    return;
  }

  window.gtag?.("event", eventName, safeParams);
}
