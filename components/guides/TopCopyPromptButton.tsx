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
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handleCopied() {
      setCopied(true);

      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }

      resetTimer.current = window.setTimeout(() => setCopied(false), 2800);
    }

    window.addEventListener(PROMPT_COPIED_EVENT, handleCopied);
    return () => {
      window.removeEventListener(PROMPT_COPIED_EVENT, handleCopied);
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  return (
    <div>
      <button
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
        className="ateflo-primary-copy-button inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          <CopyIcon copied={copied} />
          {copied ? "Copied!" : "Copy Prompt"}
        </span>
      </button>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 max-w-xs text-xs leading-5 text-slate-600">
        {copied ? "Prompt copied. Paste it into ChatGPT, Claude, Gemini, Copilot, or another AI chat tool." : ""}
      </p>
    </div>
  );
}
