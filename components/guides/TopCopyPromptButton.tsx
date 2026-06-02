"use client";

import { useEffect, useRef, useState } from "react";
import AteFloIcon from "@/components/AteFloIcon";

const PROMPT_COPY_REQUEST_EVENT = "ateflo:prompt-copy-request";
const PROMPT_COPIED_EVENT = "ateflo:prompt-copied";

function CopyIcon({ copied }: { readonly copied: boolean }) {
  return <AteFloIcon name={copied ? "productivity" : "copy"} className="h-4 w-4" />;
}

interface TopCopyPromptButtonProps {
  readonly guideSlug: string;
}

export default function TopCopyPromptButton({ guideSlug }: TopCopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handleCopied() {
      setCopied(true);

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        buttonRef.current?.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.02)" },
            { transform: "scale(1)" },
          ],
          { duration: 220, easing: "ease-out" },
        );
      }

      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }

      resetTimer.current = window.setTimeout(() => setCopied(false), 1200);
    }

    window.addEventListener(PROMPT_COPIED_EVENT, handleCopied);
    return () => {
      window.removeEventListener(PROMPT_COPIED_EVENT, handleCopied);
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const target = document.getElementById("prompt-builder");

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPromptVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (promptVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center lg:inset-x-auto lg:right-6 lg:justify-end">
      <button
        ref={buttonRef}
        type="button"
        data-event="copy_prompt_click"
        data-guide-slug={guideSlug}
        data-action-location="top_button"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent(PROMPT_COPY_REQUEST_EVENT, {
              detail: { action_location: "top_button" },
            }),
          )
        }
        className="ateflo-primary-copy-button pointer-events-auto inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full px-5 py-3 text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 lg:w-auto"
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          <CopyIcon copied={copied} />
          {copied ? "Copied ✓" : "Build or copy prompt"}
        </span>
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {copied ? "Prompt copied. Paste it into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool." : ""}
      </p>
    </div>
  );
}
