"use client";

import { useState } from "react";
import type { AdminStats } from "@/lib/adminStats";

// ★관리자 대시보드 v2 — 네이버·크레딧 시대에 '관리자에게만 필요한 것'으로 재구성.
// 구성: 오늘 요약 → 크레딧 경제(판매·소모·부채·비용) → 여정 퍼널 → 7일 추이 → 도구(지급·리셋) → 최근 가입/글.
// 구버전의 WP 지표·SNS 발행 도구·플랜(MRR) 지표는 폐기.

const BRAND = "#1D75F7";
const PACK_LABEL: Record<string, string> = { trial: "트라이얼", standard: "스탠다드", approval: "승인팩", pro: "프로", etc: "기타" };

function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}
function fmtDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[13px] font-bold text-neutral-400">{title}</h2>
        {hint && <span className="text-[11px] text-neutral-300">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl at-glass p-4">
      <p className="truncate text-[11.5px] font-semibold text-neutral-400">{label}</p>
      <p className={`mt-1 truncate text-[20px] font-extrabold tracking-tight ${accent ? "text-[#1D75F7]" : "text-neutral-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function MiniBars({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-2xl at-glass p-4">
      <p className="text-[11.5px] font-semibold text-neutral-400">{title}</p>
      <div className="mt-3 flex h-16 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-neutral-500">{d.count > 0 ? d.count : ""}</span>
            <div className="w-full rounded-t" style={{ height: `${Math.max(3, (d.count / max) * 44)}px`, background: color, opacity: d.count > 0 ? 1 : 0.15 }} />
            <span className="text-[9px] text-neutral-300">{d.date.slice(5).replace("-", "/")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 여정 퍼널 — 가입 → 온보딩 → 첫 글 → 발행 → 결제
function Funnel({ stats }: { stats: AdminStats }) {
  const steps = [
    { label: "가입", value: stats.usersTotal ?? 0 },
    { label: "온보딩 완료", value: stats.usersWithProfile ?? 0 },
    { label: "첫 글", value: stats.usersWithArticles ?? 0 },
    { label: "발행", value: stats.usersWithPublished ?? 0 },
    { label: "결제", value: stats.creditEconomy?.buyers ?? 0 },
  ];
  const max = Math.max(1, steps[0].value);
  return (
    <div className="rounded-2xl at-glass p-5">
      <div className="space-y-2.5">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].value : s.value;
          const rate = prev > 0 ? Math.round((s.value / prev) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[12px] font-semibold text-neutral-600">{s.label}</span>
              <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-md bg-neutral-100">
                <div className="flex h-full items-center rounded-md px-2" style={{ width: `${Math.max(4, (s.value / max) * 100)}%`, background: BRAND, opacity: 1 - i * 0.14 }}>
                  <span className="text-[11px] font-bold text-white">{s.value}</span>
                </div>
              </div>
              {i > 0 && <span className="w-10 shrink-0 text-right text-[11px] font-medium text-neutral-400">{rate}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ★선불 연료 플래너 — Anthropic(글)·Google(이미지) 모두 선불이라 '잔여 일수'가 운영 생명줄.
// 실측(최근 7일 글 생성·평균 원가) + 가정(유저·인당 글·글당 이미지)으로 일 소모를 계산하고,
// 입력한 잔액으로 며칠 버티는지 + 30일 권장 충전액을 보여준다. 입력값은 이 기기에 저장.
const FX = 1400; // USD→KRW
const IMG_COST_KRW = 55; // Gemini 이미지 1장(~$0.039)

function FuelPlanner({ stats }: { stats: AdminStats }) {
  const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const [antBal, setAntBal] = useState(() => read("adm_ant_usd", ""));   // Anthropic 잔액($)
  const [gemBal, setGemBal] = useState(() => read("adm_gem_krw", ""));   // Google 잔액(₩)
  const [users, setUsers] = useState(() => read("adm_users", String(stats.usersTotal ?? 1)));
  const [perDay, setPerDay] = useState(() => read("adm_perday", "1"));   // 인당 하루 글
  const [imgs, setImgs] = useState(() => read("adm_imgs", "2"));         // 글당 이미지
  const save = (k: string, v: string, fn: (v: string) => void) => { fn(v); try { localStorage.setItem(k, v); } catch { /* ignore */ } };

  // 실측 — 최근 7일 일평균 글 생성 + 글 1편 실측 원가
  const avgDaily = Math.max(0, Math.round((stats.dailyArticles.reduce((t, d) => t + d.count, 0) / 7) * 10) / 10);
  const artCost = stats.avgArticleCostKrw; // 실측(usage_log) 기반, 없으면 추정치

  // 가정 시나리오 일 소모
  const n = Math.max(0, Number(users) || 0), m = Math.max(0, Number(perDay) || 0), im = Math.max(0, Number(imgs) || 0);
  const dailyArticleCost = n * m * artCost;          // Anthropic ₩/일
  const dailyImageCost = n * m * im * IMG_COST_KRW;  // Google ₩/일
  const antBalKrw = (Number(antBal) || 0) * FX;
  const gemBalKrw = Number(gemBal) || 0;
  const antDays = dailyArticleCost > 0 ? Math.floor(antBalKrw / dailyArticleCost) : null;
  const gemDays = dailyImageCost > 0 ? Math.floor(gemBalKrw / dailyImageCost) : null;

  const inputCls = "w-full min-w-0 rounded-xl bg-neutral-100 px-3 py-2 text-[13px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30";
  const DayBadge = ({ days }: { days: number | null }) =>
    days === null ? <span className="text-[11px] text-neutral-300">잔액 입력</span> :
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${days < 7 ? "bg-red-50 text-red-600" : days < 14 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{days}일 분량</span>;

  return (
    <div className="rounded-2xl at-glass p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-bold text-neutral-800">선불 연료 플래너</p>
        <p className="text-[11px] text-neutral-300">실측: 최근 7일 일평균 {avgDaily}편 · 글 1편 ≈ {Math.round(artCost)}원</p>
      </div>

      {/* 가정 입력 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="block"><span className="mb-1 block text-[11px] text-neutral-400">유저 수</span><input value={users} onChange={(e) => save("adm_users", e.target.value, setUsers)} inputMode="numeric" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-[11px] text-neutral-400">인당 하루 글</span><input value={perDay} onChange={(e) => save("adm_perday", e.target.value, setPerDay)} inputMode="decimal" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-[11px] text-neutral-400">글당 이미지</span><input value={imgs} onChange={(e) => save("adm_imgs", e.target.value, setImgs)} inputMode="decimal" className={inputCls} /></label>
      </div>

      {/* Anthropic */}
      <div className="mt-4 rounded-xl bg-neutral-50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-bold text-neutral-700">Anthropic — 글 생성</p>
          <DayBadge days={antDays} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input value={antBal} onChange={(e) => save("adm_ant_usd", e.target.value, setAntBal)} placeholder="현재 잔액 ($)" inputMode="decimal" className={`${inputCls} w-32`} />
          <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-neutral-500">
            일 {won(dailyArticleCost)} 소모 · 30일 = <b className="text-neutral-700">{won(dailyArticleCost * 30)}</b> (${Math.ceil((dailyArticleCost * 30) / FX)})
          </p>
        </div>
      </div>

      {/* Google */}
      <div className="mt-2 rounded-xl bg-neutral-50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-bold text-neutral-700">Google — 이미지 생성</p>
          <DayBadge days={gemDays} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input value={gemBal} onChange={(e) => save("adm_gem_krw", e.target.value, setGemBal)} placeholder="현재 잔액 (₩)" inputMode="numeric" className={`${inputCls} w-32`} />
          <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-neutral-500">
            일 {won(dailyImageCost)} 소모 · 30일 = <b className="text-neutral-700">{won(dailyImageCost * 30)}</b>
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">잔액은 각 콘솔에서 확인해 직접 입력(자동 조회 API 없음) · 14일 미만 노랑, 7일 미만 빨강 — 빨강 전에 충전.</p>
    </div>
  );
}

// 도구 — 크레딧 지급 + 내 계정 테스트 리셋
function Tools() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function grant() {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credits: Number(amount) }),
      });
      const data = await res.json();
      setMsg(res.ok ? `✅ ${data.email}에게 ${data.granted}크레딧 지급 (잔액 ${data.balance})` : `❌ ${data.error}`);
      if (res.ok) { setEmail(""); setAmount(""); }
    } catch { setMsg("❌ 네트워크 오류"); }
    finally { setBusy(false); }
  }

  async function resetMine() {
    if (busy || !confirm("내 계정의 글·온보딩을 전부 지우고 처음 상태로 되돌릴까요? (크레딧은 보존)")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/reset-test");
      const data = await res.json();
      setMsg(res.ok ? `✅ 리셋 완료 — 글 ${data.deleted.articles}건, 프로필 ${data.deleted.blog_profiles}건 삭제 (크레딧 ${data.credits_preserved} 보존). 새로고침하세요.` : `❌ ${data.error}`);
    } catch { setMsg("❌ 네트워크 오류"); }
    finally { setBusy(false); }
  }

  const inputCls = "min-w-0 rounded-xl bg-neutral-100 px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-[#1D75F7]/30";

  return (
    <div className="rounded-2xl at-glass p-5">
      <p className="text-[13px] font-bold text-neutral-800">크레딧 지급</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" className={`${inputCls} flex-1`} />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="크레딧 (음수=회수)" inputMode="numeric" className={`${inputCls} w-36`} />
        <button onClick={grant} disabled={busy || !email || !amount} className="at-press rounded-xl bg-[#1D75F7] px-4 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-40">지급</button>
      </div>
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <p className="text-[13px] font-bold text-neutral-800">테스트 도구</p>
        <button onClick={resetMine} disabled={busy} className="at-press mt-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-40">
          내 계정 초기화 (글·온보딩 삭제, 크레딧 보존)
        </button>
      </div>
      {msg && <p className="mt-3 text-[12.5px] font-medium text-neutral-600">{msg}</p>}
    </div>
  );
}

export default function AdminDashboard({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <p className="mt-8 text-sm text-neutral-400">통계를 불러오지 못했어요.</p>;
  const ce = stats.creditEconomy;
  const costKrw = stats.costTotalKrw ?? stats.estCostKrw ?? 0;
  const margin = ce && ce.revenueKrw > 0 ? Math.round(((ce.revenueKrw - costKrw) / ce.revenueKrw) * 100) : null;

  return (
    <div className="pb-16">
      {/* ★긴급 경보 — Google 이미지 잔액 소진 신호 */}
      {stats.images && stats.images.quotaFails24h > 0 && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
          <p className="text-[14px] font-bold text-red-700">🚨 이미지 생성 실패 {stats.images.quotaFails24h}건 (24시간, 쿼터/잔액)</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-red-600">Google Gemini 선불 잔액이 소진됐을 가능성이 커요. 유저 크레딧은 자동 환불되지만 기능이 꺼진 상태 — <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">지금 충전하세요</a>.</p>
        </div>
      )}

      {/* 오늘 */}
      <Section title="오늘" hint="KST 자정 기준">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="신규 가입" value={`${stats.usersToday ?? 0}명`} accent={Boolean(stats.usersToday)} />
          <Stat label="글 생성" value={`${stats.articlesToday ?? 0}편`} />
          <Stat label="오늘 AI 비용" value={won(stats.costTodayKrw ?? 0)} sub={stats.images ? `이미지 ${stats.images.today}장${stats.images.fails24h ? ` · 실패 ${stats.images.fails24h}` : ""}` : undefined} />
          <Stat label="전체 가입" value={`${stats.usersTotal ?? 0}명`} sub={`글 ${stats.articlesTotal ?? 0}편 · 발행 ${stats.publishedArticles ?? 0}편`} />
        </div>
      </Section>

      {/* 크레딧 경제 */}
      {ce && (
        <Section title="크레딧 경제" hint="판매액은 정가 기준(할인 미반영)">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="판매액" value={won(ce.revenueKrw)} sub={`${ce.purchaseCount}건 · ${ce.buyers}명`} accent />
            <Stat label="AI 비용 누적" value={won(costKrw)} sub={margin !== null ? `마진 ~${margin}%` : "결제 전"} />
            <Stat label="소모 크레딧" value={ce.creditsSpent.toLocaleString("ko-KR")} sub={`글 약 ${Math.floor(ce.creditsSpent / 10)}편분`} />
            <Stat label="유저 보유 잔액" value={ce.balanceOutstanding.toLocaleString("ko-KR")} sub="아직 제공 안 한 서비스(부채)" />
          </div>
          {ce.byPack.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ce.byPack.map((p) => (
                <span key={p.key} className="rounded-full at-glass px-3 py-1.5 text-[12px] font-bold text-neutral-600">
                  {PACK_LABEL[p.key] ?? p.key} <b className="text-[#1D75F7]">{p.count}</b>
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 여정 퍼널 */}
      <Section title="여정 퍼널" hint="단계별 통과율">
        <Funnel stats={stats} />
      </Section>

      {/* 7일 추이 */}
      <Section title="최근 7일">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <MiniBars title="가입" data={stats.dailyUsers} color={BRAND} />
          <MiniBars title="글 생성" data={stats.dailyArticles} color="#34c98e" />
        </div>
      </Section>

      {/* 선불 연료 */}
      <Section title="선불 연료" hint="Anthropic·Google 충전 계획">
        <FuelPlanner stats={stats} />
      </Section>

      {/* 도구 */}
      <Section title="도구">
        <Tools />
      </Section>

      {/* 최근 가입 / 글 */}
      <Section title="최근 가입">
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl at-glass">
          {stats.recentUsers.slice(0, 10).map((u) => (
            <div key={u.email + u.created_at} className="flex items-center justify-between px-4 py-2.5">
              <span className="min-w-0 truncate text-[13px] font-medium text-neutral-700">{u.email}</span>
              <span className="shrink-0 text-[11.5px] text-neutral-400">{fmtDate(u.created_at)}</span>
            </div>
          ))}
          {stats.recentUsers.length === 0 && <p className="px-4 py-4 text-[12.5px] text-neutral-400">아직 없음</p>}
        </div>
      </Section>

      <Section title="최근 글">
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl at-glass">
          {stats.recentArticles.slice(0, 10).map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.status === "published" ? "bg-emerald-500" : "bg-neutral-300"}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-700">{a.title}</span>
              <span className="shrink-0 text-[11.5px] text-neutral-400">{fmtDate(a.created_at)}</span>
            </div>
          ))}
          {stats.recentArticles.length === 0 && <p className="px-4 py-4 text-[12.5px] text-neutral-400">아직 없음</p>}
        </div>
      </Section>
    </div>
  );
}
