"use client";

import { useState, useEffect, useRef } from "react";

const BRAND = "#1D75F7";
const STORAGE_KEY = "ateflo_wp_guide_progress";
export const WP_GUIDE_STEP_COUNT = 5;

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

type Step = { title: string; lines: string[]; tip?: string; visual?: React.ReactNode; link?: { label: string; url: string } };

const STEPS: Step[] = [
  {
    title: "카페24에서 워드프레스 신청하기",
    lines: [
      "아래 버튼을 누르면 카페24 **‘매니지드 워드프레스’** 신청 페이지가 새 창으로 열려요. 워드프레스가 **자동으로 깔리는** 상품이라 제일 쉬워요.",
      "처음이라면 **‘빌드업’ 플랜**이 적당해요. (스타트업은 용량이 작아 추천하지 않아요)",
      "회원가입 → 카드 결제하면 끝. 가입할 때 정한 **아이디·비밀번호는 꼭 메모장에 적어두세요.**",
    ],
    tip: "‘매니지드 워드프레스’는 워드프레스가 자동 설치돼서 따로 깔 필요가 없어요. 결제만 카페24에서 하고, 나머지는 AteFlo가 도와드려요.",
    link: { label: "카페24 워드프레스 신청하러 가기", url: "https://hosting.cafe24.com/?controller=new_product_page&page=managed-wordpress" },
  },
  {
    title: "워드프레스 자동 설치 확인하기",
    lines: [
      "매니지드 워드프레스는 신청만 하면 **워드프레스가 자동으로 설치**돼요. 따로 설치할 필요 없어요!",
      "신청 완료 안내(메일·문자·화면)에 적힌 **내 사이트 주소**와 **관리자 정보**를 확인하세요.",
    ],
    tip: "혹시 ‘매니지드’가 아닌 일반 웹호스팅을 고르셨다면 → 카페24 ‘나의서비스관리 → 호스팅관리 → 계정관리 → 프로그램 자동설치’에서 워드프레스를 설치하세요.",
  },
  {
    title: "내 블로그 관리자 화면 열기",
    lines: [
      "인터넷 주소창(맨 위 칸)에 **내 사이트 주소 뒤에 `/wp-admin`을 붙여** 입력하고 엔터를 눌러요.",
      "예) 내 주소가 myblog.com 이면 → 주소창에 myblog.com/wp-admin 이라고 쳐요.",
      "1단계에서 적어둔 **아이디·비밀번호**로 로그인하면, 왼쪽에 까만 메뉴가 있는 관리자 화면이 나와요.",
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
      "**① 사이트 주소**(예: https://myblog.com) **② 사용자명**(1단계에서 정한 관리자 아이디) **③ 앱 비밀번호**(방금 복사한 것)를 채워요.",
      "**‘사이트 연결하기’**를 누르면 초록불이 켜지며 연결 완료! 이제 글을 쓰고 버튼 하나로 발행할 수 있어요. 🎉",
    ],
  },
];

function fmt(line: string) {
  return { __html: line.replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1 py-0.5 text-[0.85em]">$1</code>').replace(/\*\*(.+?)\*\*/g, '<b class="text-neutral-900">$1</b>') };
}

export default function WpGuideView({ onBack, onGoConnect }: { onBack: () => void; onGoConnect: () => void }) {
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
  const currentIdx = checked.findIndex((c) => !c); // -1이면 전부 완료
  const allDone = done === STEPS.length;
  const visibleCount = allDone ? STEPS.length : currentIdx + 1; // 완료한 단계 + 지금 단계까지만 노출

  // 단계가 바뀌면 '지금 단계' 박스로 부드럽게 포커싱 (첫 렌더는 제외)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIdx]);

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
        <div>
          <p className="text-sm font-semibold tracking-tight" style={{ color: BRAND }}>카페24로 5분 만에 시작하기</p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">
            한 단계씩,<br />따라만 하면 끝나요.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            지금 할 단계만 보여드려요. 끝내고 <b className="text-neutral-700">‘이 단계 완료했어요’</b>를 누르면 다음 단계가 나와요.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {STEPS.slice(0, visibleCount).map((step, i) => {
            const isDone = checked[i];
            const isCurrent = i === currentIdx;

            // 완료한 단계 = 접힌 카드
            if (isDone) {
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white shadow-sm px-5 py-4">
                  <button
                    onClick={() => toggle(i)}
                    aria-label="이 단계 다시 하기"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white"
                  >
                    ✓
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-500">{i + 1}. {step.title}</span>
                  <button onClick={() => toggle(i)} className="shrink-0 text-xs text-neutral-400 transition hover:text-neutral-600">다시 보기</button>
                </div>
              );
            }

            // 지금 단계 = 펼친 카드 (포커싱 대상)
            return (
              <div
                key={i}
                ref={isCurrent ? currentRef : undefined}
                className="ateflo-step-in rounded-2xl border bg-white p-6 shadow-md"
                style={{ borderColor: BRAND, boxShadow: `0 0 0 2px ${BRAND}33` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ background: BRAND, boxShadow: `0 0 0 4px ${BRAND}22` }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{step.title}</h2>
                      <span className="rounded-lg px-2 py-0.5 text-xs font-medium text-white" style={{ background: BRAND }}>👉 지금 할 차례</span>
                    </div>
                    <ul className="mt-3 space-y-2.5">
                      {step.lines.map((line, j) => (
                        <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                          <span dangerouslySetInnerHTML={fmt(line)} />
                        </li>
                      ))}
                    </ul>
                    {step.visual}
                    {step.link && (
                      <a
                        href={step.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm font-bold text-white transition active:scale-95"
                        style={{ background: BRAND }}
                      >
                        {step.link.label}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
                      </a>
                    )}
                    {step.tip && (
                      <p className="mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed text-neutral-600" style={{ background: `${BRAND}0d` }}>
                        💡 {step.tip}
                      </p>
                    )}
                    <div className="mt-5">
                      <button
                        onClick={() => toggle(i)}
                        className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${step.link ? "border border-neutral-300 text-neutral-600 hover:border-neutral-900" : "text-white"}`}
                        style={step.link ? undefined : { background: BRAND }}
                      >
                        {step.link ? "신청 끝냈어요" : "이 단계 완료했어요"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="ateflo-step-in mt-6 rounded-2xl border p-6 text-center" style={{ borderColor: BRAND, background: `${BRAND}0d` }}>
            <p className="text-base font-semibold tracking-tight">다 하셨어요! 🎉 이제 연결만 하면 끝이에요</p>
            <p className="mt-1.5 text-sm text-neutral-500">연결 화면에서 사이트 주소·사용자명·앱 비밀번호를 붙여넣으세요.</p>
            <button onClick={onGoConnect} className="mt-5 inline-block rounded-lg px-6 py-3 text-sm font-medium text-white transition" style={{ background: BRAND }}>
              워드프레스 연결하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
