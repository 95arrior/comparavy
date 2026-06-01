"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollFocusRevealProps {
  readonly children: ReactNode;
}

export default function ScrollFocusReveal({ children }: ScrollFocusRevealProps) {
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const revealElement = revealRef.current;

    if (!revealElement) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPrefersReducedMotion(reducedMotion);

    if (reducedMotion || !("IntersectionObserver" in window)) {
      setIsInView(true);
      setHasUserScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.32,
      },
    );

    observer.observe(revealElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || hasUserScrolled) {
      return;
    }

    function markScrolled() {
      if (window.scrollY > 8) {
        setHasUserScrolled(true);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const scrollKeys = new Set([
        " ",
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
      ]);

      if (scrollKeys.has(event.key)) {
        setHasUserScrolled(true);
      }
    }

    function handlePointerScroll() {
      setHasUserScrolled(true);
    }

    window.addEventListener("scroll", markScrolled, { passive: true });
    window.addEventListener("wheel", handlePointerScroll, { passive: true });
    window.addEventListener("touchmove", handlePointerScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", markScrolled);
      window.removeEventListener("wheel", handlePointerScroll);
      window.removeEventListener("touchmove", handlePointerScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasUserScrolled, prefersReducedMotion]);

  const isRevealed = prefersReducedMotion || (hasUserScrolled && isInView);

  return (
    <div ref={revealRef} className="relative">
      {!isRevealed ? (
        <div className="mb-3 flex justify-center motion-reduce:hidden">
          <span className="rounded-full border border-teal-100 bg-white/85 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm">
            Scroll to reveal the result preview
          </span>
        </div>
      ) : null}
      <div
        className={`transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:blur-0 ${
          isRevealed
            ? "translate-y-0 scale-100 opacity-100 blur-0"
            : "translate-y-2 scale-[0.985] opacity-[0.62] blur-[8px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
