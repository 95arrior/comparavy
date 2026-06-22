"use client";

import Brand from "@/components/Brand";

// 토스st 공용 네비 — 모바일=하단 고정 탭바 / 웹=상단 고정 바. 같은 4탭, 위치만 반응형.
// 활성=토스블루 / 비활성=회색, 절제된 모션·여백. 콘텐츠는 이 바깥에서 max-w-2xl 중앙.
export type NavKey = "home" | "articles" | "performance" | "more";

const BLUE = "#1D75F7";

// 라인 아이콘(토스 느낌 — 둥근 스트로크). active면 살짝 굵게.
function Icon({ k, active }: { k: NavKey; active: boolean }) {
  const sw = active ? 2.4 : 2;
  const common = { width: 25, height: 25, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (k === "home") return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>;
  if (k === "articles") return <svg {...common}><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6" /></svg>;
  if (k === "performance") return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16l3.5-4 3 2.5L20 8" /></svg>;
  return <svg {...common}><circle cx="5" cy="6" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="5" cy="18" r="1.6" /><path d="M10 6h9M10 12h9M10 18h9" /></svg>;
}

const NAV: { key: NavKey; label: string }[] = [
  { key: "home", label: "홈" },
  { key: "articles", label: "내 글" },
  { key: "performance", label: "성과" },
  { key: "more", label: "더보기" },
];

export default function TossNav({
  active,
  onNav,
  initial,
}: {
  active: NavKey;
  onNav: (k: NavKey) => void;
  initial: string;
}) {
  return (
    <>
      {/* 웹 — 상단 고정 바 */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-neutral-100 bg-white/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-6">
          <button onClick={() => onNav("home")} className="mr-2 shrink-0" aria-label="홈">
            <Brand size={22} />
          </button>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => {
              const on = active === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => onNav(n.key)}
                  className={`rounded-xl px-3.5 py-2 text-[15px] font-semibold transition ${on ? "text-[#1D75F7]" : "text-neutral-400 hover:text-neutral-700"}`}
                >
                  {n.label}
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => onNav("more")}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600 transition hover:bg-neutral-200"
            aria-label="더보기"
          >
            {initial}
          </button>
        </div>
      </header>

      {/* 모바일 — 하단 고정 탭바 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch">
          {NAV.map((n) => {
            const on = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95"
                style={{ color: on ? BLUE : "#aab1bd" }}
              >
                <Icon k={n.key} active={on} />
                <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
