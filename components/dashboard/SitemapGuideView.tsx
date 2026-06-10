"use client";

import { useState, useEffect, useRef } from "react";

const BRAND = "#3f91ff";
const STORAGE_KEY = "ateflo_sitemap_guide_progress";

type Step = { title: string; lines: string[]; tip?: string };

const STEPS: Step[] = [
  {
    title: "구글 서치 콘솔 열기",
    lines: [
      "검색창에 **‘구글 서치 콘솔’** 이라고 검색해서, 맨 위에 나오는 **search.google.com/search-console** 에 들어가요.",
      "**구글 계정으로 로그인**하세요. (블로그 운영용 구글 계정이면 더 좋아요.)",
    ],
    tip: "서치 콘솔은 ‘내 블로그를 구글에 등록하는’ 무료 도구예요. 등록해야 구글이 내 글을 찾아가요.",
  },
  {
    title: "내 블로그 주소 등록하기",
    lines: [
      "처음이면 **‘시작하기’**, 전에 써봤으면 왼쪽 위 **‘속성 추가’** 를 눌러요.",
      "두 칸 중 **‘URL 접두어’** 칸에 **내 블로그 주소를 그대로** 붙여넣어요. (예: https://myblog.com)",
      "**‘계속’** 을 눌러요.",
    ],
  },
  {
    title: "내 블로그가 맞다고 확인하기",
    lines: [
      "구글이 ‘정말 당신 블로그가 맞는지’ 확인하라고 해요. (소유권 확인)",
      "가장 쉬운 길: 워드프레스 관리자에서 **‘Site Kit by Google’** 플러그인을 깔면 자동으로 확인돼요. (플러그인 → 새로 추가 → **Site Kit** 검색 → 설치·활성화 → 구글 계정 연결)",
      "플러그인이 어려우면, 서치 콘솔 화면에 나오는 **‘HTML 태그’** 방법을 천천히 따라가도 돼요.",
    ],
    tip: "이 단계가 제일 헷갈려요. 급하지 않으니 천천히 하세요. Site Kit 플러그인이 제일 편해요.",
  },
  {
    title: "사이트맵 제출하기",
    lines: [
      "서치 콘솔 왼쪽 메뉴에서 **‘Sitemaps(사이트맵)’** 을 눌러요.",
      "빈칸에 **`wp-sitemap.xml`** 이라고 입력하고 **‘제출’** 을 눌러요.",
      "내 사이트맵 전체 주소는 **내블로그주소/wp-sitemap.xml** 이에요. (예: myblog.com/wp-sitemap.xml)",
    ],
    tip: "워드프레스는 사이트맵이 기본으로 만들어져 있어서, 따로 만들 필요 없어요.",
  },
  {
    title: "이제 기다리면 돼요",
    lines: [
      "구글이 글을 읽고 검색에 반영하는 데 **며칠에서 몇 주** 걸려요. 조급해하지 마세요.",
      "한 번 제출하면 **앞으로 쓰는 새 글은 자동으로 포함**돼요. 다시 제출 안 해도 돼요.",
    ],
  },
];

function fmt(line: string) {
  return { __html: line.replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">$1</code>').replace(/\*\*(.+?)\*\*/g, '<b class="text-neutral-900">$1</b>') };
}

export default function SitemapGuideView({ onBack }: { onBack: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => STEPS.map(() => false));
  const currentRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setChecked(STEPS.map((_, i) => !!arr[i]));
      }
    } catch {
      // 무시
    }
  }, []);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 무시
      }
      return next;
    });
  }

  const done = checked.filter(Boolean).length;
  const currentIdx = checked.findIndex((c) => !c);
  const allDone = done === STEPS.length;
  const visibleCount = allDone ? STEPS.length : currentIdx + 1;

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIdx]);

  return (
    <div className="ateflo-page-in">
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-6 py-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
            <span className="text-base leading-none">←</span> 돌아가기
          </button>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(done / STEPS.length) * 100}%`, background: BRAND }} />
            </div>
            <span className="shrink-0 text-xs font-medium text-neutral-500">{done}/{STEPS.length} 완료</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-14">
        <div>
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>구글 등록 가이드</p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">
            구글에 내 블로그<br />등록하기
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            글을 써도 구글이 모르면 검색에 안 떠요. 한 번만 등록해두면 새 글은 알아서 반영돼요.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {STEPS.slice(0, visibleCount).map((step, i) => {
            const isDone = checked[i];
            const isCurrent = i === currentIdx;

            if (isDone) {
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white shadow-sm px-5 py-4">
                  <button onClick={() => toggle(i)} aria-label="이 단계 다시 하기" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                    ✓
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-500">{i + 1}. {step.title}</span>
                  <button onClick={() => toggle(i)} className="shrink-0 text-xs text-neutral-400 transition hover:text-neutral-600">다시 보기</button>
                </div>
              );
            }

            return (
              <div
                key={i}
                ref={isCurrent ? currentRef : undefined}
                className="ateflo-step-in rounded-2xl border bg-white p-6 shadow-md"
                style={{ borderColor: BRAND, boxShadow: `0 0 0 2px ${BRAND}33` }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: BRAND, boxShadow: `0 0 0 4px ${BRAND}22` }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{step.title}</h2>
                      <span className="rounded-lg px-2 py-0.5 text-xs font-medium text-white" style={{ background: BRAND }}>지금 할 차례</span>
                    </div>
                    <ul className="mt-3 space-y-2.5">
                      {step.lines.map((line, j) => (
                        <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                          <span dangerouslySetInnerHTML={fmt(line)} />
                        </li>
                      ))}
                    </ul>
                    {step.tip && (
                      <p className="mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed text-neutral-600" style={{ background: `${BRAND}0d` }}>
                        {step.tip}
                      </p>
                    )}
                    <button onClick={() => toggle(i)} className="mt-5 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition active:scale-95" style={{ background: BRAND }}>
                      이 단계 완료했어요 →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="ateflo-step-in mt-6 rounded-2xl border p-6 text-center" style={{ borderColor: BRAND, background: `${BRAND}0d` }}>
            <p className="text-base font-semibold tracking-tight">등록 완료! 🎉</p>
            <p className="mt-1.5 text-sm text-neutral-500">이제 글만 꾸준히 쌓으면 돼요. 구글이 차츰 찾아가요.</p>
            <button onClick={onBack} className="mt-5 inline-block rounded-lg px-6 py-3 text-sm font-medium text-white transition active:scale-95" style={{ background: BRAND }}>
              돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
