"use client";

import { useMemo } from "react";
import type { Article } from "./types";
import type { BloggerType } from "@/lib/bloggerTypes";
import SearchPerformance from "./SearchPerformance";

// 성과 페이지 — 유형(online/local/hobby)별로 적응. 초반 이탈 방어:
//  '결과(트래픽 0)' 대신 '자산(글수·글자수·연속발행)'을 크게 + 단계별 '길'(수익화/손님) + 기대치 관리.

const COUPANG = "https://partners.coupang.com/";
const ADSENSE = "https://www.google.com/adsense/start/";
const TENPING = "https://www.tenping.kr/";
const NAVER_PLACE = "https://smartplace.naver.com/";

type PathStatus = "now" | "progress" | "locked" | "done";
interface Path {
  label: string;
  desc: string;
  status: PathStatus;
  note: string; // progress/locked일 때 우측 안내(예: '발행 5/20편')
  url?: string;
  onClick?: () => void;
}

// 같은 활동 주(week) 키 — 연속 발행 streak 계산용
function weekKey(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 4) / 7);
}
function computeWeekStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const weeks = new Set(dates.map((d) => weekKey(d)));
  const now = weekKey(new Date());
  let w: number | null = weeks.has(now) ? now : weeks.has(now - 1) ? now - 1 : null;
  if (w === null) return 0;
  let streak = 0;
  while (weeks.has(w)) { streak++; w--; }
  return streak;
}

function buildPaths(type: BloggerType, pub: number, wpConnected: boolean, onWrite: () => void, onRegion: () => void): { title: string; paths: Path[] } {
  if (type === "local") {
    return {
      title: "손님이 오는 길",
      paths: [
        { label: "동네 검색에 뜨기", desc: "동네 손님이 검색에서 우리 가게를 발견해요", status: pub >= 5 ? "done" : "progress", note: pub >= 5 ? "" : `발행 ${pub}/5편`, onClick: pub >= 5 ? undefined : onWrite },
        { label: "지역 키워드 선점", desc: "‘우리동네 OO’ 검색 상위를 노려요", status: "now", note: "", onClick: onRegion },
        { label: "단골 만들기", desc: "가게 이름 검색·재방문 손님이 늘어요", status: pub >= 15 ? "done" : "locked", note: pub >= 15 ? "" : "글 더 쌓이면" },
        { label: "네이버 플레이스 연동", desc: "길찾기·전화·예약을 받아요 (선택)", status: "now", note: "", url: NAVER_PLACE },
      ],
    };
  }
  // online / hobby — 광고·제휴 수익화 (hobby는 '선택')
  return {
    title: type === "hobby" ? "수익화 (선택)" : "수익화 길",
    paths: [
      { label: "쿠팡파트너스", desc: "글에 제품 링크 → 전환 1건이면 첫 수익", status: wpConnected ? "now" : "progress", note: wpConnected ? "" : "블로그 먼저 연결", url: wpConnected ? COUPANG : undefined },
      { label: "구글 애드센스", desc: "글에 자동 광고로 안정적 수동수입", status: pub >= 20 ? "now" : "progress", note: pub >= 20 ? "" : `발행 ${pub}/20편`, url: pub >= 20 ? ADSENSE : undefined },
      { label: "제휴마케팅", desc: "텐핑·알리 등 다양한 제휴 수익", status: "now", note: "", url: TENPING },
      { label: "체험단·협찬", desc: "방문자가 쌓이면 브랜드 협찬을 받아요", status: "locked", note: "트래픽 쌓이면" },
    ],
  };
}

function Dot({ status }: { status: PathStatus }) {
  if (status === "now" || status === "done") return <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />;
  if (status === "progress") return <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1D75F7]" />;
  return <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-200" />;
}

function PathRow({ p, first }: { p: Path; first: boolean }) {
  const actionable = p.status === "now" && (p.url || p.onClick);
  return (
    <div className={`flex items-start gap-3 py-3.5 ${first ? "" : "border-t border-neutral-100"}`}>
      <Dot status={p.status} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-neutral-900">
          {p.label}
          {(p.status === "now" || p.status === "done") && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">{p.status === "done" ? "진행 중" : "지금 가능"}</span>
          )}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-400">{p.desc}</p>
      </div>
      <div className="shrink-0 self-center">
        {actionable ? (
          p.url ? (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15">시작</a>
          ) : (
            <button onClick={p.onClick} className="rounded-lg bg-[#1D75F7]/10 px-3 py-1.5 text-[12px] font-bold text-[#1D75F7] transition hover:bg-[#1D75F7]/15">바로가기</button>
          )
        ) : (
          p.note && <span className="text-[11px] font-medium text-neutral-300">{p.note}</span>
        )}
      </div>
    </div>
  );
}

function AssetHero({ written, chars, streak, pub, onWrite }: { written: number; chars: number; streak: number; pub: number; onWrite: () => void }) {
  // 글 0편 — '0편 0자'를 크게 보여주면 역효과 → 시작 유도로
  if (written === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#1D75F7] to-[#1565d8] p-5 text-white shadow-[0_12px_30px_-14px_rgba(29,117,247,0.6)]">
        <p className="text-[13px] font-semibold text-white/75">내 블로그 자산</p>
        <p className="mt-2 text-[19px] font-extrabold leading-snug tracking-tight">첫 글을 쓰면<br />자산이 쌓이기 시작해요</p>
        <button onClick={onWrite} className="mt-3.5 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-[#1D75F7] transition active:scale-95">첫 글 쓰러 가기</button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1D75F7] to-[#1565d8] p-5 text-white shadow-[0_12px_30px_-14px_rgba(29,117,247,0.6)]">
      <p className="text-[13px] font-semibold text-white/75">내 블로그 자산</p>
      <div className="mt-2.5 flex flex-wrap items-end gap-x-6 gap-y-1">
        <p className="text-[30px] font-extrabold leading-none tracking-tight">{written}<span className="ml-0.5 text-[15px] font-bold text-white/80">편</span></p>
        <p className="text-[30px] font-extrabold leading-none tracking-tight">{chars.toLocaleString("ko-KR")}<span className="ml-0.5 text-[15px] font-bold text-white/80">자</span></p>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {streak >= 2 && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold">🔥 {streak}주 연속</span>}
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium text-white/90">발행 {pub}편</span>
      </div>
    </div>
  );
}

function ExpectationCard({ pub }: { pub: number }) {
  const msg =
    pub === 0
      ? "씨앗을 뿌리는 시기예요. 첫 글부터 차근차근 시작해봐요."
      : pub < 8
        ? "블로그는 복리예요. 지금 쌓는 글이 검색 권위가 돼서, 보통 4~8주부터 노출이 늘어요."
        : "꾸준함이 검색 권위가 돼요. 계속 쌓을수록 더 빠르게 올라와요.";
  return (
    <div className="rounded-2xl bg-[#1D75F7]/[0.06] p-4">
      <p className="text-[13px] font-bold text-[#1D75F7]">💡 조급해하지 마세요</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{msg}</p>
    </div>
  );
}

export default function PerformanceView({
  articles,
  wpConnected,
  type,
  onWrite,
  onGoConnect,
  onRegion,
}: {
  articles: Article[];
  wpConnected: boolean;
  type: BloggerType;
  onWrite: () => void;
  onGoConnect: () => void;
  onRegion: () => void;
}) {
  const stats = useMemo(() => {
    const nonGen = articles.filter((a) => a.status !== "generating");
    const written = nonGen.length;
    const chars = nonGen.reduce((s, a) => s + (a.char_count ?? 0), 0);
    const pub = articles.filter((a) => a.status === "published").length;
    const streak = computeWeekStreak(nonGen.map((a) => new Date(a.created_at)));
    return { written, chars, pub, streak };
  }, [articles]);

  const { title, paths } = buildPaths(type, stats.pub, wpConnected, onWrite, onRegion);

  return (
    <div className="space-y-4">
      <AssetHero written={stats.written} chars={stats.chars} streak={stats.streak} pub={stats.pub} onWrite={onWrite} />

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
        <p className="text-[15px] font-bold text-neutral-900">{title}</p>
        <div className="mt-1">
          {paths.map((p, i) => <PathRow key={p.label} p={p} first={i === 0} />)}
        </div>
      </div>

      <SearchPerformance onGoConnect={onGoConnect} />

      <ExpectationCard pub={stats.pub} />
    </div>
  );
}
