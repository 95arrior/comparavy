"use client";

import { motion } from "framer-motion";
import CountUp from "@/components/CountUp";
import type { Article } from "./types";
import type { QueueItem } from "@/lib/keywordQueue";
import type { BlogProfile } from "@/lib/blogProfile";

const BRAND = "#3f91ff";

// 한 달 경계
function thisMonthCount(articles: Article[]): number {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  return articles.filter((a) => {
    if (a.status !== "published") return false;
    const d = new Date(a.publish_at ?? a.created_at);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

function nextPublishLabel(queue: QueueItem[]): string {
  const dates = queue
    .filter((q) => q.status !== "done" && q.scheduled_for)
    .map((q) => q.scheduled_for as string)
    .sort();
  if (dates.length === 0) return "—";
  const [, mm, dd] = dates[0].split("-");
  const target = new Date(dates[0] + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "내일";
  return `${Number(mm)}/${Number(dd)}`;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

function Stat({ label, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <motion.div variants={item} className="ateflo-surface rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <CountUp to={value} className={`text-3xl font-bold tracking-tight ${accent ? "text-[#3f91ff]" : "text-neutral-900"}`} />
        <span className="text-sm font-medium text-neutral-400">{unit}</span>
      </p>
    </motion.div>
  );
}

function SectionCard({
  icon, title, desc, badge, onClick,
}: { icon: React.ReactNode; title: string; desc: string; badge?: string; onClick: () => void }) {
  return (
    <motion.button
      variants={item}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      className="ateflo-surface flex w-full items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 text-left transition hover:border-[#3f91ff]/40 sm:flex-col sm:items-start sm:gap-3 sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3f91ff]/10 text-[#2f7fe6]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{title}</span>
          {badge && <span className="rounded-full bg-[#3f91ff]/10 px-2 py-0.5 text-[11px] font-bold text-[#2f7fe6]">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-400">{desc}</span>
      </span>
      <span className="shrink-0 text-neutral-300 sm:hidden">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </span>
    </motion.button>
  );
}

const ICONS = {
  keywords: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  queue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  articles: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></svg>,
};

/**
 * 연구소 홈 — "○○님의 [블로그이름] 연구소". 현황 한눈에 + 기존 기능(키워드/발행계획/내 글) 연결.
 * 모바일 퍼스트(단일 컬럼 → sm 그리드), framer-motion stagger/tap으로 살아있는 느낌.
 */
export default function ResearchLab({
  profile,
  displayName,
  articles,
  queue,
  onNavigate,
}: {
  profile: BlogProfile;
  displayName: string;
  articles: Article[];
  queue: QueueItem[];
  onNavigate: (tab: "keywords" | "queue" | "articles") => void;
}) {
  const published = thisMonthCount(articles);
  const queued = queue.filter((q) => q.status !== "done").length;
  const articleCount = articles.filter((a) => a.status !== "generating").length;
  const nextLabel = nextPublishLabel(queue);

  const category = profile.category ?? profile.topic;
  const sub = profile.topic && profile.topic !== category ? profile.topic : null;
  const blogName = profile.blog_name || `${category} 블로그`;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:pt-12"
    >
      {/* 헤더 — 소유감 */}
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
        <motion.div variants={item} className="ateflo-surface rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5">
          <p className="text-xs font-medium text-neutral-400">다음 발행</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-neutral-900">{nextLabel}</p>
        </motion.div>
      </div>

      {/* 오늘의 액션 */}
      <motion.div variants={item} className="mt-4">
        {queued === 0 ? (
          <button onClick={() => onNavigate("keywords")} className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]" style={{ backgroundColor: BRAND }}>
            🔍 황금 키워드 찾으러 가기
          </button>
        ) : (
          <button onClick={() => onNavigate("queue")} className="w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]" style={{ backgroundColor: BRAND }}>
            ✍️ 오늘 글 발행하러 가기 ({queued}개 대기)
          </button>
        )}
      </motion.div>

      {/* 빠른 이동 — 기존 기능 연결 */}
      <p className="mb-3 mt-8 px-1 text-xs font-semibold text-neutral-400">연구소 도구</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <SectionCard icon={ICONS.keywords} title="키워드 발굴" desc="황금 키워드 찾기" onClick={() => onNavigate("keywords")} />
        <SectionCard icon={ICONS.queue} title="발행 계획" desc="예약 큐 · 캘린더" badge={queued ? `${queued}` : undefined} onClick={() => onNavigate("queue")} />
        <SectionCard icon={ICONS.articles} title="내 글" desc="발행된 글 보기" badge={articleCount ? `${articleCount}` : undefined} onClick={() => onNavigate("articles")} />
      </div>
    </motion.div>
  );
}
