"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollFocusRevealProps {
  readonly children: ReactNode;
}

export default function ScrollFocusReveal({ children }: ScrollFocusRevealProps) {
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const revealElement = revealRef.current;

    if (!revealElement) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      setIsInView(true);
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

  return (
    <div
      ref={revealRef}
      className={`transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:blur-0 ${
        isInView
          ? "translate-y-0 scale-100 opacity-100 blur-0"
          : "translate-y-2 scale-[0.985] opacity-[0.62] blur-[8px]"
      }`}
    >
      {children}
    </div>
  );
}
