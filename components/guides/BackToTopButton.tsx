"use client";

import { useEffect, useState } from "react";

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 520);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={scrollToTop}
      className="ateflo-back-to-top ateflo-primary-copy-button fixed z-40 inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="relative z-10 h-5 w-5"
        fill="none"
      >
        <path
          d="M10 15V5m0 0L5.5 9.5M10 5l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
