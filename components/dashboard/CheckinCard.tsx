"use client";

import { cachedGet, invalidateGet } from "@/lib/clientFetchCache";

import { useEffect, useState } from "react";
import { adpostKey } from "@/lib/course";
import { yesterdayPublished, type CourseArticleLite } from "@/lib/course";

// ★아침 체크인 — 1일 1회, 30초 동선(숫자 키패드·어제와 같음·건너뛰기). 입력 즉시 스파크바가 자란다.
//  수익 칸은 애드포스트 승인 후에만(승인 상태는 Stage 4의 승인 결과 입력이 세팅 — ateflo_adpost_approved).
//  이모지·보장 표현 금지. 놓친 날은 그래프에 공백(정직).

interface Row { day: string; visitors: number | null; revenue: number | null }

export default function CheckinCard({ blogKey, articles, onSaved }: { blogKey?: string | null; articles: CourseArticleLite[]; onSaved?: () => void }) {
  const [state, setState] = useState<"loading" | "form" | "done" | "skipped" | "recorded">("loading");
  const [savedRow, setSavedRow] = useState<Row | null>(null); // 오늘 기록값(요약·수정용)
  const [rows, setRows] = useState<Row[]>([]);
  const [prev, setPrev] = useState<Row | null>(null);
  const [visitors, setVisitors] = useState("");
  const [revenue, setRevenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstRevenue, setFirstRevenue] = useState(false);
  const [spikeAsk, setSpikeAsk] = useState(false); // ★급등 감지 — "어제 어떤 글이 잘 됐어요?" 후속 질문
  const [verdict, setVerdict] = useState<string | null>(null); // ★즉석 판정 — 기록의 보상(며칠차 벤치마크)
  useEffect(() => { // 판정 복원(소유감) — 최근 판정은 recorded 상태에서도 계속 보이게
    try { const raw = localStorage.getItem("ateflo_verdict_last"); if (raw) { const v = JSON.parse(raw); if (typeof v?.text === "string") setVerdict(v.text); } } catch { /* ignore */ }
  }, []);
  const [backfillDay, setBackfillDay] = useState<string | null>(null); // 빠진 날 채우기 대상
  const [statGuide, setStatGuide] = useState(false); // ★통계 보는 법(네이버 API 불가 — 손잡고 안내)
  const approved = typeof window !== "undefined" && (() => { try { return localStorage.getItem(adpostKey("approved", blogKey)) === "1"; } catch { return false; } })();
  const skipKey = `ateflo_checkin_skip_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await cachedGet<{ rows?: Row[]; doneToday?: boolean; yesterdayKey?: string; prev?: Row | null }>("/api/checkin");
        if (!alive) return;
        const rs: Row[] = Array.isArray(d.rows) ? d.rows : [];
        setRows(rs);
        setPrev(d.prev ?? null);
        const yRow = rs.find((r) => r.day === d.yesterdayKey) ?? null;
        if (yRow) { setSavedRow(yRow); setState("recorded"); return; }           // 이미 기록 → 한 줄 요약(수정 가능)
        if (localStorage.getItem(skipKey) === "1") { setState("skipped"); return; } // 건너뜀 → 한 줄(다시 열기 가능, 내일 자동 재등장)
        setState("form");
      } catch { if (alive) setState("recorded"), setSavedRow(null); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(v: string, r: string) {
    if (busy) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (backfillDay) payload.day = backfillDay; // 소급(빠진 날 채우기)
      if (v.trim() !== "") payload.visitors = Number(v);
      if (approved && r.trim() !== "") payload.revenue = Number(r);
      if (Object.keys(payload).length === 0) { setBusy(false); return; }
      const res = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { setVerdict(null); setBusy(false); alert(d.error ?? "저장하지 못했어요. 잠시 후 다시 시도해 주세요."); return; } // ★무반응 금지(실측)
      invalidateGet("/api/checkin"); // 저장 후 캐시 무효화 — 다른 컴포넌트가 새 값을 본다
      if (d.spike === true) setSpikeAsk(true); // 증폭 신호원(유저 입력 기반)
      if (typeof d.verdict === "string") { setVerdict(d.verdict); try { localStorage.setItem("ateflo_verdict_last", JSON.stringify({ day: d.day, text: d.verdict })); } catch { /* ignore */ } }
      const newRow: Row = { day: d.day, visitors: d.visitors, revenue: d.revenue };
      setRows((prevRows) => [...prevRows.filter((x) => x.day !== d.day), newRow]);
      // 첫 수익 1회성 카드
      if ((d.revenue ?? 0) > 0) {
        try { if (localStorage.getItem("ateflo_first_revenue") !== "1") { localStorage.setItem("ateflo_first_revenue", "1"); setFirstRevenue(true); } } catch { /* ignore */ }
      }
      if (backfillDay) {
        setBackfillDay(null);
        setState("recorded"); setBusy(false); return; // 소급은 요약(어제 기록)을 덮지 않는다 — rows만 갱신
      }
      setSavedRow(newRow);
      setState("done");
      onSaved?.();
      if (d.spike !== true) setTimeout(() => setState("recorded"), firstRevenue || typeof d.verdict === "string" ? 4200 : 1600); // 급등 질문 중엔 유지 // 그래프 성장 보여준 뒤 한 줄 요약으로(수정 가능)
    } finally { setBusy(false); }
  }

  if (state === "loading") return null;
  if (state === "recorded" && savedRow === null) return null; // 로드 실패 — 다음 진입에 재시도
  // 건너뜀 — 실수 복구: 탭하면 즉시 폼 복귀. 내일이 되면(skipKey 날짜 변경) 자동으로 폼 재등장.
  if (state === "skipped") {
    return (
      <button onClick={() => { try { localStorage.removeItem(skipKey); } catch { /* ignore */ } setState("form"); }}
        className="at-rise flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3 text-left ring-1 ring-black/[0.04] transition hover:bg-neutral-50">
        <span className="text-[12.5px] font-medium text-neutral-400">오늘 체크인은 건너뛰었어요</span>
        <span className="text-[12.5px] font-bold text-[#1D75F7]">다시 열기</span>
      </button>
    );
  }
  // 기록 완료 — 한 줄 요약 + 수정(오입력 복구). upsert라 다시 저장하면 덮어쓴다.
  if (state === "recorded" && savedRow) {
    // 최근 7일 중 빠진 날(기록 없음) — 소급 채우기 제안(가장 최근 것 하나씩)
    const missed = (() => {
      const have = new Set(rows.map((r) => r.day));
      const out: string[] = [];
      for (let i = 2; i <= 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; if (!have.has(k)) out.push(k); }
      return out;
    })();
    return (
      <div className="at-rise rounded-2xl bg-white px-5 py-3 ring-1 ring-black/[0.04]">
        <button onClick={() => { setBackfillDay(null); setVisitors(savedRow.visitors !== null ? String(savedRow.visitors) : ""); setRevenue(savedRow.revenue !== null ? String(savedRow.revenue) : ""); setState("form"); }}
          className="flex w-full items-center justify-between text-left">
          <span className="text-[12.5px] font-medium text-neutral-500">어제 기록 · 방문자 {savedRow.visitors ?? 0}명{savedRow.revenue !== null ? ` · ${savedRow.revenue.toLocaleString("ko-KR")}원` : ""}</span>
          <span className="text-[12.5px] font-bold text-[#1D75F7]">수정</span>
        </button>
        {verdict && <p className="mt-2 rounded-[10px] bg-[#1D75F7]/[0.06] px-3 py-2 text-[12px] font-semibold text-[#1D75F7]">{verdict}</p>}
        {missed.length > 0 && (
          <button onClick={() => { setBackfillDay(missed[0]); setVisitors(""); setRevenue(""); setState("form"); }}
            className="mt-2 text-[12px] font-semibold text-neutral-400 transition hover:text-[#1D75F7]">
            빠진 날 {missed.length}개 채우기 — 날짜를 골라 넣을 수 있어요
          </button>
        )}
      </div>
    );
  }
  const yPub = yesterdayPublished(articles);
  const last7 = (() => {
    const map = new Map(rows.map((r) => [r.day, r] as const));
    const out: { key: string; v: number | null }[] = [];
    for (let i = 7; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; out.push({ key: k, v: map.get(k)?.visitors ?? null }); }
    return out;
  })();

  return (
    <div className="at-rise rounded-[20px] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold tracking-tight text-[#1D75F7]">아침 체크인</p>
        <span className="text-[11px] font-semibold text-neutral-400">{yPub ? "어제 발행 확인됨" : "어제 발행 기록 없음"}</span>
      </div>

      {/* ★날짜 칩 스트립(유저 실측: 날짜 찾기 힘듦·놓친 날 채우기 불편) — 탭=그 날짜 입력/수정, 빈 날이 한눈에 보인다 */}
      <div className="mt-3 flex gap-1.5">
        {last7.map((b) => {
          const yesterdayKey = last7[last7.length - 1]?.key;
          const selected = (backfillDay ?? yesterdayKey) === b.key;
          const d = new Date(`${b.key}T00:00:00`);
          const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
          return (
            <button key={b.key} onClick={() => {
              setBackfillDay(b.key === yesterdayKey ? null : b.key);
              const row = rows.find((r) => r.day === b.key);
              setVisitors(row && row.visitors !== null ? String(row.visitors) : "");
              setRevenue(row && row.revenue !== null ? String(row.revenue) : "");
            }} className={`flex flex-1 flex-col items-center rounded-[10px] py-1.5 transition ${selected ? "bg-[#1D75F7] text-white" : b.v === null ? "bg-[#F7F8FA] text-neutral-400 ring-1 ring-dashed ring-neutral-200" : "bg-[#EFF6FF] text-[#1D75F7]"}`}>
              <span className="text-[10px] font-semibold opacity-80">{wd}</span>
              <span className="text-[11.5px] font-bold tabular-nums">{d.getDate()}</span>
              <span className={`text-[9.5px] font-semibold ${selected ? "text-white/80" : ""}`}>{b.v === null ? "비어요" : b.v}</span>
            </button>
          );
        })}
      </div>

      {state === "done" ? (
        <div className="mt-3">
          <p className="text-[14px] font-bold text-neutral-900">기록했어요.</p>
          {verdict && <p className="mt-1.5 rounded-[10px] bg-[#1D75F7]/[0.06] px-3 py-2 text-[12.5px] font-semibold text-[#1D75F7]">{verdict}</p>}
          {spikeAsk && (() => {
            const recent = articles.filter((a) => ["verified", "published", "pending_verify"].includes(a.status) && new Date(a.created_at).getTime() >= Date.now() - 7 * 86400000).slice(0, 5) as unknown as { id: string; title: string }[];
            if (recent.length === 0) return null;
            return (
              <div className="mt-3 rounded-xl bg-[#1D75F7]/[0.06] p-3.5">
                <p className="text-[13px] font-bold text-[#1D75F7]">방문자가 확 뛰었어요. 어제 어떤 글이 잘 됐어요?</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">네이버 크리에이터 어드바이저의 유입 분석에서 글별 방문을 확인할 수 있어요.</p>
                <div className="mt-2 space-y-1.5">
                  {recent.map((a) => (
                    <button key={a.id} onClick={async () => {
                      await fetch(`/api/articles/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hot: true }) });
                      setSpikeAsk(false);
                    }} className="at-press w-full rounded-lg bg-white px-3 py-2 text-left text-[12.5px] font-semibold text-neutral-700 ring-1 ring-black/[0.05] transition hover:bg-neutral-50">{a.title}</button>
                  ))}
                </div>
                <button onClick={() => setSpikeAsk(false)} className="mt-1.5 w-full py-1 text-center text-[11.5px] text-neutral-400">모르겠어요 · 건너뛰기</button>
              </div>
            );
          })()}
          {firstRevenue && (
            <div className="mt-2 rounded-xl bg-[#1D75F7]/[0.06] px-4 py-3">
              <p className="text-[14px] font-bold text-[#1D75F7]">첫 수익이에요. 여기서부터 시작입니다.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <label className="flex-1">
              <span className="text-[11.5px] font-semibold text-neutral-400">{(() => {
                const d = backfillDay ? new Date(`${backfillDay}T00:00:00`) : new Date(Date.now() - 86_400_000);
                const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                return `${d.getMonth() + 1}월 ${d.getDate()}일(${wd}) 방문자`;
              })()}</span>
              <button onClick={() => setStatGuide((v) => !v)} className="ml-2 text-[11.5px] font-bold text-[#1D75F7]">어디서 보나요?</button>
              {statGuide && (
                <div className="mt-2 w-full rounded-[12px] bg-[#F7F8FA] p-4 text-left">
                  <p className="text-[12.5px] font-bold text-neutral-800">네이버 통계 보는 법 (1분)</p>
                  <ol className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-neutral-500">
                    <li><b className="text-neutral-800">1.</b> 네이버 블로그 앱을 열고 <b className="text-neutral-800">내 블로그</b>를 눌러요</li>
                    <li><b className="text-neutral-800">2.</b> 프로필 아래 <b className="text-neutral-800">통계</b>를 눌러요 (컴퓨터는 내 블로그 → 관리 → 통계)</li>
                    <li><b className="text-neutral-800">3.</b> <b className="text-neutral-800">‘조회수’</b> 숫자를 그대로 아래 칸에 적으면 끝이에요</li>
                  </ol>
                  <p className="mt-2.5 text-[12.5px] font-bold text-neutral-800">보이는 것마다 할 일이 달라요</p>
                  <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-neutral-500">
                    <li>• 조회수가 <b className="text-neutral-800">확 뛰었다</b> → 그대로 기록하세요, 제가 알아채고 내일 후속 글감을 준비할게요</li>
                    <li>• <b className="text-neutral-800">게시물 순위 1위 글</b>이 보인다 → 내 글에서 그 글의 <b className="text-neutral-800">관리 → 반응 좋아요</b>를 눌러주세요 — 이어지는 글로 방문을 키워요</li>
                    <li>• 며칠째 <b className="text-neutral-800">0</b>이다 → 정상이에요(색인 전). 계속 0이면 성과 탭에 진단 카드가 자동으로 떠요</li>
                  </ul>
                </div>
              )}
              <input inputMode="numeric" pattern="[0-9]*" value={visitors} onChange={(e) => setVisitors(e.target.value.replace(/[^0-9]/g, ""))} placeholder={prev?.visitors !== null && prev?.visitors !== undefined ? `직전 기록 ${prev.visitors}명` : "네이버 통계의 조회수"}
                className="mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] font-bold text-neutral-900 outline-none ring-1 ring-black/[0.05] focus:ring-2 focus:ring-[#1D75F7]/30" />
              {visitors.trim() !== "" && prev?.visitors !== null && prev?.visitors !== undefined && (() => {
                const cur = Number(visitors), base = Number(prev.visitors);
                if (!Number.isFinite(cur) || base <= 0) return null;
                const diff = cur - base; const pct = Math.round((diff / base) * 100);
                return <p className={`mt-1.5 text-[12px] font-bold ${diff >= 0 ? "text-emerald-600" : "text-amber-600"}`}>{diff >= 0 ? `직전보다 +${diff}명 (${pct}%↑)` : `직전보다 ${diff}명 (${Math.abs(pct)}%↓) — 흐름은 주간으로 봐요`}</p>;
              })()}
            </label>
            {approved && (
              <label className="flex-1">
                <span className="text-[11.5px] font-semibold text-neutral-400">어제 수익(원)</span>
                <input inputMode="numeric" pattern="[0-9]*" value={revenue} onChange={(e) => setRevenue(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                  className="mt-1 w-full rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[15px] font-bold text-neutral-900 outline-none ring-1 ring-black/[0.05] focus:ring-2 focus:ring-[#1D75F7]/30" />
              </label>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => save(visitors, revenue)} disabled={busy || (visitors.trim() === "" && (!approved || revenue.trim() === ""))}
              className="at-press flex-1 rounded-xl tk-grad-cta py-2.5 text-[13.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? "저장 중" : "기록하기"}
            </button>

          </div>
        </>
      )}
    </div>
  );
}
