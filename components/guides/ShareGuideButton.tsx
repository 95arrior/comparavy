"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface ShareGuideButtonProps {
  readonly title: string;
  readonly guideSlug: string;
  readonly topicCluster?: string;
}

export default function ShareGuideButton({
  title,
  guideSlug,
  topicCluster,
}: ShareGuideButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");

  async function shareGuide() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        trackEvent("share_guide_click", {
          guide_slug: guideSlug,
          guide_title: title,
          topic_cluster: topicCluster,
          share_method: "native_share",
        });
        await navigator.share({ title, url });
        setStatus("shared");
        window.setTimeout(() => setStatus("idle"), 1800);
        return;
      }

      await navigator.clipboard.writeText(url);
      trackEvent("share_guide_click", {
        guide_slug: guideSlug,
        guide_title: title,
        topic_cluster: topicCluster,
        share_method: "copy_link",
      });
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("idle");
    }
  }

  const label =
    status === "shared" ? "Shared" : status === "copied" ? "Link Copied" : "Share Guide";

  return (
    <button
      type="button"
      data-event="share_guide_click"
      data-guide-slug={guideSlug}
      data-action-location="guide_share_button"
      onClick={shareGuide}
      className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
