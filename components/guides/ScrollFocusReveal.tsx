"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollFocusRevealProps {
  readonly children: ReactNode;
}

export default function ScrollFocusReveal({ children }: ScrollFocusRevealProps) {
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const revealElement = revealRef.current;

    if (!revealElement) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPrefersReducedMotion(reducedMotion);

    if (reducedMotion || !("IntersectionObserver" in window)) {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.18,
      },
    );

    observer.observe(revealElement);
    return () => observer.disconnect();
  }, []);

  const isRevealed = prefersReducedMotion || hasEnteredView;

  return (
    <div ref={revealRef} className="relative">
      <div
        className={`transform-gpu transition-[opacity,transform] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 ${
          isRevealed
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.975] opacity-80"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
