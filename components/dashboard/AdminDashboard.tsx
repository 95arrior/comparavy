"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminStats } from "@/lib/adminStats";
import Segmented from "./Segmented";
import { slotHours, clampGap } from "@/lib/socialSchedule";

const BRAND = "#3f91ff";
const STATUS_KO: Record<string, string> = { draft: "초안", published: "발행됨", future: "예약됨" };
const KIND_KO: Record<string, string> = {
  generate: "글 생성",
  tag_suggest: "태그 추천",
  keyword_ideas: "글감 추천",
  keyword_guard: "키워드 검사",
};

function won(n: number): string {
  if (n >= 1e8) return `₩${(n / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  if (n >= 1e7) return `₩${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-6">
      <h3 className="text-sm font-semibold tracking-tight text-neutral-900">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-neutral-400">{desc}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, accent = false, hint }: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${accent ? "border-[#3f91ff]/30 bg-[#3f91ff]/5" : "border-neutral-200 bg-white"}`}>
      <p className="truncate text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-[28px]" style={accent ? { color: BRAND } : undefined}>{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function StatButton({ label, value, hint, accent = false, active = false, onClick }: { label: string; value: string; hint?: string; accent?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-w-0 rounded-2xl border p-4 text-left transition hover:border-neutral-400 sm:p-5 ${active ? "border-neutral-900 ring-1 ring-neutral-900" : accent ? "border-[#3f91ff]/30 bg-[#3f91ff]/5" : "border-neutral-200 bg-white"}`}
    >
      <p className="truncate text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-[28px]" style={accent && !active ? { color: BRAND } : undefined}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-neutral-400">{hint ?? (active ? "닫기 ▲" : "눌러서 목록 ▼")}</p>
    </button>
  );
}

function MiniBars({ title, data, color, suffix = "" }: { title: string; data: { date: string; count: number }[]; color: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-400">7일 합 {total.toLocaleString()}{suffix}</p>
      </div>
      <div className="mt-4 flex items-end gap-1 sm:gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-neutral-400">{d.count || ""}</span>
            <div className="flex h-20 w-full items-end sm:h-24">
              <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0, background: color }} />
            </div>
            <span className="text-[9px] text-neutral-400 sm:text-[10px]">{d.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pct(part: number | null, whole: number | null): number {
  if (!whole || whole <= 0 || part === null) return 0;
  return Math.round((part / whole) * 100);
}

function Funnel({ stats }: { stats: AdminStats }) {
  const steps = [
    { key: "join", label: "가입", value: stats.usersTotal ?? 0, color: BRAND },
    { key: "write", label: "글 생성", value: stats.usersWithArticles ?? 0, color: "#5aa0ff" },
    { key: "wp", label: "워드프레스 연결", value: stats.wpConnections ?? 0, color: "#2fd07a" },
    { key: "pub", label: "발행", value: stats.usersWithPublished ?? 0, color: "#21b866" },
    { key: "pro", label: "프로 전환", value: stats.proUsers ?? 0, color: "#b06bff" },
  ];
  const base = steps[0].value || 1;
  // 가장 큰 이탈 구간 찾기 (개선 포인트)
  let worst = -1;
  let worstDrop = -1;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1].value;
    const drop = prev > 0 ? (prev - steps[i].value) / prev : 0;
    if (prev > 0 && drop > worstDrop) {
      worstDrop = drop;
      worst = i;
    }
  }
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
      <div className="space-y-3">
        {steps.map((s, i) => {
          const widthPct = Math.max(2, Math.round((s.value / base) * 100));
          const fromPrev = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null;
          const isWorst = i === worst && worstDrop > 0;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-700">{s.label}</span>
                <span className="shrink-0 text-neutral-500">
                  {s.value.toLocaleString()}명
                  {fromPrev !== null && <span className={`ml-2 text-xs ${isWorst ? "font-semibold text-red-500" : "text-neutral-400"}`}>이전 대비 {fromPrev}%</span>}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${widthPct}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
      {worst > 0 && worstDrop > 0.05 && (
        <div className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700">
          ⚠ 가장 큰 이탈: <b>{steps[worst - 1].label} → {steps[worst].label}</b> ({Math.round(worstDrop * 100)}% 이탈).
          이 구간을 개선하면 효과가 가장 커요.
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: { label: string; value: number; onChange: (v: number) => void; options: { value: number; label: string }[]; disabled?: boolean }) {
  return (
    <label className="block rounded-xl border border-neutral-200 px-3 py-2 transition focus-within:border-neutral-400">
      <span className="mb-0.5 block text-xs text-neutral-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold text-neutral-900 outline-none disabled:opacity-50"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">▼</span>
      </div>
    </label>
  );
}

function LimitGuide() {
  const [open, setOpen] = useState(false);
  const rows = [
    ["~100명", "약 8.5만원", "$500 유지", "지금 그대로"],
    ["~1,000명", "약 85만원", "$1,500~2,500", "유료 ~100명 · MRR ~300만원"],
    ["~10,000명", "약 855만원", "$10,000~15,000", "유료 ~1,000명 · MRR ~3천만원"],
  ];
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
      >
        💡 한도 상향 가이드 {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                {["사용자", "예상 월 비용", "추천 한도", "올리는 시점"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r[0]}>
                  <td className="px-3 py-2 font-semibold text-neutral-800">{r[0]}</td>
                  <td className="px-3 py-2 text-neutral-600">{r[1]}</td>
                  <td className="px-3 py-2 text-neutral-600">{r[2]}</td>
                  <td className="px-3 py-2 text-neutral-500">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-neutral-400">
            기준: 글 1편 ≈ 150원, 유료 전환 ~10%. <b className="text-neutral-500">예산 알림이 70~80% 뜨면 다음 단계로</b> 올리세요. 무료 사용자는 매출 0이라 순비용이니 폭증 시 주의(무료 3편 캡이 방패).
          </p>
        </div>
      )}
    </div>
  );
}

const BILLING_URL = "https://console.anthropic.com/settings/billing";

function BudgetWidget({ stats }: { stats: AdminStats }) {
  const month = stats.monthlyCostKrw ?? 0;
  const budget = stats.budgetKrw;
  const pct = budget > 0 ? Math.min(100, Math.round((month / budget) * 100)) : 0;
  const remain = Math.max(0, budget - month);
  const avg = Math.max(1, stats.avgArticleCostKrw);
  const articlesLeft = Math.floor(remain / avg);
  const freePeople = Math.floor(articlesLeft / 3); // 무료 3편/명
  const proPeople = Math.floor(articlesLeft / 30); // 프로 30편/명
  const warn = pct >= 80;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-neutral-900";

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-neutral-500">이번 달 사용 (추정)</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">{won(month)} <span className="text-sm font-medium text-neutral-400">/ {won(budget)} 한도</span></p>
        </div>
        <a href={BILLING_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50">콘솔에서 확인 ↗</a>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{pct}% 사용 · 남은 예산 {won(remain)}</p>

      <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        남은 예산으로 글 <b className="text-neutral-900">약 {articlesLeft.toLocaleString()}편</b> 더 생성 가능
        <span className="text-neutral-400"> (≈ 무료 {freePeople.toLocaleString()}명 · 프로 {proPeople.toLocaleString()}명분, 글 1편 평균 {won(avg)} 기준)</span>
      </div>

      {warn ? (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>예산의 {pct}%를 썼어요.</b> <a href={BILLING_URL} target="_blank" rel="noopener noreferrer" className="underline">Anthropic 콘솔</a>에서 사용량을 확인하고, 필요하면 <b>월 지출 한도를 올리거나 크레딧을 충전</b>하세요. (자동 리로드가 켜져 있으면 잔액은 자동 충전되지만, 월 한도에 닿으면 멈춰요)
        </p>
      ) : (
        <p className="mt-3 text-xs text-neutral-400">
          이 화면은 ‘쓴 금액 vs 월 한도’예요 — <b className="text-neutral-500">크레딧을 충전해도 따로 알릴 필요 없이</b> 새로고침하면 자동 갱신되고, 매달 초 0으로 리셋돼요. 자동 리로드가 켜져 있어 잔액은 자동 충전돼요. 단, 콘솔에서 <b className="text-neutral-500">월 한도 자체를 바꾸면</b> 설정값(AI_MONTHLY_BUDGET_USD)만 맞춰주세요. 위 금액은 우리 앱 기록 기준 추정치, 정확한 청구는 콘솔이 기준이에요.
        </p>
      )}
    </div>
  );
}

function CostBreakdown({ stats }: { stats: AdminStats }) {
  if (stats.costTotalKrw === null) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-sm text-neutral-500">
        아직 토큰 집계 전이에요. (usage_log 테이블 생성 후 글을 생성하면 실제 비용이 쌓여요)
      </div>
    );
  }
  const max = Math.max(1, ...stats.costByKind.map((k) => k.krw));
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
        <Stat label="누적 API 비용" value={won(stats.costTotalKrw)} accent />
        <Stat label="오늘 비용" value={won(stats.costTodayKrw ?? 0)} />
      </div>
      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5 lg:col-span-2">
        <p className="text-sm font-medium text-neutral-900">종류별 비용</p>
        <div className="mt-3 space-y-2.5">
          {stats.costByKind.length === 0 ? (
            <p className="text-sm text-neutral-400">아직 없어요</p>
          ) : (
            stats.costByKind.map((k) => (
              <div key={k.kind}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">{KIND_KO[k.kind] ?? k.kind}</span>
                  <span className="text-neutral-500">{won(k.krw)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-xl bg-neutral-900" style={{ width: `${Math.max(3, (k.krw / max) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function WaitlistView({ stats }: { stats: AdminStats }) {
  const [copied, setCopied] = useState(false);
  const list = stats.waitlist ?? [];
  function copyAll() {
    const text = list.map((w) => w.email).join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <Section title="사전 등록 대기자" desc="출시 전 사전 등록한 이메일 (최신순). 오픈하면 이 목록으로 안내하면 돼요.">
      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-bold tracking-tight">{(stats.waitlistCount ?? list.length).toLocaleString()}<span className="ml-1 text-sm font-medium text-neutral-400">명</span></p>
          {list.length > 0 && (
            <button onClick={copyAll} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition active:scale-95 hover:border-neutral-900">
              {copied ? "복사됨 ✓" : "이메일 전체 복사"}
            </button>
          )}
        </div>
        <ul className="mt-4 divide-y divide-neutral-100">
          {list.length === 0 ? (
            <li className="py-3 text-sm text-neutral-400">아직 등록자가 없어요</li>
          ) : (
            list.map((w, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs text-neutral-300">{i + 1}</span>
                  <span className="min-w-0 truncate text-neutral-700">{w.email}</span>
                  {w.source && <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400">{w.source}</span>}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">{fmtDate(w.created_at)}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </Section>
  );
}


function SocialView({ stats }: { stats: AdminStats }) {
  const router = useRouter();
  const s = stats.social;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openList, setOpenList] = useState<null | "queued" | "published" | "failed">(null);

  async function call(payload: Record<string, unknown>, okMsg?: string) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setMsg(okMsg ?? "완료"); router.refresh(); }
      else setMsg(d.error ?? "실패했어요");
    } catch {
      setMsg("오류가 났어요");
    } finally {
      setBusy(false);
    }
  }

  if (!s) return <Section title="SNS 발행"><p className="text-sm text-neutral-400">설정을 불러오지 못했어요. (마이그레이션 0017 실행 필요)</p></Section>;

  const hourLabel = (h: number) => (h === 0 ? "오전 12시" : h < 12 ? `오전 ${h}시` : h === 12 ? "오후 12시" : `오후 ${h - 12}시`);
  const perDay = s.postsPerDay ?? 2;
  const gap = clampGap(s.intervalHours ?? 12);
  const scheduleText = slotHours(s.postingHour, perDay, gap).map(hourLabel).join(" · ");

  const queued = s.posts.filter((p) => p.status === "queued");
  const published = s.posts.filter((p) => p.status === "published");
  const failed = s.posts.filter((p) => p.status === "failed");
  const daysLeft = perDay > 0 ? Math.floor(queued.length / perDay) : 0;
  const lowStock = s.autoEnabled && queued.length < perDay * 3; // 3일치 미만이면 경고
  const tokenDays = s.tokenExpiresAt ? Math.floor((new Date(s.tokenExpiresAt).getTime() - Date.now()) / 86400000) : null;
  const tokenWarn = tokenDays !== null && tokenDays < 14; // 자동 갱신이 도는데도 14일 미만이면 점검 필요
  const listFor = openList === "queued" ? queued : openList === "published" ? published : openList === "failed" ? failed : [];

  return (
    <>
      {/* 자동 발행 설정 */}
      <Section title="자동 발행" desc="대기 중인 카드를 정한 시각·간격으로 인스타에 자동 게시해요.">
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
            <div className="flex items-center gap-2.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.autoEnabled ? "bg-emerald-500" : "bg-neutral-300"}`} />
              <span className="text-sm font-semibold">{s.autoEnabled ? "자동 발행 켜짐" : "자동 발행 꺼짐"}</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/ateflo.official" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">인스타그램 ↗</a>
              <button onClick={() => call({ action: "settings", autoEnabled: !s.autoEnabled }, s.autoEnabled ? "중지했어요" : "시작했어요")} disabled={busy} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 ${s.autoEnabled ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800"}`}>{s.autoEnabled ? "종료" : "시작"}</button>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <SelectField label="하루 발행 수" value={perDay} disabled={busy} onChange={(v) => call({ action: "settings", postsPerDay: v }, "발행 수 변경됨")} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}개` }))} />
            <SelectField label="발행 간격" value={gap} disabled={busy} onChange={(v) => call({ action: "settings", intervalHours: v }, "간격 변경됨")} options={[4, 6, 8, 12].map((h) => ({ value: h, label: `${h}시간 간격` }))} />
            <SelectField label="시작 시각" value={s.postingHour} disabled={busy} onChange={(v) => call({ action: "settings", postingHour: v }, "시각 변경됨")} options={Array.from({ length: 17 }, (_, i) => i + 6).map((h) => ({ value: h, label: hourLabel(h) }))} />
          </div>
          <div className="mx-5 mb-5 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            {s.autoEnabled ? <>매일 <b className="text-neutral-900">{scheduleText}</b> (한국시간)에 발행돼요</> : <>‘시작’을 누르면 <b className="text-neutral-900">{scheduleText}</b>에 맞춰 발행돼요</>}
            {msg && <span className="ml-2 text-neutral-400">· {msg}</span>}
          </div>
        </div>
      </Section>

      {/* 발행 현황 — 카드 클릭 시 목록 펼침 */}
      <Section title="발행 현황" desc="카드를 눌러 목록을 펼치고, 썸네일 확인 후 발행·삭제하세요.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatButton label="발행 대기" value={`${queued.length}개`} accent active={openList === "queued"} onClick={() => setOpenList(openList === "queued" ? null : "queued")} hint={openList === "queued" ? "닫기 ▲" : s.autoEnabled ? `약 ${daysLeft}일치 · 목록 ▼` : "눌러서 목록 ▼"} />
          <StatButton label="발행 완료" value={`${published.length}개`} active={openList === "published"} onClick={() => setOpenList(openList === "published" ? null : "published")} hint={openList === "published" ? "닫기 ▲" : "눌러서 목록 ▼"} />
          <StatButton label="발행 실패" value={`${failed.length}개`} active={openList === "failed"} onClick={() => setOpenList(openList === "failed" ? null : "failed")} hint={openList === "failed" ? "닫기 ▲" : failed.length > 0 ? "확인 필요 ▼" : "목록 ▼"} />
          <Stat label="인스타 토큰" value={tokenDays !== null ? `${Math.max(0, tokenDays)}일` : "—"} hint={tokenDays !== null ? "자동 갱신 중" : "갱신 후 표시"} />
        </div>

        {openList && (
          <div className="mt-3 rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
            {listFor.length === 0 ? (
              <p className="py-2 text-sm text-neutral-400">{openList === "queued" ? <>대기 중인 카드가 없어요. 터미널에서 <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px]">npm run card:gen:bulk -- 14</code> 로 채워요.</> : "없어요"}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {listFor.map((p) => (
                  <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                    {p.mediaUrls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {p.mediaUrls.map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="group relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt={`슬라이드 ${i + 1}`} loading="lazy" className="h-28 w-[90px] rounded-lg border border-neutral-200 object-cover transition group-hover:opacity-80" />
                            {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">표지</span>}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">{(p.caption || "(캡션 없음)").split("\n")[0]}{p.error && <span className="ml-1 text-xs text-red-500">· {p.error}</span>}</span>
                      {p.status !== "published" && (
                        <button onClick={() => call({ action: "publishNow", id: p.id }, "발행했어요")} disabled={busy} className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-95 disabled:opacity-50">지금 발행</button>
                      )}
                      <button onClick={() => call({ action: "delete", id: p.id }, p.status === "published" ? "기록만 삭제됐어요 (인스타는 앱에서 삭제)" : "삭제했어요")} disabled={busy} title={p.status === "published" ? "기록만 삭제돼요. 인스타 게시물은 인스타 앱에서 직접 삭제하세요." : "삭제"} className="shrink-0 text-xs text-neutral-400 transition hover:text-red-500 disabled:opacity-50">{p.status === "published" ? "기록 삭제" : "삭제"}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {lowStock && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">대기열이 얼마 안 남았어요{daysLeft <= 0 ? " (곧 끊겨요)" : ` (약 ${daysLeft}일치)`}. 터미널에서 <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[13px]">npm run card:gen:bulk -- 14</code> 으로 더 채워두세요.</p>
        )}
        {tokenWarn && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">인스타 토큰이 <b>{tokenDays! <= 0 ? "만료됐어요" : `${tokenDays}일 뒤 만료`}</b>. 자동 갱신(주 1회)이 도는지 확인하고, 안 되면 다시 발급해 주세요.</p>
        )}
      </Section>
    </>
  );
}

export default function AdminDashboard({ stats }: { stats?: AdminStats | null }) {
  const [view, setView] = useState<"stats" | "waitlist" | "social">("stats");
  if (!stats) return <p className="text-sm text-neutral-500">통계를 불러오지 못했어요.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">관리자 대시보드</h2>
      <p className="mt-1 text-sm text-neutral-500">서비스 현황 한눈에 보기 · 오늘=한국시간 · 새로고침하면 최신</p>

      {stats.ai && !stats.ai.ok && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <b>⚠️ 글·카드 생성이 중단됐어요.</b> Claude 크레딧/결제 문제로 보여요. Anthropic 콘솔에서 크레딧을 충전하면 자동 복구돼요.
          {stats.ai.lastError && <span className="ml-1 text-red-500">({stats.ai.lastError.slice(0, 80)})</span>}
        </div>
      )}

      <div className="mt-4">
        <Segmented
          options={[
            { value: "stats", label: "분석" },
            { value: "social", label: "SNS" },
            { value: "waitlist", label: "대기자" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "social" ? (
        <SocialView stats={stats} />
      ) : view === "waitlist" ? (
        <WaitlistView stats={stats} />
      ) : (
        <>
      {/* 요약 */}
      <Section title="요약">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="예상 월매출(MRR)" value={stats.mrr === null ? "—" : won(stats.mrr)} accent hint={stats.proUsers !== null ? `프로 ${stats.proUsers}명` : undefined} />
          <Stat label="전체 회원" value={stats.usersTotal?.toLocaleString() ?? "—"} hint={stats.usersToday !== null ? `오늘 +${stats.usersToday}` : undefined} />
          <Stat label="전환율(무료→프로)" value={stats.conversion === null ? "—" : `${stats.conversion}%`} hint={stats.freeUsers !== null ? `무료 ${stats.freeUsers} · 프로 ${stats.proUsers}` : undefined} />
          <Stat label={stats.costTotalKrw !== null ? "API 누적 비용" : "추정 비용"} value={stats.costTotalKrw !== null ? won(stats.costTotalKrw) : stats.estCostKrw !== null ? won(stats.estCostKrw) : "—"} hint={stats.costTotalKrw !== null ? `오늘 ${won(stats.costTodayKrw ?? 0)}` : "토큰 집계 전 추정"} />
        </div>
      </Section>

      {/* 성장 추이 */}
      <Section title="성장 추이" desc="최근 7일 (한국시간 기준)">
        <div className="grid gap-3 lg:grid-cols-2">
          <MiniBars title="가입" data={stats.dailyUsers} color={BRAND} suffix="명" />
          <MiniBars title="글 생성" data={stats.dailyArticles} color="#2fd07a" suffix="편" />
        </div>
      </Section>

      {/* 퍼널 */}
      <Section title="사용자 퍼널 · 개선 포인트" desc="가입 → 글 생성 → 워드프레스 연결 → 발행 → 프로. 어디서 이탈하는지 보고 개선 우선순위를 정해요.">
        <Funnel stats={stats} />
      </Section>

      {/* 운영 지표 */}
      <Section title="운영 지표">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="오늘 생성" value={`${(stats.articlesToday ?? 0).toLocaleString()}편`} />
          <Stat label="사용자당 평균 글" value={stats.articlesPerUser === null ? "—" : `${stats.articlesPerUser}편`} />
          <Stat label="워드프레스 연결률" value={stats.wpConnectRate === null ? "—" : `${stats.wpConnectRate}%`} hint={stats.wpConnections !== null ? `${stats.wpConnections}곳` : undefined} />
          <Stat label="발행률" value={stats.publishRate === null ? "—" : `${stats.publishRate}%`} hint={stats.publishedArticles !== null ? `발행 ${stats.publishedArticles}/${stats.articlesTotal}` : undefined} />
        </div>
      </Section>

      {/* 크레딧·예산 현황 */}
      <Section title="크레딧·예산 현황" desc="이번 달 API 비용과 남은 여력. 한도 근접 시 콘솔에서 확인 후 충전·한도조정 하면 돼요.">
        <BudgetWidget stats={stats} />
        <LimitGuide />
      </Section>

      {/* API 비용 */}
      <Section title="API 비용" desc="실제 토큰 기반 (Anthropic). 비용 구조를 파악해 가격·한도 정책에 반영해요.">
        <CostBreakdown stats={stats} />
      </Section>

      {/* 최근 활동 */}
      <Section title="최근 활동">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-900">최근 가입</p>
            <ul className="mt-3 divide-y divide-neutral-100">
              {stats.recentUsers.length === 0 ? (
                <li className="py-2 text-sm text-neutral-400">아직 없어요</li>
              ) : (
                stats.recentUsers.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-neutral-700">{u.email}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{fmtDate(u.created_at)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-900">최근 글</p>
            <ul className="mt-3 divide-y divide-neutral-100">
              {stats.recentArticles.length === 0 ? (
                <li className="py-2 text-sm text-neutral-400">아직 없어요</li>
              ) : (
                stats.recentArticles.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-neutral-700">{a.locked ? "🔒 " : ""}{a.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{a.locked ? "미리보기" : STATUS_KO[a.status] ?? a.status} · {fmtDate(a.created_at)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </Section>
        </>
      )}
    </div>
  );
}
