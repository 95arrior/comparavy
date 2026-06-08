"use client";

import { useState, useEffect } from "react";
import Reveal from "@/components/Reveal";

const BRAND = "#3f91ff";
const STORAGE_KEY = "ateflo_wp_guide_progress";
// 페이지 슬라이드(약 0.35s)가 끝난 뒤 박스가 올라오도록 등장 지연
const BASE_DELAY = 420;

// 검색창 목업
function SearchMock() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-neutral-400"><circle cx="11" cy="11" r="7" /><path d="M21 21l-3.5-3.5" /></svg>
      <span className="text-neutral-700">워드프레스 호스팅 추천</span>
    </div>
  );
}

// 주소창 목업
function AddressMock() {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
      <span className="text-neutral-400">🔒</span>
      <span className="text-neutral-700">myblog.com<span className="font-bold" style={{ color: BRAND }}>/wp-admin</span></span>
    </div>
  );
}

// 워드프레스 왼쪽 메뉴 경로 목업
function MenuMock() {
  return (
    <div className="mt-4 w-44 overflow-hidden rounded-lg bg-neutral-900 p-1.5 text-xs text-neutral-300">
      <div className="px-2.5 py-1.5">글</div>
      <div className="flex items-center justify-between rounded px-2.5 py-1.5 font-medium text-white" style={{ background: BRAND }}>
        <span>사용자</span><span>▸ 프로필</span>
      </div>
      <div className="px-2.5 py-1.5">설정</div>
    </div>
  );
}

type Step = { title: string; lines: string[]; tip?: string; visual?: React.ReactNode };

const STEPS: Step[] = [
  {
    title: "워드프레스 호스팅 찾고 가입하기",
    lines: [
      "네이버나 구글 검색창에 **‘워드프레스 호스팅 추천’** 또는 **‘카페24 워드프레스 호스팅’** 이라고 검색하세요.",
      "상품 설명에 **‘자동 설치’ 또는 ‘원클릭 설치’** 라고 적힌 호스팅을 고르면 가장 쉬워요.",
      "마음에 드는 곳에서 ‘신청/가입’을 누르고 카드로 결제하면 끝이에요. 보통 한 달 몇천 원이에요.",
    ],
    tip: "꼭 카페24가 아니어도 돼요. ‘자동(원클릭) 워드프레스 설치’만 지원하면 어디든 괜찮아요.",
    visual: <SearchMock />,
  },
  {
    title: "워드프레스 자동으로 설치하기",
    lines: [
      "가입한 호스팅에 로그인해 **‘나의 서비스 관리’ 또는 ‘호스팅 관리’** 화면으로 들어가요.",
      "거기서 **‘워드프레스 설치’ 또는 ‘원클릭 설치’** 버튼을 눌러요. 몇 분이면 자동으로 깔려요.",
      "설치 중에 정하는 **관리자 아이디·비밀번호**를 꼭 메모장이나 종이에 **적어두세요.**",
    ],
    tip: "이 아이디·비밀번호가 내 블로그에 들어가는 열쇠예요. 바로 다음 단계에서 써요.",
  },
  {
    title: "내 블로그 관리자 화면 열기",
    lines: [
      "인터넷 주소창(맨 위 칸)에 **내 사이트 주소 뒤에 `/wp-admin`을 붙여** 입력하고 엔터를 눌러요.",
      "예) 내 주소가 myblog.com 이면 → 주소창에 myblog.com/wp-admin 이라고 쳐요.",
      "2단계에서 적어둔 **아이디·비밀번호**로 로그인하면, 왼쪽에 까만 메뉴가 있는 관리자 화면이 나와요.",
    ],
    visual: <AddressMock />,
  },
  {
    title: "‘앱 비밀번호’ 만들기 (제일 중요!)",
    lines: [
      "왼쪽 까만 메뉴에서 **‘사용자(Users)’ → ‘프로필(Profile)’** 순서로 눌러요.",
      "프로필 화면을 **맨 아래까지 쭉 내리면** **‘애플리케이션 비밀번호’** 칸이 있어요.",
      "빈칸에 **AteFlo**라고 적고 **‘새 애플리케이션 비밀번호 추가’** 버튼을 눌러요.",
      "**‘xxxx xxxx xxxx …’ 처럼 띄어쓰기가 있는 비밀번호**가 나오면, 띄어쓰기까지 **그대로 복사**하세요.",
    ],
    tip: "화면을 닫으면 이 비밀번호는 다시 못 봐요. 꼭 복사해서 메모장에 붙여두세요.",
    visual: <MenuMock />,
  },
  {
    title: "AteFlo에 연결하면 끝!",
    lines: [
      "AteFlo의 **‘워드프레스’ 메뉴 → 연결 화면**으로 돌아와요.",
      "**① 사이트 주소**(예: https://myblog.com) **② 사용자명**(2단계 관리자 아이디) **③ 앱 비밀번호**(방금 복사한 것)를 채워요.",
      "**‘사이트 연결하기’**를 누르면 초록불이 켜지며 연결 완료! 이제 글을 쓰고 버튼 하나로 발행할 수 있어요. 🎉",
    ],
  },
];

function fmt(line: string) {
  return { __html: line.replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">$1</code>').replace(/\*\*(.+?)\*\*/g, '<b class="text-neutral-900">$1</b>') };
}

export default function WpGuideView({ onBack, onGoConnect }: { onBack: () => void; onGoConnect: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(() => STEPS.map(() => false));

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
  const currentIdx = checked.findIndex((c) => !c); // -1이면 전부 완료
  const allDone = done === STEPS.length;

  return (
    <div className="ateflo-page-in">
      {/* 상단바 + 진행률 */}
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
        <Reveal delay={BASE_DELAY}>
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>워드프레스 5분 시작 가이드</p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">
            하나씩 체크하며<br />따라 하면 끝나요.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            끝낸 단계는 왼쪽 동그라미를 눌러 체크하세요. <b className="text-neutral-700">지금 할 차례</b>는 파랗게 표시돼요.
          </p>
        </Reveal>

        <div className="mt-10 space-y-5">
          {STEPS.map((step, i) => {
            const isCurrent = i === currentIdx;
            const isDone = checked[i];
            return (
              <Reveal key={i} delay={BASE_DELAY + (i + 1) * 80}>
                <div
                  className={`rounded-2xl border bg-white p-6 transition ${
                    isCurrent ? "shadow-md" : "shadow-sm"
                  }`}
                  style={isCurrent ? { borderColor: BRAND, boxShadow: `0 0 0 2px ${BRAND}33` } : { borderColor: "#e5e5e5" }}
                >
                  <div className="flex items-start gap-3">
                    {/* 체크 동그라미 (탭하면 완료 토글) */}
                    <button
                      onClick={() => toggle(i)}
                      aria-label={isDone ? "완료 취소" : "완료 체크"}
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold transition ${
                        isDone ? "text-white" : isCurrent ? "text-white" : "bg-neutral-100 text-neutral-400"
                      } ${isCurrent && !isDone ? "ring-4" : ""}`}
                      style={{
                        background: isDone ? "#22c55e" : isCurrent ? BRAND : undefined,
                        ...(isCurrent && !isDone ? { boxShadow: `0 0 0 4px ${BRAND}22` } : {}),
                      }}
                    >
                      {isDone ? "✓" : i + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`text-lg font-semibold tracking-tight ${isDone ? "text-neutral-400" : "text-neutral-900"}`}>{step.title}</h2>
                        {isCurrent && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: BRAND }}>👉 지금 할 차례</span>
                        )}
                      </div>
                      <ul className={`mt-3 space-y-2.5 ${isDone ? "opacity-50" : ""}`}>
                        {step.lines.map((line, j) => (
                          <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                            <span dangerouslySetInnerHTML={fmt(line)} />
                          </li>
                        ))}
                      </ul>
                      {!isDone && step.visual}
                      {!isDone && step.tip && (
                        <p className="mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed text-neutral-600" style={{ background: `${BRAND}0d` }}>
                          💡 {step.tip}
                        </p>
                      )}
                      {!isDone && (
                        <button
                          onClick={() => toggle(i)}
                          className="mt-4 text-sm font-medium transition"
                          style={{ color: BRAND }}
                        >
                          이 단계 완료했어요 →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={BASE_DELAY + (STEPS.length + 1) * 80} className="mt-10">
          <div className={`rounded-2xl border p-6 text-center transition ${allDone ? "" : "border-neutral-200 bg-neutral-50"}`} style={allDone ? { borderColor: BRAND, background: `${BRAND}0d` } : {}}>
            <p className="text-base font-semibold tracking-tight">{allDone ? "다 하셨어요! 🎉 이제 연결만 하면 끝이에요" : "앱 비밀번호를 복사했다면 연결하러 가요"}</p>
            <p className="mt-1.5 text-sm text-neutral-500">연결 화면에서 사이트 주소·사용자명·앱 비밀번호를 붙여넣으세요.</p>
            <button onClick={onGoConnect} className="mt-5 inline-block rounded-full px-6 py-3 text-sm font-medium text-white transition" style={{ background: BRAND }}>
              워드프레스 연결하러 가기 →
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
