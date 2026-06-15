"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "@/components/CountUp";
import TrendChart from "./lab/TrendChart";
import type { Article } from "./types";
import type { QueueItem } from "@/lib/keywordQueue";
import type { BlogProfile } from "@/lib/blogProfile";
import type { TrendPoint, TrendItem } from "@/lib/naverDatalab";
import { upcomingEvents } from "@/lib/seasonalEvents";

const BRAND = "#3f91ff";

interface SpotKeyword { keyword: string; mobile: number; compIdx: string; estimated?: boolean; rising?: boolean }
interface Insights { keywords: SpotKeyword[]; trend: { series: TrendPoint[]; items: TrendItem[] } | null; asOf: string | null }

// "2026-06" → "2026년 6월 기준"
function asOfText(asOf: string | null): string {
  if (!asOf) return "";
  const [y, m] = asOf.split("-");
  return m ? `${y}년 ${Number(m)}월 기준` : "";
}

function thisMonthCount(articles: Article[]): number {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  return articles.filter((a) => {
    if (a.status !== "published") return false;
    const d = new Date(a.publish_at ?? a.created_at);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}
function nextPublishLabel(queue: QueueItem[]): string {
  const dates = queue.filter((q) => q.status !== "done" && q.scheduled_for).map((q) => q.scheduled_for as string).sort();
  if (dates.length === 0) return "—";
  const target = new Date(dates[0] + "T00:00:00"); const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "오늘"; if (diff === 1) return "내일";
  const [, mm, dd] = dates[0].split("-"); return `${Number(mm)}/${Number(dd)}`;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

function Stat({ label, value, unit, accent, raw }: { label: string; value?: number; unit?: string; accent?: boolean; raw?: string }) {
  return (
    <motion.div variants={item} className="ateflo-surface rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      {raw !== undefined ? (
        <p className="mt-1.5 text-3xl font-bold tracking-tight text-neutral-900">{raw}</p>
      ) : (
        <p className="mt-1.5 flex items-baseline gap-1">
          <CountUp to={value ?? 0} className={`text-3xl font-bold tracking-tight ${accent ? "text-[#3f91ff]" : "text-neutral-900"}`} />
          <span className="text-sm font-medium text-neutral-400">{unit}</span>
        </p>
      )}
    </motion.div>
  );
}

const TOOL_ICONS = {
  keywords: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  queue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  articles: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></svg>,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 mt-8 px-1 text-sm font-semibold text-neutral-700">{children}</p>;
}

export default function ResearchLab({
  profile, displayName, articles, queue, onNavigate, onQueueKeyword,
}: {
  profile: BlogProfile;
  displayName: string;
  articles: Article[];
  queue: QueueItem[];
  onNavigate: (tab: "keywords" | "queue" | "articles") => void;
  onQueueKeyword: (keyword: string) => void;
}) {
  const published = thisMonthCount(articles);
  const queued = queue.filter((q) => q.status !== "done").length;
  const articleCount = articles.filter((a) => a.status !== "generating").length;

  const category = profile.category ?? profile.topic;
  const sub = profile.topic && profile.topic !== category ? profile.topic : null;
  const blogName = profile.blog_name || `${category} 블로그`;
  const events = upcomingEvents(category);

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const subParam = sub ?? "전체";
    fetch(`/api/lab/insights?category=${encodeURIComponent(category)}&sub=${encodeURIComponent(subParam)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setInsights({ keywords: Array.isArray(d.keywords) ? d.keywords : [], trend: d.trend ?? null, asOf: d.asOf ?? null }); })
      .catch(() => { if (alive) setInsights({ keywords: [], trend: null, asOf: null }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, sub]);

  const keywords = insights?.keywords ?? [];
  const trend = insights?.trend ?? null;
  const asOf = asOfText(insights?.asOf ?? null);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:pt-12">
      {/* 헤더 */}
      <motion.div variants={item}>
        <p className="text-sm text-neutral-400">{displayName}님의 연구소 🔬</p>
        <h1 className="font-pretendard mt-1 text-[1.7rem] font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">{blogName}</h1>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          <span>{category}</span>
          {sub && <><span className="text-neutral-300">›</span><span className="text-[#2f7fe6]">{sub}</span></>}
        </div>
      </motion.div>

      {/* 현황 3카드 */}
      <div className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-3">
        <Stat label="이번 달 발행" value={published} unit="편" accent />
        <Stat label="대기 키워드" value={queued} unit="개" />
        <Stat label="다음 발행" raw={nextPublishLabel(queue)} />
      </div>

      {/* 오늘의 액션 */}
      <motion.div variants={item} className="mt-4">
        {queued === 0 ? (
          <button onClick={() => onNavigate("keywords")} className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]" style={{ backgroundColor: BRAND }}>🔍 황금 키워드 찾으러 가기</button>
        ) : (
          <button onClick={() => onNavigate("queue")} className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]" style={{ backgroundColor: BRAND }}>✍️ 오늘 글 발행하러 가기 ({queued}개 대기)</button>
        )}
      </motion.div>

      {/* 🔥 지금 주목할 키워드 */}
      <SectionTitle>🔥 지금 주목할 키워드 <span className="font-normal text-neutral-400">· {sub ?? category}{asOf ? ` · ${asOf}` : ""}</span></SectionTitle>
      {loading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      ) : keywords.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {keywords.map((k) => (
            <motion.button key={k.keyword} variants={item} whileTap={{ scale: 0.97 }} onClick={() => onQueueKeyword(k.keyword)}
              className="ateflo-surface flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 text-left transition hover:border-[#3f91ff]/40">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-neutral-900">
                  {k.keyword}{k.rising && <span title="검색 급상승">🔥</span>}
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">월 {k.estimated ? "~" : ""}{k.mobile.toLocaleString("ko-KR")}회 (모바일) · 경쟁 {k.compIdx}</p>
              </div>
              <span className="shrink-0 rounded-lg bg-[#3f91ff]/10 px-2.5 py-1 text-[11px] font-bold text-[#2f7fe6]">글감으로 →</span>
            </motion.button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-neutral-100 bg-white p-4 text-sm text-neutral-400">키워드를 불러오는 중이거나 준비 중이에요.</p>
      )}

      {/* 📈 트렌드 추이 */}
      <SectionTitle>📈 트렌드 추이 <span className="font-normal text-neutral-400">· 최근 12개월{asOf ? ` · ${asOf}` : ""}</span></SectionTitle>
      {loading ? (
        <div className="h-44 animate-pulse rounded-2xl bg-neutral-100" />
      ) : trend && trend.series.length > 0 ? (
        <motion.div variants={item} className="ateflo-surface rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5">
          <TrendChart series={trend.series} items={trend.items} />
        </motion.div>
      ) : (
        <p className="rounded-2xl border border-neutral-100 bg-white p-4 text-sm text-neutral-400">트렌드 데이터 준비 중이에요.</p>
      )}

      {/* 📅 시즌·이벤트 */}
      {events.length > 0 && (
        <>
          <SectionTitle>📅 다가오는 시즌 <span className="font-normal text-neutral-400">· 지금 쓰면 선점</span></SectionTitle>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {events.map((e) => (
              <motion.div key={e.name} variants={item} className="ateflo-surface flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
                <span className="text-2xl">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    {e.name}
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">D-{e.dday}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">{e.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* 연구소 도구 */}
      <SectionTitle>🧰 연구소 도구</SectionTitle>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {([
          { k: "keywords", t: "키워드 발굴", d: "황금 키워드 찾기", b: undefined as string | undefined },
          { k: "queue", t: "발행 계획", d: "예약 큐 · 캘린더", b: queued ? `${queued}` : undefined },
          { k: "articles", t: "내 글", d: "발행된 글 보기", b: articleCount ? `${articleCount}` : undefined },
        ] as const).map((s) => (
          <motion.button key={s.k} variants={item} whileTap={{ scale: 0.975 }} onClick={() => onNavigate(s.k)}
            className="ateflo-surface flex w-full items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 text-left transition hover:border-[#3f91ff]/40 sm:flex-col sm:items-start sm:gap-3 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3f91ff]/10 text-[#2f7fe6]">{TOOL_ICONS[s.k]}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><span className="text-sm font-semibold text-neutral-900">{s.t}</span>
                {s.b && <span className="rounded-full bg-[#3f91ff]/10 px-2 py-0.5 text-[11px] font-bold text-[#2f7fe6]">{s.b}</span>}</span>
              <span className="mt-0.5 block text-xs text-neutral-400">{s.d}</span>
            </span>
            <span className="shrink-0 text-neutral-300 sm:hidden"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
