"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface TrackedLinkProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly eventName: string;
  readonly eventParams?: Record<string, string | number | boolean | null | undefined>;
}

export default function TrackedLink({
  href,
  children,
  className,
  ariaLabel,
  eventName,
  eventParams,
}: TrackedLinkProps) {
  const actionLocation =
    typeof eventParams?.action_location === "string"
      ? eventParams.action_location
      : undefined;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      data-event={eventName}
      data-action-location={actionLocation}
      onClick={() => trackEvent(eventName, eventParams)}
    >
      {children}
    </Link>
  );
}
