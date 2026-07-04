"use client";

import { useEffect, useRef, useState } from "react";
import { copyTextVerified } from "@/lib/clipboard";

// ★이웃 미션(보너스) — 오늘 할 일 세트: 글 1편(스트릭) + 이웃 5명·댓글 2개(보너스 체크, 스트릭 아님).
//  유저가 멈추는 4지점을 제품이 대신 준비: ①어디서(검색 링크) ②누굴(기준) ③뭐라고(인사말 생성) ④잘하고 있나(기대 범위+코칭).
//  절대: 타인 글 댓글은 생성하지 않는다(구조 가이드만). 버튼은 이동·복사까지만(네이버 조작 금지). 이모지·보장 금지.

const dayKey = () => new Date().toISOString().slice(0, 10);

export default function NeighborMission({ subCategory, sheet }: { subCategory?: string | null; sheet?: boolean }) {
  const missionKey = `ateflo_mission_${dayKey()}`;
  const [open, setOpen] = useState(!!sheet); // sheet 모드=항상 펼침(토글 헤더 숨김)
  const [checks, setChecks] = useState<{ neighbor: boolean; comment: boolean }>({ neighbor: false, comment: false });
  const [greeting, setGreeting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [coach, setCoach] = useState<string | null>(null);
  const variantRef = useRef(0); // 재생성마다 +1 → 구조 변형(시드 변주)

  useEffect(() => {
    try { const raw = localStorage.getItem(missionKey); if (raw) setChecks(JSON.parse(raw)); } catch { /* ignore */ }
    // 코칭 한 줄 — 체크인 데이터 기반(범위 표현만, 원인 단정 금지)
    fetch("/api/checkin").then((r) => r.json()).then((d) => {
      const rows: { day: string; visitors: number | null }[] = Array.isArray(d.rows) ? d.rows : [];
      const recent = rows.slice(-5).map((r) => r.visitors).filter((v): v is number => v !== null);
      if (recent.length >= 3) {
        const last = recent[recent.length - 1], first = recent[0];
        setCoach(last > first ? "방문자가 늘고 있어요. 지금 리듬을 유지해 보세요." : "수락이 더디면 인사말을 바꿔보는 것도 방법이에요.");
      }
    }).catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: "neighbor" | "comment") {
    setChecks((c) => { const n = { ...c, [key]: !c[key] }; try { localStorage.setItem(missionKey, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }
  function openSearch() {
    const q = encodeURIComponent(`${(subCategory ?? "").trim() || "블로그"} 기록`);
    window.open(`https://section.blog.naver.com/Search/Post.naver?keyword=${q}`, "_blank", "noopener");
  }
  async function makeGreeting() {
    if (busy) return;
    setBusy(true); setCopied(false);
    try {
      const res = await fetch("/api/neighbor-greeting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant: variantRef.current++ }) });
      const d = await res.json();
      if (res.ok && d.greeting) setGreeting(d.greeting);
      else if (d.error) setGreeting(null);
    } finally { setBusy(false); }
  }
  async function copyGreeting() {
    if (!greeting) return;
    const r = await copyTextVerified(greeting);
    if (r !== "fail") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const doneCount = (checks.neighbor ? 1 : 0) + (checks.comment ? 1 : 0);

  return (
    <div className={sheet ? "" : "at-rise mt-3 rounded-2xl at-glass p-5"}>
      <button onClick={() => !sheet && setOpen((o) => !o)} className={`flex w-full items-center gap-2 text-left ${sheet ? "cursor-default" : ""}`}>
        <span className="min-w-0 flex-1">
          <span className="text-[14px] font-bold text-[color:var(--at-grey-700)]">이웃 미션 <span className="font-medium text-neutral-400">· 보너스</span></span>
          <span className="mt-0.5 block text-[12px] text-neutral-400">이웃 1명은 새 글의 첫 독자 1명이에요. 첫 반응이 노출 테스트를 통과시켜요.</span>
        </span>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-500">{doneCount}/2</span>
        {!sheet && <svg className={`shrink-0 text-neutral-300 transition-transform duration-200 ${open ? "rotate-180" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {/* 보너스 체크 2개 — 스트릭 조건 아님 */}
          {([["neighbor", "이웃 신청 5명"], ["comment", "진심 댓글 2개"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => toggle(k)} className="flex w-full items-center gap-2.5 rounded-xl bg-white/70 px-4 py-3 text-left ring-1 ring-black/[0.04] transition">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${checks[k] ? "border-[#1D75F7] bg-[#1D75F7]" : "border-neutral-300"}`}>
                {checks[k] && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </span>
              <span className={`text-[14px] font-bold ${checks[k] ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{label}</span>
            </button>
          ))}

          {/* ① 어디서 */}
          <button onClick={openSearch} className="at-press w-full rounded-xl bg-[#03C75A] py-3 text-[14px] font-bold text-white transition hover:opacity-90">
            이웃 찾으러 가기
          </button>

          {/* ② 누굴 */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-[11.5px] font-bold text-neutral-400">누구에게 신청할까</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">최근 일주일 안에 글을 올렸고, 이웃 수가 수백 명대인 같은 주제 블로그가 수락률이 높아요. 대형 블로그는 서로이웃을 잘 받지 않아요.</p>
          </div>

          {/* ③ 뭐라고 — 인사말 생성(탭 복사·재생성). 댓글은 생성하지 않음(가이드만). */}
          <div className="rounded-xl bg-white/70 p-4 ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-[11.5px] font-bold text-neutral-400">서로이웃 인사말</p>
              <button onClick={makeGreeting} disabled={busy} className="at-press rounded-lg bg-neutral-100 px-2.5 py-1 text-[11.5px] font-bold text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-50">
                {busy ? "만드는 중" : greeting ? "새로 만들기" : "만들기"}
              </button>
            </div>
            {greeting ? (
              <button onClick={copyGreeting} className="mt-2 w-full rounded-lg bg-neutral-50 p-3 text-left transition hover:bg-neutral-100">
                <p className="text-[13.5px] leading-relaxed text-neutral-800">{greeting}</p>
                <p className="mt-1.5 text-[11.5px] font-bold text-[#1D75F7]">{copied ? "복사됨 · 신청 창에 붙여넣으세요" : "탭하면 복사돼요"}</p>
              </button>
            ) : (
              <p className="mt-2 text-[12.5px] text-neutral-400">내 블로그 주제에 맞는 인사말을 만들어 드려요.</p>
            )}
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-neutral-400">댓글은 직접 쓰는 게 좋아요 — 글에서 구체적인 한 가지를 언급하고, 질문 하나를 붙여보세요.</p>
          </div>

          {/* ④ 잘하고 있나 — 기대 범위(범위 표현만) + 체크인 코칭 */}
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-[11.5px] font-bold text-neutral-400">어느 정도가 보통일까</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">하루 5명 신청하면 보통 절반쯤 수락돼요. 일주일이면 이웃 15~20명, 방문자가 한 자릿수 중반으로 올라오는 경우가 많아요.</p>
            {coach && <p className="mt-1.5 text-[12.5px] font-semibold text-[#1D75F7]">{coach}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
