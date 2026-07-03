"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import AteFloLogo from "@/components/AteFloLogo";
import { parseSlots, parseCardItems } from "@/lib/publishHtml";
import type { Article } from "./types";

export interface GenParams {
  keyword: string;
  angle: string;
  type: string;
  tone: string;
  promo: boolean; // true=홍보용(업장 연결) | false=정보성(순수 정보) — 네이버 수익형 단일 후 기본 false
  userStory?: string; // 직접 쓴 '내 이야기'(있으면 핵심 재료로 우리 품질로 재구성)
  /** ★이미지 동시 생성 — 글이 써지는 동안 사진 자리 앞 3곳을 병렬 생성(장당 4크레딧) */
  withImages?: boolean;
  /** ★오늘 이슈 글감 — 최신 뉴스 발췌(근거 자료). 있으면 엔진이 이 사실관계 기반으로 쓴다 */
  newsContext?: string;
  /** ★앵글 브리프(C단계) — 이 글만의 방향(의도·구조·톤·독자·훅). 무중복 증식의 핵심 */
  angleBrief?: string;
  /** ★대표이미지 합성 카피(v4) — 슬롯0 썸네일에 코드 합성(무료). 없으면 배경+오브젝트만 */
  thumb?: { mainCopy: string; subCopy: string; badge: string };
}

// ★생성 장면 v3 — "글이 눈앞에서 실제로 써진다".
//  대기→블록 쏟아짐 패턴 폐기. 스트림 버퍼를 '글자 단위 타자기'로 연속 재생(밀리면 속도만 자동 상승, 덤프 없음).
//  끝엔 무지개 캐럿, 하단엔 룰렛(위아래 블러 마스크) 상태 텍스트. 완성 시 체크 팝.

// HTML을 '보이는 글자 n자'까지 안전하게 자른다 — 태그는 통째로 포함, 열린 태그는 닫아서 반환.
function cutHtml(html: string, n: number): string {
  if (n <= 0) return "";
  let out = "";
  let count = 0;
  const stack: string[] = [];
  const VOID = new Set(["br", "img", "hr", "input", "meta"]);
  let i = 0;
  while (i < html.length && count < n) {
    const ch = html[i];
    if (ch === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) break;
      const tag = html.slice(i, end + 1);
      const m = /^<\/?([a-zA-Z0-9]+)/.exec(tag);
      if (m) {
        const name = m[1].toLowerCase();
        if (tag[1] === "/") {
          const at = stack.lastIndexOf(name);
          if (at !== -1) stack.splice(at, 1);
        } else if (!VOID.has(name) && !tag.endsWith("/>")) {
          stack.push(name);
        }
      }
      out += tag;
      i = end + 1;
    } else if (ch === "&") {
      const end = html.indexOf(";", i);
      if (end !== -1 && end - i <= 8) {
        out += html.slice(i, end + 1);
        i = end + 1;
      } else {
        out += ch;
        i++;
      }
      count++;
    } else {
      out += ch;
      i++;
      count++;
    }
  }
  for (let j = stack.length - 1; j >= 0; j--) out += `</${stack[j]}>`;
  return out;
}

// 보이는 글자 수(태그 제외)
function visibleLen(html: string): number {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-zA-Z0-9#]{1,7};/g, "가").length;
}

export default function WritingView({
  params,
  pro,
  vertical,
  onDone,
  onCredits,
  onExit,
}: {
  params: GenParams;
  pro: boolean;
  vertical?: string;
  onDone: (article: Article) => void;
  /** 생성 완료 시 서버가 알려준 크레딧 잔액 반영 */
  onCredits?: (balance: number) => void;
  onExit: () => void;
}) {
  const [typed, setTyped] = useState(0); // 지금까지 '타자된' 보이는 글자 수
  const [totalHtml, setTotalHtml] = useState(""); // 스트림으로 도착한 전체 HTML(제목 포함)
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const titleRef = useRef("");
  const bodyRef = useRef("");
  const totalRef = useRef("");
  const typedRef = useRef(0);
  const doneArtRef = useRef<Article | null>(null);
  const streamDoneRef = useRef(false);
  const fetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // ★이미지 동시 생성 — 스트리밍 중 [사진:] 마커가 나타나는 즉시(앞 3곳) 병렬 생성 시작.
  //  글이 끝날 때쯤 이미지도 끝나 → 대기시간에 일이 2배(지루함 해소). 결과 URL은 검토 화면이 이어받음.
  const IMG_MAX = 3;
  const imgStartedRef = useRef<Set<number>>(new Set());
  const imgUrlsRef = useRef<Record<number, string>>({});
  const imgPendingRef = useRef(0);
  const [imgDone, setImgDone] = useState(0);
  function kickImages() {
    if (!params.withImages) return;
    // ★슬롯 통합 — 사진(Gemini·유료, IMG_MAX 상한)과 카드(satori·무료) 문서 순서로. 카드는 상한 밖(원가 0).
    const slots = parseSlots(bodyRef.current);
    let photoFired = 0;
    for (let i = 0; i < slots.length; i++) {
      if (imgStartedRef.current.has(i)) continue;
      const slot = slots[i];
      const isPhoto = slot.type === "photo";
      if (isPhoto && photoFired >= IMG_MAX) continue; // 사진만 상한
      imgStartedRef.current.add(i);
      if (isPhoto) photoFired += 1;
      imgPendingRef.current += 1;
      const reqBody = isPhoto
        ? { slot: slot.desc, title: titleRef.current, thumb: photoFired === 1, thumbCopy: photoFired === 1 ? params.thumb : undefined, articleSeed: titleRef.current, idx: i }
        : { slotType: "card", cardItems: parseCardItems(slot.desc), idx: i };
      void fetch("/api/images/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (typeof data.credits === "number") onCredits?.(data.credits);
          if (res.ok && (data.url || data.dataUrl)) imgUrlsRef.current[i] = data.url ?? data.dataUrl;
        })
        .catch(() => { /* 실패해도 글은 그대로 */ })
        .finally(() => { imgPendingRef.current -= 1; setImgDone((d) => d + 1); });
    }
  }


  const started = typed > 0;
  const phase = error ? "error" : finished ? "done" : started ? "writing" : "thinking";

  // 룰렛 상태 문구 — 생성 내내 순환(우리가 실제로 하는 일)
  const steps = useMemo(() => {
    const story = Boolean(params.userStory && params.userStory.trim());
    return [
      story ? "내 이야기를 꼼꼼히 읽는 중" : "검색 의도를 읽는 중",
      "실제 검색어 데이터 반영 중",
      "네이버 상위 글 구조 분석 중",
      "경험과 근거를 심는 중",
      vertical === "medical" ? "의료광고 규정 점검 중" : "규정·표현 점검 중",
      ...(params.withImages ? ["이미지도 만들어 넣는 중이에요 🎨"] : []),
      "문장을 다듬는 중",
    ];
  }, [params.userStory, vertical, params.withImages]);

  useEffect(() => {
    if (phase === "done") return;
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2200);
    return () => clearInterval(id);
  }, [phase, steps.length]);

  // ★타자기 엔진 — 40ms마다, 밀린 분량에 비례해 속도 자동 조절(끊김도 덤프도 없음)
  useEffect(() => {
    const id = setInterval(() => {
      const totalChars = visibleLen(totalRef.current);
      const backlog = totalChars - typedRef.current;
      if (backlog <= 0) return;
      // 남은 분량의 1/40씩(최소 2자) — 많이 밀리면 빨라지고, 따라잡으면 자연 속도로
      const stepN = Math.max(2, Math.ceil(backlog / 40));
      typedRef.current = Math.min(totalChars, typedRef.current + stepN);
      setTyped(typedRef.current);
    }, 40);
    return () => clearInterval(id);
  }, []);

  // 서버 완료 + 타자 완료 → 검토 화면으로
  useEffect(() => {
    const totalChars = visibleLen(totalRef.current);
    if (streamDoneRef.current && doneArtRef.current && typed >= totalChars && totalChars > 0 && !finished) {
      setFinished(true);
      const art = doneArtRef.current;
      doneArtRef.current = null;
      // 이미지 동시 생성 중이면 잠깐 기다림(최대 12초) — 끝난 만큼만 검토 화면에 전달
      const handoff = () => {
        try {
          if (Object.keys(imgUrlsRef.current).length > 0) {
            localStorage.setItem(`ateflo_imgs_${art.id}`, JSON.stringify(imgUrlsRef.current));
          }
        } catch { /* ignore */ }
        onDone(art);
      };
      if (params.withImages && imgPendingRef.current > 0) {
        const deadline = Date.now() + 12000;
        const wait = setInterval(() => {
          if (imgPendingRef.current <= 0 || Date.now() > deadline) { clearInterval(wait); handoff(); }
        }, 400);
      } else {
        setTimeout(handoff, 1300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, finished, onDone, imgDone]);

  // 네트워크 호출 1회
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      run();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 써지는 동안 끝이 보이게 따라 내려감(부드럽게, 과호출 방지)
  const lastScroll = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastScroll.current < 350) return;
    const el = endRef.current;
    if (!el) return;
    // ★글 끝이 화면 아래로 넘칠 때만 따라 내려간다 — 초반(제목만 써졌을 때) 스크롤돼 제목이 가려지는 것 방지
    const bottom = el.getBoundingClientRect().bottom;
    if (bottom > window.innerHeight - 120) {
      lastScroll.current = now;
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [typed]);

  function recompute() {
    const t = titleRef.current ? `<h1>${titleRef.current}</h1>` : "";
    totalRef.current = t + bodyRef.current;
    setTotalHtml(totalRef.current);
    kickImages();
  }

  async function run() {
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "글 생성에 실패했어요.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let msg: { type: string; html?: string; title?: string; article?: Article; error?: string; credits?: number };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "title") {
            titleRef.current = msg.title ?? "";
            recompute();
          } else if (msg.type === "body") {
            bodyRef.current = msg.html ?? "";
            recompute();
          } else if (msg.type === "done" && msg.article) {
            doneArtRef.current = msg.article;
            streamDoneRef.current = true;
            if (typeof msg.credits === "number") onCredits?.(msg.credits); // 잔액 갱신
            done = true;
          } else if (msg.type === "error") {
            setError(msg.error ?? "글 생성에 실패했어요.");
            done = true;
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("__DISCONNECT__");
    }
  }

  const shownHtml = useMemo(() => cutHtml(totalHtml, typed), [totalHtml, typed]);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          {phase === "error" ? (
            <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-neutral-500 transition hover:text-neutral-900">
              <span className="text-base leading-none">←</span> 글 목록으로
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-neutral-400">
              <AteFloLogo pro={pro} animated size={16} />
              {phase === "writing" ? <>쓰는 중 · <b className="tabular-nums text-neutral-600">{typed.toLocaleString("ko-KR")}자</b></> : "글을 준비하고 있어요"}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
        {error ? (
          error === "__DISCONNECT__" ? (
            /* ★연결 끊김 — 서버는 계속 쓰고 저장한다(자리표시 행 포함). 겁주지 말고 진실을 안내 */
            <div className="rounded-2xl at-glass p-6 text-center">
              <p className="text-[16px] font-extrabold text-neutral-900">연결이 잠깐 끊겼어요</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">
                걱정 마세요 — 글은 서버에서 <b className="text-neutral-700">계속 만들어지고 있어요.</b>
                <br />잠시 후 ‘내 글’에서 완성본을 확인하세요.
              </p>
              <button onClick={onExit} className="at-press mt-5 rounded-xl bg-[#1D75F7] px-6 py-3 text-[14px] font-bold text-white transition hover:opacity-90">
                내 글에서 확인하기
              </button>
            </div>
          ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
            <div className="mt-3">
              <button onClick={onExit} className="rounded-xl border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100">
                돌아가기
              </button>
            </div>
          </div>
          )
        ) : phase === "thinking" ? (
          // 첫 글자가 오기 전 — 키워드만 크게, 나머지는 하단 룰렛이 말해줌
          <div className="flex min-h-[56vh] flex-col items-center justify-center text-center">
            <p className="at-label">이 주제로 쓰고 있어요</p>
            <p className="mt-2 max-w-sm text-[22px] font-extrabold leading-snug tracking-tight text-[color:var(--at-grey-900)]">
              {params.keyword}<span className="at-caret" />
            </p>
          </div>
        ) : (
          // ★라이브 원고 — 글자 단위로 실시간 작성 + 무지개 캐럿
          <div className="prose prose-neutral max-w-none [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:tracking-tight">
            <span dangerouslySetInnerHTML={{ __html: shownHtml }} />
            {!finished && <span className="at-caret" />}
          </div>
        )}
        <div ref={endRef} className="scroll-mb-40" />
      </div>

      {/* 하단 룰렛 상태 — 위아래 블러 마스크 속에서 굴러 올라오는 한 줄 */}
      {phase !== "done" && phase !== "error" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
          <div className="rounded-full bg-white/90 px-5 py-2 shadow-[0_8px_24px_-10px_rgba(20,40,90,0.35)] ring-1 ring-black/[0.04] backdrop-blur">
            <div className="at-roll-mask h-6 overflow-hidden">
              <p key={stepIdx} className="at-roll-in flex h-6 items-center text-[13px] font-semibold text-neutral-600">
                {steps[stepIdx]}
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
          </span>
          <p className="at-rise mt-5 text-[18px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]" style={{ animationDelay: "0.3s" }}>글이 완성됐어요</p>
          <p className="at-rise mt-1 text-[13px] text-neutral-400" style={{ animationDelay: "0.5s" }}>{typed.toLocaleString("ko-KR")}자{params.withImages && imgPendingRef.current > 0 ? " · 이미지 마무리 중…" : " · 검토 화면으로 갈게요"}</p>
        </div>
      )}
    </>
  );
}
