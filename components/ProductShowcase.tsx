"use client";

import { useRef, useState, useEffect } from "react";
import Reveal from "@/components/Reveal";

const BRAND = "#3182F6";

/** 앱 화면처럼 보이는 프레임(상단 점 3개). 제목은 위 칩이 담당. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
      </div>
      <div className="flex h-[256px] flex-col p-5">{children}</div>
    </div>
  );
}

function Bar({ w, c = "bg-neutral-200", delay }: { w: string; c?: string; delay?: number }) {
  const animated = delay !== undefined;
  return (
    <div
      className={`h-2 rounded-full ${c} ${animated ? "mock-gen-bar" : ""}`}
      style={{ width: w, animationDelay: animated ? `${delay}s` : undefined }}
    />
  );
}

const ImgIcon = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></svg>
);

// 0. 블로그 만들기 — 이름 입력 → '만들기' 누르면 '완성!'이 떠오름(루프). 다른 카드와 동일 구조(완성 위/입력·버튼 아래)
function MockCreateBlog() {
  return (
    <div className="flex h-full flex-col">
      {/* 위: 완성 결과(클릭 후 떠오름) */}
      <div className="mock-reveal flex flex-col items-center py-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "#2fd07a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="mt-2.5 text-sm font-semibold">완성!</p>
        <p className="mt-0.5 text-xs text-neutral-400">우리집댕댕이.com</p>
      </div>
      {/* 아래: 블로그 이름 입력 + 만들기 버튼(눌림) */}
      <p className="mt-4 text-xs font-medium text-neutral-400">블로그 이름</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">우리집 댕댕이 일지</span>
      </div>
      <span className="mock-press mt-2.5 block rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: BRAND }}>블로그 만들기</span>
      <p className="mt-auto pt-4 text-center text-xs font-medium text-[#3f91ff]">이름만 정하면, 블로그가 생겨요</p>
    </div>
  );
}

// 1. 글 생성 — 커서가 '글 생성'을 누르면 줄이 쭈루룩 생겼다 사라짐(루프)
function MockGenerate() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">강아지가 슬리퍼만 물어뜯는 이유 🐶</span>
        <span className="mock-gen-press inline-block shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">글 생성</span>
      </div>
      <div className="mt-4 space-y-2.5">
        <Bar w="100%" delay={0.15} />
        <Bar w="95%" delay={0.4} />
        <Bar w="88%" delay={0.65} />
        <Bar w="60%" delay={0.9} />
      </div>
      <p className="mt-auto pt-4 text-center text-xs font-medium text-[#3f91ff]">키워드 하나로, 글이 써져요</p>
    </div>
  );
}

// 2. 글 편집 — 커서가 '이미지 추가'를 누르면 이미지가 들어옴
function MockEdit() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-1.5 text-neutral-400">
        {["B", "H", "≡"].map((t) => (
          <span key={t} className="flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold">{t}</span>
        ))}
        <span className="flex h-6 w-6 items-center justify-center rounded"><ImgIcon s={13} /></span>
      </div>
      <div className="mt-3 space-y-2">
        <p className="truncate text-[13px] font-bold text-neutral-800">강아지가 슬리퍼만 물어뜯는 이유 🐶</p>
        <Bar w="100%" />
        <Bar w="88%" />
      </div>
      {/* 이미지 추가 버튼(눌리는 애니) */}
      <span className="mock-press mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-500">
        <ImgIcon s={13} /> 이미지 추가
      </span>
      {/* 들어오는 이미지 (클릭 후 떠오름) */}
      <div className="mock-reveal-img mt-3 flex h-14 items-center justify-center rounded-lg bg-neutral-100 text-neutral-300">
        <ImgIcon s={26} />
      </div>
      <p className="mt-auto pt-4 text-center text-xs font-medium text-[#3f91ff]">이미지 넣고 직접 손질해요</p>
    </div>
  );
}

// 3. 워드프레스 발행 — 글 미리보기 위, 발행 버튼은 아래. 버튼 클릭 시 원형 체크
function MockPublish() {
  return (
    <div className="flex h-full flex-col">
      {/* 위: 발행 결과(클릭 후 떠오름) */}
      <div className="mock-reveal flex flex-col items-center py-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "#2fd07a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <p className="mt-2.5 text-sm font-semibold">올렸어요</p>
        <p className="mt-0.5 text-xs text-neutral-400">우리집댕댕이.com/슬리퍼</p>
      </div>
      {/* 아래: 발행 버튼(눌리는 애니) */}
      <span className="mock-press mt-3 block rounded-xl py-2.5 text-center text-sm font-semibold text-white" style={{ background: BRAND }}>워드프레스에 발행</span>
      <p className="mt-auto pt-4 text-center text-xs font-medium text-[#3f91ff]">버튼 하나로 발행돼요</p>
    </div>
  );
}

// 4. 내 글 관리 — 예약했던 글이 시간 되면 '예약됨 → 발행됨'으로 자동 전환(루프)
function MockArticles() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">슬리퍼 물어뜯는 이유</span>
          <span className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white">발행됨</span>
        </div>
        {/* 예약됨 → 발행됨 자동 전환 */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">산책 거부하는 댕댕이 설득법</span>
          <span className="relative inline-flex h-[18px] w-[44px] shrink-0 items-center justify-center">
            <span className="mock-chip-sched absolute inset-0 flex items-center justify-center rounded-md bg-[#3f91ff]/10 text-[10px] font-medium text-[#2f7fe6]">예약됨</span>
            <span className="mock-chip-pub absolute inset-0 flex items-center justify-center rounded-md bg-emerald-600 text-[10px] font-medium text-white">발행됨</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">사료 안 먹을 때 꿀팁</span>
          <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">초안</span>
        </div>
      </div>
      <p className="mt-auto pt-4 text-center text-xs font-medium text-[#3f91ff]">예약한 글이 시간 되면 알아서 발행돼요</p>
    </div>
  );
}

// 5. 발행 캘린더 — 달력 + 예약 글이 시간 되면 '예약됨 → 발행됨'으로 자동 전환(텍스트로)
function MockCalendar() {
  const cells: (number | null)[] = [...Array(5).fill(null), ...Array.from({ length: 30 }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const PUB = [2, 5, 9];
  const SCH = [12, 16, 19, 23];
  const TODAY = 10;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight">6월</p>
        <div className="flex gap-2 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />예약</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />발행</span>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-7">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <div key={w} className="pb-0.5 text-center text-[9px] text-neutral-300">{w}</div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`e${i}`} className="h-[20px]" />
          ) : (
            <div key={d} className="flex h-[20px] flex-col items-center">
              <span className={`flex h-[15px] w-[15px] items-center justify-center rounded-full text-[9px] ${d === TODAY ? "bg-neutral-900 font-bold text-white" : "text-neutral-500"}`}>{d}</span>
              {(PUB.includes(d) || SCH.includes(d)) && <span className={`mt-0.5 h-1 w-3/5 rounded-full ${PUB.includes(d) ? "bg-emerald-500" : ""}`} style={SCH.includes(d) ? { background: BRAND } : undefined} />}
            </div>
          ),
        )}
      </div>
      {/* 예약 글이 시간 되면 발행 (실제 글 제목 + 상태 전환) */}
      <div className="mt-auto">
        <div className="flex items-center justify-between gap-1.5 rounded-lg border border-neutral-100 px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[11px] text-neutral-600">슬리퍼 물어뜯는 이유</span>
          <span className="relative inline-flex h-[16px] w-[38px] shrink-0 items-center justify-center">
            <span className="mock-chip-sched absolute inset-0 flex items-center justify-center rounded text-[9px] font-medium" style={{ background: `${BRAND}1a`, color: BRAND }}>예약됨</span>
            <span className="mock-chip-pub absolute inset-0 flex items-center justify-center rounded bg-emerald-600 text-[9px] font-medium text-white">발행됨</span>
          </span>
        </div>
        <p className="pt-3 text-center text-xs font-medium" style={{ color: BRAND }}>예약해두면 알아서 발행돼요</p>
      </div>
    </div>
  );
}

// 6. 어디서든 — 실제 폰 비율 + 발행 애니메이션(커서 탭 → 게시 완료 떠오름)
function MockMobile() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <div className="relative w-[104px] rounded-[1.4rem] border-[4px] border-neutral-900 bg-white px-2 pb-3 pt-3.5 shadow-lg">
          <span className="absolute left-1/2 top-1.5 h-1 w-7 -translate-x-1/2 rounded-full bg-neutral-200" />
          <p className="text-[8px] font-medium text-neutral-400">키워드</p>
          <div className="mt-1 rounded-md bg-neutral-50 px-1.5 py-1.5 text-[9px] font-medium text-neutral-700">강아지 슬리퍼</div>
          <span className="mock-press mt-2 block rounded-md py-1.5 text-center text-[9px] font-semibold text-white" style={{ background: BRAND }}>워드프레스에 발행</span>
          {/* 게시 완료 (클릭 후 떠오름) */}
          <div className="mock-reveal mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-1.5 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <div className="leading-tight">
              <p className="text-[9px] font-semibold text-emerald-700">게시 완료</p>
              <p className="text-[7px] text-emerald-600/80">지하철에서 1분 만에</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-auto pt-3 text-center text-xs font-medium" style={{ color: BRAND }}>폰으로도, 어디서든 써요</p>
    </div>
  );
}

const PANELS = [
  { label: "블로그 만들기", node: <MockCreateBlog /> },
  { label: "글 생성", node: <MockGenerate /> },
  { label: "글 편집", node: <MockEdit /> },
  { label: "워드프레스 발행", node: <MockPublish /> },
  { label: "내 글 관리", node: <MockArticles /> },
  { label: "발행 캘린더", node: <MockCalendar /> },
  { label: "어디서든", node: <MockMobile /> },
];

export default function ProductShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // 활성 칩이 칩줄에서 가려져 있으면 칩줄을 직접 스크롤해 가운데로(페이지 영향 없이)
  useEffect(() => {
    const chip = chipRefs.current[active];
    const row = chipsRef.current;
    if (!chip || !row) return;
    const target = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  function onScroll() {
    const c = scrollRef.current;
    if (!c) return;
    const center = c.scrollLeft + c.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setActive((prev) => (prev === best ? prev : best));
  }

  function jump(i: number) {
    const el = itemRefs.current[i];
    const c = scrollRef.current;
    if (!el || !c) return;
    c.scrollTo({ left: el.offsetLeft - (c.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }

  return (
    <section className="border-t border-neutral-200/70">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-28">
        <Reveal>
          <p className="text-center text-sm font-semibold tracking-tight" style={{ color: BRAND }}>이렇게 써요</p>
          <h2 className="mt-3 text-center font-bold tracking-tight" style={{ fontSize: "clamp(24px, 5vw, 40px)", lineHeight: 1.3 }}>말보다, 직접 보세요</h2>
          <p className="mx-auto mt-4 max-w-md text-center text-base text-neutral-500" style={{ lineHeight: 1.6 }}>
            키워드부터 발행까지, 여기서 다 끝나요.
          </p>
        </Reveal>

        {/* 칩(탭) — 클릭하면 해당 카드로, 슬라이드하면 같이 바뀜 */}
        <div ref={chipsRef} className="no-scrollbar mt-8 flex gap-2 overflow-x-auto sm:mt-10 sm:justify-center">
          {PANELS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              ref={(el) => { chipRefs.current[i] = el; }}
              onClick={() => jump(i)}
              className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-[0.97] ${active === i ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 슬라이드 캐러셀 (좌우로 밀거나 위 칩 클릭) */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:mx-0 sm:px-0"
        >
          {PANELS.map((p, i) => (
            <div
              key={p.label}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="w-[86%] shrink-0 snap-center sm:w-[calc(50%-0.5rem)]"
            >
              <Frame>{p.node}</Frame>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-neutral-400">
          <span className="swipe-hint inline-flex text-neutral-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
              <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
              <path d="M15 11V7a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3.2a1.5 1.5 0 0 1 2.4-1.7L9 13" />
            </svg>
          </span>
          <span className="text-xs">밀거나 위 탭을 눌러요</span>
        </div>
      </div>
    </section>
  );
}
