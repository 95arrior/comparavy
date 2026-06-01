"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import AteFloIcon from "@/components/AteFloIcon";

interface ScrollFocusRevealProps {
  readonly children: ReactNode;
}

export default function ScrollFocusReveal({ children }: ScrollFocusRevealProps) {
  const revealRef = useRef<HTMLDivElement | null>(null);
  const initialScrollY = useRef(0);
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

    let frameId = 0;
    let nestedFrameId = 0;
    let listenersAttached = false;

    function markScrolled() {
      if (Math.abs(window.scrollY - initialScrollY.current) > 8) {
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

    function attachListeners() {
      initialScrollY.current = window.scrollY;
      listenersAttached = true;
      window.addEventListener("scroll", markScrolled, { passive: true });
      window.addEventListener("wheel", handlePointerScroll, { passive: true });
      window.addEventListener("touchmove", handlePointerScroll, { passive: true });
      window.addEventListener("keydown", handleKeyDown);
    }

    frameId = window.requestAnimationFrame(() => {
      nestedFrameId = window.requestAnimationFrame(attachListeners);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(nestedFrameId);

      if (listenersAttached) {
        window.removeEventListener("scroll", markScrolled);
        window.removeEventListener("wheel", handlePointerScroll);
        window.removeEventListener("touchmove", handlePointerScroll);
        window.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [hasUserScrolled, prefersReducedMotion]);

  const isRevealed = prefersReducedMotion || (hasUserScrolled && isInView);

  return (
    <div ref={revealRef} className="relative">
      <div
        className={`transform-gpu transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:blur-0 ${
          isRevealed
            ? "translate-y-0 scale-100 opacity-100 blur-0"
            : "translate-y-2 scale-[0.985] opacity-[0.62] blur-[8px]"
        }`}
      >
        {children}
      </div>
      <div
        aria-hidden={isRevealed || prefersReducedMotion}
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4 transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:hidden ${
          isRevealed
            ? "-translate-y-1 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="inline-flex max-w-[92%] items-center gap-2 rounded-full border border-teal-100/90 bg-white/90 px-4 py-3 text-sm font-semibold text-teal-900 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-md sm:px-5 sm:text-base">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <AteFloIcon name="sparkle" className="h-4 w-4" />
          </span>
          <span>Scroll to reveal the result preview</span>
        </div>
      </div>
    </div>
  );
}
