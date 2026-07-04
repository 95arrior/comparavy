"use client";

import { useEffect, useState } from "react";
import { threeDayZeroWithPosts, type CheckinRow } from "@/lib/checkin";
import type { CourseArticleLite } from "@/lib/course";

// ★진단 분기 — 3일 연속 방문자 0 + 발행 있음 → 노출 점검 안내. 원인 단정 금지, 확인 행동만.
export default function DiagnosisCard({ articles }: { articles: CourseArticleLite[] }) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/checkin").then((r) => r.json()).then((d) => {
      if (!alive) return;
      const rows: CheckinRow[] = Array.isArray(d.rows) ? d.rows : [];
      setShow(threeDayZeroWithPosts(rows, articles));
    }).catch(() => { /* ignore */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!show) return null;

  const steps = [
    { t: "내 글 제목을 복사하세요", d: "내 글 탭에서 최근 발행한 글의 제목을 그대로 복사해요." },
    { t: "네이버에서 제목 그대로 검색하세요", d: "검색 결과에 내 글이 보이면 노출은 되고 있는 거예요. 순위가 낮을 뿐이니 꾸준함이 답이에요." },
    { t: "안 보이면 누락 여부를 확인하세요", d: "네이버 검색창에 내 블로그 주소를 검색해 보고, 그래도 안 나오면 '네이버 서치어드바이저'에서 내 블로그 수집 상태를 확인할 수 있어요." },
  ];

  return (
    <>
      <button onClick={() => { setOpen(true); setStep(0); }} className="at-rise mt-3 flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3.5 text-left ring-1 ring-black/[0.04] transition hover:bg-neutral-50">
        <span className="min-w-0 flex-1">
          <span className="text-[13px] font-bold text-neutral-800">글이 검색에 잘 노출되는지 확인해볼까요?</span>
          <span className="mt-0.5 block text-[12px] text-neutral-400">발행은 이어지는데 방문 기록이 3일째 0이에요. 확인 방법을 알려드릴게요.</span>
        </span>
        <span className="shrink-0 text-[12.5px] font-bold text-[#1D75F7]">확인하기</span>
      </button>

      {open && (
        <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
          <div className="ateflo-sheet-up w-full max-w-md at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 tk-grad-cta" : "w-1.5 bg-neutral-200"}`} />)}</div>
            <p className="mt-4 text-[17px] font-bold text-neutral-900">{steps[step].t}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-600">{steps[step].d}</p>
            {step === 2 && (
              <a href="https://searchadvisor.naver.com" target="_blank" rel="noopener noreferrer" className="mt-3 block w-full rounded-xl bg-[#03C75A] py-3 text-center text-[14px] font-bold text-white transition hover:opacity-90">서치어드바이저 열기</a>
            )}
            <button onClick={() => (step < steps.length - 1 ? setStep(step + 1) : setOpen(false))} className="at-press mt-4 w-full rounded-xl tk-grad-cta py-3.5 text-[15px] font-bold text-white transition hover:opacity-90">
              {step < steps.length - 1 ? "다음" : "확인 끝"}
            </button>
            <button onClick={() => setOpen(false)} className="mt-2 w-full py-2 text-center text-[13px] font-medium text-neutral-400">닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
