"use client";

import { useState } from "react";

interface CopyTextButtonProps {
  readonly text: string;
  readonly label?: string;
}

export default function CopyTextButton({
  text,
  label = "Copy prompt",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
