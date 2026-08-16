"use client";

import type { CheckinRow } from "@/lib/checkin";

// ★성장 진단(유저 요청: 체크 → 분석 → 액션) — 규칙 기반, 가진 데이터만(체크인·발행 기록). 추정·보장 금지.
export interface GrowthArticleLite { status: string; created_at: string; indexed_status?: string | null }

interface Item { kind: "good" | "warn"; t: string; d: string }
interface Action { t: string; d: string }

export function buildReport(rows: CheckinRow[], articles: GrowthArticleLite[]): { goods: Item[]; warns: Item[]; actions: Action[] } {
  const goods: Item[] = [], warns: Item[] = [], actions: Action[] = [];
  const now = Date.now();
  const week = articles.filter((a) => a.status !== "deleted" && now - new Date(a.created_at).getTime() < 7 * 86400000);
  const pubWeek = week.filter((a) => a.status === "verified" || a.status === "published").length;
  const map = new Map(rows.map((x) => [x.day, x] as const));
  const sum = (from: number, to: number) => { let t = 0, has = false; for (let i = from; i >= to; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; const v = map.get(k)?.visitors; if (typeof v === "number") { t += v; has = true; } } return has ? t : null; };
  const thisW = sum(7, 1), lastW = sum(14, 8);

  // 발행 페이스
  if (pubWeek >= 7) goods.push({ kind: "good", t: "발행 페이스 최상", d: `최근 7일 ${pubWeek}편 — 승인 코스 기준(매일 1편+)을 넘고 있어요.` });
  else if (pubWeek >= 4) goods.push({ kind: "good", t: "발행 페이스 양호", d: `최근 7일 ${pubWeek}편 — 이 흐름만 유지하면 돼요.` });
  else { warns.push({ kind: "warn", t: "발행 페이스 부족", d: `최근 7일 ${pubWeek}편 — 노출·승인 모두 발행 수가 재료예요.` }); actions.push({ t: "오늘의 글부터 한 편", d: "홈의 오늘의 글은 데이터가 고른 글감이라 고민 없이 바로 쓸 수 있어요." }); }

  // 방문 추세
  if (thisW !== null && lastW !== null && lastW > 0) {
    const g = Math.round(((thisW - lastW) / lastW) * 100);
    if (g >= 20) goods.push({ kind: "good", t: `방문 상승세 +${g}%`, d: "지난주 대비 뚜렷한 상승 — 지금 잘 되는 주제를 이어가세요." });
    else if (g >= -10) goods.push({ kind: "good", t: "방문 유지 중", d: "정체처럼 보여도 초기엔 계단식이 정상이에요 — 글이 쌓이면 툭 오르는 구간이 와요." });
    else { warns.push({ kind: "warn", t: `방문 감소 ${g}%`, d: "트렌드 글 유입이 식었을 수 있어요 — 수요형(롱테일) 비중을 늘릴 타이밍이에요." }); actions.push({ t: "꾸준한 수요 글감으로 2~3편", d: "다른 글감에서 '꾸준한 수요' 칩이 붙은 글감을 골라 쓰세요 — 오래 가는 유입을 깔아요." }); }
  } else if (rows.length < 4) {
    warns.push({ kind: "warn", t: "데이터가 아직 적어요", d: "체크인이 쌓여야 추세 분석이 정확해져요." });
    actions.push({ t: "아침 체크인 꾸준히", d: "방문자 숫자 하나면 급등 감지·글감 학습이 전부 돌아가요." });
  }

  // 색인 상태
  const pubs = articles.filter((a) => a.status === "verified" || a.status === "published");
  const notIndexed = pubs.filter((a) => a.indexed_status === "missing").length;
  if (notIndexed >= 2) { warns.push({ kind: "warn", t: `검색 누락 의심 ${notIndexed}편`, d: "발행됐는데 검색에 안 잡히는 글이 있어요." }); actions.push({ t: "네이버 서치어드바이저 확인", d: "내 블로그 수집 상태를 확인하고, 글 제목 그대로 검색해 노출 여부를 점검하세요." }); }
  else if (pubs.length >= 3) goods.push({ kind: "good", t: "발행 글 검색 반영 순항", d: "발행한 글들이 정상적으로 검색에 잡히고 있어요." });

  // 반응(후속) 활용
  const hasHot = articles.some((a) => (a as { hot_at?: string | null }).hot_at);
  if (pubs.length >= 5 && !hasHot) actions.push({ t: "잘 된 글에 '반응 좋아요' 누르기", d: "내 글 → 관리 → 반응 좋아요. 다음 날 그 주제의 후속 글감이 우선 배정돼 트래픽이 이어져요." });

  if (actions.length === 0) actions.push({ t: "지금 하던 대로", d: "페이스가 좋아요. 매일 발행 + 체크인 + 이웃 미션 루틴만 유지하면 돼요." });
  return { goods, warns, actions };
}

export default function GrowthReport({ rows, articles, onClose }: { rows: CheckinRow[]; articles: GrowthArticleLite[]; onClose: () => void }) {
  const { goods, warns, actions } = buildReport(rows, articles);
  return (
    <div className="ateflo-backdrop-in fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="ateflo-sheet-up at-thin-scroll max-h-[90vh] w-full max-w-md overflow-y-auto at-glass-strong rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[17px] font-bold text-neutral-900">성장 진단</p>
        <p className="mt-1 text-[12px] text-neutral-400">기록된 데이터로만 판단해요 — 추정하지 않아요.</p>

        {goods.length > 0 && (
          <div className="mt-4">
            <p className="text-[12.5px] font-bold text-emerald-600">잘하고 있어요</p>
            <div className="mt-2 space-y-2">
              {goods.map((g) => (
                <div key={g.t} className="rounded-[12px] bg-emerald-50/60 px-4 py-3">
                  <p className="text-[13px] font-bold text-emerald-700">{g.t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{g.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {warns.length > 0 && (
          <div className="mt-4">
            <p className="text-[12.5px] font-bold text-amber-600">챙겨볼 것</p>
            <div className="mt-2 space-y-2">
              {warns.map((w) => (
                <div key={w.t} className="rounded-[12px] bg-amber-50/70 px-4 py-3">
                  <p className="text-[13px] font-bold text-amber-700">{w.t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{w.d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-[12.5px] font-bold text-[#1D75F7]">다음 액션</p>
          <div className="mt-2 space-y-2">
            {actions.map((a, i) => (
              <div key={a.t} className="flex gap-3 rounded-[12px] bg-[#1D75F7]/[0.05] px-4 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full tk-grad-cta text-[11px] font-bold text-white">{i + 1}</span>
                <span className="min-w-0">
                  <p className="text-[13px] font-bold text-neutral-800">{a.t}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{a.d}</p>
                </span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 text-center text-sm font-medium text-neutral-400 transition hover:text-neutral-700">닫기</button>
      </div>
    </div>
  );
}
