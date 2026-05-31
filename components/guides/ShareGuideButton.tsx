"use client";

import { useState } from "react";

interface ShareGuideButtonProps {
  readonly title: string;
}

export default function ShareGuideButton({ title }: ShareGuideButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");

  async function shareGuide() {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({ title, url });
      setStatus("shared");
      return;
    }

    await navigator.clipboard.writeText(url);
    setStatus("copied");
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  const label =
    status === "shared" ? "Shared" : status === "copied" ? "Link Copied" : "Share Guide";

  return (
    <button
      type="button"
      onClick={shareGuide}
      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
