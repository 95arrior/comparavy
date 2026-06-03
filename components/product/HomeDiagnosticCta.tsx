"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

interface HomeDiagnosticCtaProps {
  readonly actionLocation: string;
  readonly className?: string;
}

const DIAGNOSTIC_PATH = "/assemble/online-sales-setup-kit";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function HomeDiagnosticCta({
  actionLocation,
  className,
}: HomeDiagnosticCtaProps) {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    if (isLaunching) {
      return;
    }

    trackEvent("homepage_diagnostic_cta_click", {
      source_page: "home",
      action_location: actionLocation,
      kit_slug: "online-sales-setup-kit",
    });

    if (prefersReducedMotion()) {
      timeoutRef.current = window.setTimeout(() => {
        router.push(DIAGNOSTIC_PATH);
      }, 80);
      return;
    }

    setIsLaunching(true);
    timeoutRef.current = window.setTimeout(() => {
      router.push(DIAGNOSTIC_PATH);
    }, 680);
  }

  return (
    <>
      <a
        href={DIAGNOSTIC_PATH}
        onClick={handleClick}
        className={
          className ??
          "inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
        }
      >
        무료 진단 시작하기
      </a>

      {isLaunching ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-4"
          aria-label="진단 채팅을 여는 중"
          role="status"
        >
          <div className="chat-launch-surface w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl">
            <div className="chat-launch-rainbow mb-4 h-1 rounded-full" />
            <div className="space-y-3">
              <div className="w-fit rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                진단 채팅을 열고 있어요
              </div>
              <div className="ml-auto h-11 w-32 rounded-2xl rounded-tr-md bg-teal-700/90" />
              <div className="h-12 rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
          <style jsx>{`
            .chat-launch-surface {
              animation: chatLaunchPop 680ms cubic-bezier(0.2, 0.8, 0.2, 1)
                both;
              transform-origin: center bottom;
            }

            .chat-launch-rainbow {
              background: linear-gradient(
                90deg,
                #5eead4,
                #93c5fd,
                #c4b5fd,
                #f0abfc,
                #fda4af,
                #fde68a,
                #5eead4
              );
              background-size: 220% 100%;
              animation: chatLaunchRainbow 1.8s linear infinite;
            }

            @keyframes chatLaunchPop {
              0% {
                opacity: 0;
                transform: translateY(24px) scale(0.86);
              }
              58% {
                opacity: 1;
                transform: translateY(-3px) scale(1.02);
              }
              100% {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes chatLaunchRainbow {
              from {
                background-position: 0% 50%;
              }
              to {
                background-position: 220% 50%;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .chat-launch-surface,
              .chat-launch-rainbow {
                animation: none;
              }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
