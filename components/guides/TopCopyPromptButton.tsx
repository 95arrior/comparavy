"use client";

import { useEffect, useRef, useState } from "react";

const PROMPT_COPY_REQUEST_EVENT = "ateflo:prompt-copy-request";
const PROMPT_COPIED_EVENT = "ateflo:prompt-copied";

function CopyIcon({ copied }: { readonly copied: boolean }) {
  if (copied) {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <path
          d="M16.25 5.75 8.5 13.5 4.75 9.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path
        d="M7.5 6.5V4.75A1.75 1.75 0 0 1 9.25 3h4A1.75 1.75 0 0 1 15 4.75v6A1.75 1.75 0 0 1 13.25 12H11.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.25 8h4A1.75 1.75 0 0 1 11 9.75v5A1.75 1.75 0 0 1 9.25 16.5h-4A1.75 1.75 0 0 1 3.5 14.75v-5A1.75 1.75 0 0 1 5.25 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TopCopyPromptButton() {
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
        onClick={() => window.dispatchEvent(new CustomEvent(PROMPT_COPY_REQUEST_EVENT))}
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
