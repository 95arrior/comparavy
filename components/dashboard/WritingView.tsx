"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import AteFloLogo from "@/components/AteFloLogo";
import { parseSlots, parseCardItems } from "@/lib/publishHtml";
import { AI_IMAGES_ENABLED, DATA_CARDS_ENABLED } from "@/config/publish";
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
  /** ★시리즈(수익 증폭) — 2화+: user_series id / 1화: 아크 */
  seriesId?: string;
  series?: { title: string; arc: { role: string; angle: string }[] } | null;
}

// ★생성 장면 v3 — "글이 눈앞에서 실제로 써진다".
//  대기→블록 쏟아짐 패턴 폐기. 스트림 버퍼를 '글자 단위 타자기'로 연속 재생(밀리면 속도만 자동 상승, 덤프 없음).
//  끝엔 무지개 캐럿, 하단엔 룰렛(위아래 블러 마스크) 상태 텍스트. 완성 시 체크 팝.


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
  const [totalHtml, setTotalHtml] = useState(""); // 스트림으로 도착한 전체 HTML(제목 포함)
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef("");
  const bodyRef = useRef("");
  const totalRef = useRef("");
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
    // ★데이터 카드는 항상 자동(무료·satori). 사진(AI)은 봉인 플래그+토글 둘 다 켜졌을 때만.
    const firePhotos = AI_IMAGES_ENABLED && !!params.withImages;
    // ★슬롯 통합 — 사진(Gemini·유료, IMG_MAX 상한)과 카드(satori·무료) 문서 순서로. 카드는 상한 밖(원가 0).
    const slots = parseSlots(bodyRef.current);
    let photoFired = 0;
    for (let i = 0; i < slots.length; i++) {
      if (imgStartedRef.current.has(i)) continue;
      const slot = slots[i];
      const isPhoto = slot.type === "photo";
      if (isPhoto && !firePhotos) continue; // AI 봉인 — 사진 슬롯은 검토 화면 업로드로
      if (!isPhoto && !DATA_CARDS_ENABLED) continue; // 카드 봉인 — 수치는 데이터 줄이 맡음
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


  const started = totalHtml.length > 0;
  const phase = error ? "error" : finished ? "done" : started ? "writing" : "thinking";



  // 서버 완료 → 즉시 검토 화면으로(타자 대기 없음 — 대기라는 개념 자체를 지운다)
  useEffect(() => {
    if (streamDoneRef.current && doneArtRef.current && !finished) {
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
  }, [totalHtml, finished, onDone, imgDone]);

  // 네트워크 호출 1회
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      run();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  // ★완결 블록 단위 렌더 — 마지막 닫힌 블록까지만. 안전망 포맷이 적용된 '최종 모습'만 나타난다(반쯤 쓴 문장 노출 금지).
  const shownHtml = useMemo(() => {
    if (finished) return totalHtml;
    const ends = ["</p>", "</h2>", "</h1>", "</ul>", "</ol>", "</blockquote>"];
    let cut = -1;
    for (const e of ends) { const i = totalHtml.lastIndexOf(e); if (i >= 0) cut = Math.max(cut, i + e.length); }
    return cut > 0 ? totalHtml.slice(0, cut) : "";
  }, [totalHtml, finished]);

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
          // ★작전판 0초 — 대기 대신 '이 글의 작전'이 즉시 선다(제목 후보·노리는 검색어·의도·독자). 본문은 아래로 33초대 흐름.
          <div className="mx-auto max-w-xl pt-6">
            <OpsBoard params={params} />
            <div className="mt-6 space-y-3" aria-hidden>
              <div className="ateflo-skel h-6 w-4/5 rounded" />
              <div className="ateflo-skel h-4 w-full rounded" />
              <div className="ateflo-skel h-4 w-11/12 rounded" />
              <div className="ateflo-skel h-4 w-3/5 rounded" />
              <div className="ateflo-skel mt-6 h-5 w-2/5 rounded" />
              <div className="ateflo-skel h-4 w-full rounded" />
              <div className="ateflo-skel h-4 w-4/5 rounded" />
            </div>
          </div>
        ) : (
          // ★라이브 원고 — 글자 단위로 실시간 작성 + 무지개 캐럿
          <div className="mx-auto max-w-xl">
          <OpsBoard params={params} compact />
          <div className="prose prose-neutral max-w-none mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:leading-snug">
            <span dangerouslySetInnerHTML={{ __html: shownHtml }} />
            {!finished && (
              // ★다음 문단의 자리 — 완결될 때까지 꼬리에 상주(제목 뒤 웹검색 구간·블록 사이 공백에도 죽은 화면 없음)
              <div className="mt-5 space-y-3 not-prose" aria-hidden>
                <div className="ateflo-skel h-4 w-full rounded" />
                <div className="ateflo-skel h-4 w-11/12 rounded" />
                <div className="ateflo-skel h-4 w-3/5 rounded" />
              </div>
            )}
          </div>
          </div>
        )}
        <div ref={endRef} className="scroll-mb-40" />
      </div>


      {phase === "done" && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <span className="ateflo-circle-pop flex h-20 w-20 items-center justify-center rounded-full bg-[#1D75F7] text-white shadow-[0_12px_44px_rgba(29,117,247,0.45)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="ateflo-check-draw" d="M5 13l4 4L19 7" /></svg>
          </span>
          <p className="at-rise mt-5 text-[18px] font-extrabold tracking-tight text-[color:var(--at-grey-900)]" style={{ animationDelay: "0.3s" }}>글이 완성됐어요</p>
          
        </div>
      )}
    </>
  );
}


// ★작전판 — 폴백 경로 0초 콘텐츠(대기 표시가 아니라 이 글의 전략). briefText에서 의도·독자 추출.
function OpsBoard({ params, compact }: { params: GenParams; compact?: boolean }) {
  const intent = /의도:\s*([^\n]+)/.exec(params.angleBrief ?? "")?.[1]?.trim();
  const reader = /독자:\s*([^\n]+)/.exec(params.angleBrief ?? "")?.[1]?.trim();
  return (
    <div className={`rounded-2xl at-glass ${compact ? "p-4" : "p-5"}`}>
      <p className="text-[11.5px] font-bold text-[#1D75F7]">이 글의 작전</p>
      <p className={`mt-1.5 font-extrabold leading-snug tracking-tight text-[color:var(--at-grey-900)] ${compact ? "text-[15px]" : "text-[18px]"}`}>{params.angle}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-[#1D75F7]/[0.07] px-2 py-0.5 text-[11.5px] font-bold text-[#1D75F7]">노리는 검색어 · {params.keyword}</span>
        {intent && <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-semibold text-neutral-600">{intent}</span>}
      </div>
      {!compact && reader && <p className="mt-2 text-[12.5px] leading-relaxed text-neutral-500">읽는 사람: {reader}</p>}
    </div>
  );
}