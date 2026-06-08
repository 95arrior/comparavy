"use client";

import { useEffect, useState } from "react";
import AteFloLogo from "@/components/AteFloLogo";

// 홈 데모: 우리 실제 생성 톤의 글이 한 글자씩 써지는 모습 (정적, API 호출 0). 여러 글을 번갈아.
type Block = { tag: "title" | "h3" | "p"; text: string };

const ARTICLES: Block[][] = [
  [
    { tag: "title", text: "강아지 분리불안 해결 방법: 따라 하면 끝나는 단계별 훈련" },
    { tag: "p", text: "주인이 신발만 신어도 짖고, 문이 닫히면 하울링이 시작된다면 분리불안일 수 있습니다. 핵심은 '혼자 있어도 괜찮다'는 경험을 작은 단위로 쌓는 것입니다." },
    { tag: "h3", text: "1단계: 외출 신호부터 무뎌지게 만들기" },
    { tag: "p", text: "강아지는 열쇠 소리, 외투 걸치기 같은 신호를 외출과 연결해 미리 불안해집니다. 외출 생각이 없을 때 열쇠를 집었다 그냥 내려놓아 보세요." },
  ],
  [
    { tag: "title", text: "초보 블로그 애드센스 승인, 한 번에 받는 글쓰기 전략" },
    { tag: "p", text: "애드센스 거절 메일을 받았다면 대부분 '콘텐츠 가치 부족'입니다. 글 수보다 중요한 건 한 편이 검색 의도를 끝까지 채우느냐예요." },
    { tag: "h3", text: "승인 전에 꼭 채워야 할 3가지" },
    { tag: "p", text: "충분한 분량(1,500자 이상), 직접 정리한 정보, 그리고 개인정보처리방침·문의 페이지. 이 세 가지가 없으면 승인이 어렵습니다." },
  ],
  [
    { tag: "title", text: "직장인 점심 도시락, 살 안 찌게 싸는 현실 꿀팁" },
    { tag: "p", text: "매일 사 먹는 점심을 도시락으로 바꾸면 돈도 살도 잡힙니다. 관건은 '준비가 귀찮지 않게' 만드는 것이에요." },
    { tag: "h3", text: "전날 밤 5분이면 끝나는 준비" },
    { tag: "p", text: "단백질(닭가슴살·계란), 채소, 잡곡밥을 한 칸씩 나눠 담으세요. 소스는 따로 챙겨 눅눅해지는 걸 막습니다." },
  ],
];

export default function DemoStream() {
  const [ai, setAi] = useState(0);
  const [n, setN] = useState(0);
  const [show, setShow] = useState(true);
  const blocks = ARTICLES[ai];

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const total = ARTICLES[ai].reduce((s, b) => s + b.text.length, 0);
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setN(i);
      if (i < total) {
        timer = setTimeout(tick, 28);
      } else {
        // 다 쓰면 잠깐 멈췄다가 → 페이드아웃 → 다음 글로 교체 (겹침 방지: cancelled 가드)
        timer = setTimeout(() => {
          if (cancelled) return;
          setShow(false);
          timer = setTimeout(() => {
            if (cancelled) return;
            setN(0);
            setAi((a) => (a + 1) % ARTICLES.length);
            setShow(true);
          }, 450);
        }, 2200);
      }
    };
    timer = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ai]);

  const total = blocks.reduce((s, b) => s + b.text.length, 0);
  let remaining = n;
  const rendered = blocks
    .map((b, idx) => {
      const shown = Math.max(0, Math.min(b.text.length, remaining));
      remaining -= b.text.length;
      return { idx, tag: b.tag, text: b.text.slice(0, shown), active: shown > 0 && shown < b.text.length, started: shown > 0 };
    })
    .filter((b) => b.started);

  const cursor = <span className="ml-0.5 inline-block animate-pulse text-neutral-400">▍</span>;

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="mb-2 text-xs font-medium text-neutral-400">키워드 하나로, 이렇게 써져요</div>
      <div className="h-80 overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]">
        <div key={ai} className={`transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}>
        {rendered.length === 0 && <p className="text-sm text-neutral-300">글을 구상하고 있어요…</p>}
        {rendered.map((b) => {
          if (b.tag === "title") {
            return (
              <p key={b.idx} className="text-base font-semibold leading-snug text-neutral-900">
                {b.text}
                {b.active && cursor}
              </p>
            );
          }
          if (b.tag === "h3") {
            return (
              <h3 key={b.idx} className="mt-4 text-sm font-semibold text-neutral-900">
                {b.text}
                {b.active && cursor}
              </h3>
            );
          }
          return (
            <p key={b.idx} className="mt-2 text-sm leading-relaxed text-neutral-600">
              {b.text}
              {b.active && cursor}
            </p>
          );
        })}
        {rendered.length > 0 && n >= total && (
          <p className="mt-3 text-sm text-neutral-300">⋯ 소제목을 이어가며 끝까지</p>
        )}
        <div className="mt-3">
          <AteFloLogo animated={n < total} size={22} />
        </div>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">
        위는 일부 미리보기예요 · 실제 글은 소제목 여러 개로 길게 써드려요
      </p>
    </div>
  );
}
