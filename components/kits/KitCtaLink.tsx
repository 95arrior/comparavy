"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface KitCtaLinkProps {
  readonly href: string;
  readonly kitSlug: string;
  readonly sourcePage: string;
  readonly actionLocation: string;
  readonly hasCheckout: boolean;
  readonly className: string;
  readonly children: ReactNode;
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function KitCtaLink({
  href,
  kitSlug,
  sourcePage,
  actionLocation,
  hasCheckout,
  className,
  children,
}: KitCtaLinkProps) {
  const eventName = hasCheckout ? "kit_checkout_click" : "kit_interest_click";
  const external = isExternalHref(href);

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      data-event={eventName}
      data-kit-slug={kitSlug}
      data-action-location={actionLocation}
      onClick={() =>
        trackEvent(eventName, {
          kit_slug: kitSlug,
          source_page: sourcePage,
          action_location: actionLocation,
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
