"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

export default function RouteScrollManager() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (!pathname) {
      return;
    }

    const previous = previousPathname.current;
    previousPathname.current = pathname;

    if (previous === null || previous === pathname || window.location.hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
