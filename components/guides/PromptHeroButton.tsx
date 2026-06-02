"use client";

interface PromptHeroButtonProps {
  readonly targetId?: string;
}

export default function PromptHeroButton({
  targetId = "prompt-builder",
}: PromptHeroButtonProps) {
  function scrollToPrompt() {
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToPrompt}
      className="ateflo-primary-copy-button inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:w-auto"
    >
      <span className="relative z-10">Build the prompt</span>
    </button>
  );
}
