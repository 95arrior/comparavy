"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface HomeDiagnosticCtaProps {
  readonly actionLocation: string;
  readonly className?: string;
}

export default function HomeDiagnosticCta({
  actionLocation,
  className,
}: HomeDiagnosticCtaProps) {
  function handleClick() {
    trackEvent("homepage_diagnostic_cta_click", {
      source_page: "home",
      action_location: actionLocation,
      kit_slug: "online-sales-setup-kit",
    });
  }

  return (
    <Link
      href="/assemble/online-sales-setup-kit"
      onClick={handleClick}
      className={
        className ??
        "inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
      }
    >
      무료 진단 시작하기
    </Link>
  );
}
