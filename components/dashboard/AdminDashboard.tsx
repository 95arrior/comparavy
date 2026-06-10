"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminStats } from "@/lib/adminStats";
import Segmented from "./Segmented";
import { slotHours } from "@/lib/socialSchedule";

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

const SOC_TYPE_KO: Record<string, string> = { image: "이미지", reel: "릴스", carousel: "카드뉴스" };
const SOC_STATUS: Record<string, string> = { queued: "대기", published: "발행됨", failed: "실패" };

function SocialView({ stats }: { stats: AdminStats }) {
  const router = useRouter();
  const s = stats.social;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
  const scheduleText = slotHours(s.postingHour, perDay).map(hourLabel).join(" · ");

  const daysLeft = perDay > 0 ? Math.floor(s.queueCount / perDay) : 0;
  const lowStock = s.autoEnabled && s.queueCount < perDay * 3; // 3일치 미만이면 경고
  const tokenDays = s.tokenExpiresAt ? Math.floor((new Date(s.tokenExpiresAt).getTime() - Date.now()) / 86400000) : null;
  const tokenWarn = tokenDays !== null && tokenDays < 14; // 자동 갱신이 도는데도 14일 미만이면 점검 필요

  return (
    <>
      {/* 인스타 바로가기 */}
      <div className="mb-3 flex justify-end">
        <a
          href="https://instagram.com/ateflo.official"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 active:scale-95"
        >
          인스타그램 열기 ↗
        </a>
      </div>

      {/* 숫자 요약 */}
      <Section title="SNS 발행 현황" desc="클로드가 만든 카드뉴스가 보관함에 쌓이고, 정한 시각마다 자동 게시돼요.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="발행 대기" value={`${s.queueCount}개`} accent hint={s.autoEnabled ? `약 ${daysLeft}일치` : undefined} />
          <Stat label="발행 완료" value={`${s.publishedCount}개`} />
          <Stat label="자동 발행" value={s.autoEnabled ? "켜짐" : "꺼짐"} hint={s.autoEnabled ? `하루 ${perDay}개` : "지금은 멈춤"} />
        </div>
        {lowStock && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            대기열이 얼마 안 남았어요{daysLeft <= 0 ? " (곧 끊겨요)" : ` (약 ${daysLeft}일치)`}. 터미널에서 <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[13px]">npm run card:gen:bulk -- 20</code> 으로 더 채워두세요.
          </p>
        )}
        {s.failedCount > 0 && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            발행 실패 <b>{s.failedCount}건</b> (3회 재시도 후 멈춤). 아래 보관함에서 원인을 확인하고 ‘지금 발행’으로 재시도하세요.
          </p>
        )}
        {tokenWarn && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            인스타 토큰이 <b>{tokenDays! <= 0 ? "만료됐어요" : `${tokenDays}일 뒤 만료`}</b>. 자동 갱신(주 1회)이 도는지 확인하고, 안 되면 토큰을 다시 발급해 주세요.
          </p>
        )}
        {tokenDays !== null && !tokenWarn && (
          <p className="mt-2 text-xs text-neutral-400">인스타 토큰 약 {tokenDays}일 남음 (자동 갱신 중)</p>
        )}
      </Section>

      {/* 자동 발행 제어 */}
      <Section title="자동 발행" desc="보관함에 쌓인 글을 하루 발행 수만큼 시간 간격을 두고 인스타에 자동 게시해요.">
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.autoEnabled ? "bg-emerald-500" : "bg-neutral-300"}`} />
              <span className="text-sm font-semibold">{s.autoEnabled ? "자동 발행 켜짐" : "자동 발행 꺼짐"}</span>
            </div>
            <button
              onClick={() => call({ action: "settings", autoEnabled: !s.autoEnabled }, s.autoEnabled ? "중지했어요" : "시작했어요")}
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50 ${s.autoEnabled ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800"}`}
            >
              {s.autoEnabled ? "종료" : "시작"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 text-neutral-500">
              하루 발행 수
              <select
                value={perDay}
                onChange={(e) => call({ action: "settings", postsPerDay: Number(e.target.value) }, "발행 수 변경됨")}
                disabled={busy}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>하루 {n}개</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-neutral-500">
              시작 시각
              <select
                value={s.postingHour}
                onChange={(e) => call({ action: "settings", postingHour: Number(e.target.value) }, "시각 변경됨")}
                disabled={busy}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none"
              >
                {[7, 8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22].map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            {s.autoEnabled ? <>매일 <b className="text-neutral-800">{scheduleText}</b>(한국시간)에 자동 발행돼요</> : "‘시작’을 누르면 정해둔 시각에 맞춰 자동 발행돼요"}
            {msg && <span className="ml-2 text-neutral-400">· {msg}</span>}
          </p>
        </div>
      </Section>

      {/* 보관함 목록 */}
      <Section title="보관함" desc="카드뉴스는 로컬에서 `npm run card:gen:bulk -- 20` 으로 한 번에 여러 개 만들어 쌓아둬요. 오래된 것부터 자동 발행돼요. (발행된 글은 인스타 API로 못 지움 · 인스타 앱에서 직접 삭제)">
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-4 sm:p-5">
          <ul className="divide-y divide-neutral-100">
            {s.posts.length === 0 ? (
              <li className="py-3 text-sm text-neutral-400">아직 없어요</li>
            ) : (
              s.posts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">{SOC_TYPE_KO[p.type] ?? p.type}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{p.caption || "(캡션 없음)"}{p.error && <span className="ml-1 text-xs text-red-500">· {p.error}</span>}</span>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${p.status === "published" ? "bg-emerald-600 text-white" : p.status === "failed" ? "bg-red-100 text-red-600" : "bg-[#3f91ff]/10 text-[#2f7fe6]"}`}>{SOC_STATUS[p.status] ?? p.status}</span>
                  {p.status !== "published" && (
                    <button onClick={() => call({ action: "publishNow", id: p.id }, "발행했어요")} disabled={busy} className="shrink-0 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50">지금 발행</button>
                  )}
                  <button
                    onClick={() => call({ action: "delete", id: p.id }, p.status === "published" ? "기록만 삭제됐어요 (인스타는 앱에서 삭제)" : "삭제했어요")}
                    disabled={busy}
                    title={p.status === "published" ? "기록만 삭제돼요. 인스타 게시물은 인스타 앱에서 직접 삭제하세요." : "대기열에서 삭제"}
                    className="shrink-0 text-xs text-neutral-400 transition hover:text-red-500 disabled:opacity-50"
                  >
                    {p.status === "published" ? "기록 삭제" : "삭제"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
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
