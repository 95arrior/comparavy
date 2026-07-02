"use client";

import GlassIcon, { type GlassTint } from "@/components/GlassIcon";

import { useMemo, useState } from "react";
import type { Article } from "./types";

// 성과 페이지 — 네이버 수익형 단일. 초반 이탈 방어:
//  자산 히어로(결승선) + 단계별 '수익화 길' 리스트 → 행 탭하면 상세(기준·어떻게·꿀팁).
// ※ Phase 2에서 '애드포스트 승인 20일 코스'(매일 체크·방문자 입력)로 확장 예정.

const ADPOST = "https://adpost.naver.com/";
const COUPANG = "https://partners.coupang.com/";

type PathStatus = "now" | "progress" | "locked" | "done";
interface Path {
  label: string;
  desc: string;
  conditions: string;     // 기준(조건)
  how: string[];          // 어떻게(단계)
  tips?: string[];        // 꼭 알아두기(주의점·꿀팁)
  status: PathStatus;
  note: string;           // 행 우측 progress/locked 안내
  logo?: string;          // /logos/xxx.png (없으면 emoji)
  emoji?: string;
  cta?: { label: string; url?: string; onClick?: () => void };
}

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

// 네이버 수익화 길 — 빠른 순서(애드포스트 → 체험단 → 제휴 → 지원금)
function buildPaths(pub: number, onWrite: () => void): { title: string; paths: Path[] } {
  return {
    title: "수익화 길",
    paths: [
      { label: "네이버 애드포스트", desc: "글에 광고가 붙는 기본 수익", conditions: "만 19세 이상 + 네이버 심사 통과가 필요해요. 심사 기준(운영 기간·글·방문자)은 공식 공개가 아니라서, 통설 기준으로 매일 1편씩 15편 이상 + 일 방문 100명 안팎을 목표로 준비해요.", how: ["adpost.naver.com에 접속해 네이버 아이디로 로그인하고 회원가입해요(본인인증 필요).", "가입 후 [미디어 관리 → 미디어 등록]에서 내 블로그를 선택해 검수를 신청해요.", "검수는 최대 5영업일 — 결과가 네이버 메일로 와요. 그동안 평소처럼 글을 계속 써요.", "승인되면 글에 광고가 자동으로 붙어요. 반려돼도 사유 보완하고(글·방문자 더 쌓고) 언제든 다시 신청할 수 있어요."], tips: ["여기까지의 모든 준비(주제 일관·검색 허용·꾸준한 발행)는 우리 코스가 챙겨온 것들이에요 — 신청만 하면 돼요.", "승인 전에 쓴 글도 승인 후 전부 수익 대상이 돼요.", "반려는 실패가 아니라 흔한 과정이에요 — 재신청에 불이익 없어요."], status: pub >= 15 ? "now" : "progress", note: pub >= 15 ? "" : `발행 ${pub}/15편`, logo: "/logos/adpost.png", emoji: "📢", cta: pub >= 15 ? { label: "애드포스트 신청하러 가기", url: ADPOST } : { label: "글 쓰러 가기", onClick: onWrite } },
      { label: "체험단·기자단", desc: "지수 조금만 올라도 건당 현금·제품", conditions: "일 방문자가 어느 정도(수백 명) 나오면 선정되기 시작해요.", how: ["체험단 플랫폼(레뷰 등)에 내 블로그를 등록해요.", "내 주제와 맞는 캠페인에 신청해요(맛집·뷰티·생활용품 등).", "선정되면 제품·서비스를 받고 정해진 기한 안에 솔직한 후기를 써요.", "실적이 쌓이면 더 좋은 캠페인·원고료 제안이 들어와요."], tips: ["‘협찬·제공받았다’는 사실을 글에 꼭 표기해요(공정위 규정 — 미표기 시 과태료 위험).", "주제와 동떨어진 체험단을 도배하면 블로그 지수에 해로워요.", "솔직하지 않은 과장 후기는 신뢰·노출에 오히려 독이 돼요."], status: pub >= 10 ? "now" : "progress", note: pub >= 10 ? "" : `발행 ${pub}/10편`, emoji: "🎁" },
      { label: "쿠팡파트너스·제휴", desc: "상품 추천 링크로 수수료", conditions: "블로그만 있으면 가입 가능 · 첫 3개월 내 실적 1건 권장.", how: ["partners.coupang.com에서 가입해요.", "글 주제에 맞는 상품을 검색해 ‘링크 생성’으로 내 추천 링크를 만들어요.", "글에서 상품을 추천·비교하는 자연스러운 자리에만 링크를 넣어요.", "방문자가 링크로 들어가 24시간 안에 구매하면 수수료가 들어와요."], tips: ["‘쿠팡 파트너스 활동의 일환으로 일정 수수료를 받습니다’ 문구를 꼭 넣어요(필수).", "★네이버는 외부 상업 링크에 민감해요 — 글마다 도배하면 노출이 떨어질 수 있으니 꼭 필요한 글에만 최소로.", "가전·뷰티처럼 단가 높은 카테고리가 수익에 유리해요."], status: "now", note: "", logo: "/logos/coupang.png", emoji: "🛒", cta: { label: "쿠팡파트너스 가입", url: COUPANG } },
      { label: "네이버 메이트", desc: "AI 브리핑 인용으로 월 지원금", conditions: "네이버 공식 프로그램(베타 2026.06~12) — 신청 없이 'AI 브리핑 인용수' 중심으로 매월 자동 선정돼요. 선정 시 월 30만원 + 엠블럼, 스페셜은 월 100명 300만원·10명 1천만원.", how: ["한 주제로 경험이 담긴 글을 꾸준히 발행해요(주제 전문성·일관성·활동성이 공식 기준).", "각 소제목에 답을 먼저 주는 완결형 글이 AI 브리핑에 인용돼요 — 우리 엔진이 자동으로 해줘요.", "메이트 스튜디오(mate.naver.com/my)에서 내 AI 브리핑 인용수를 확인해요.", "선정되면 네이버 메일·앱 알림으로 안내가 와요."], tips: ["네이버 공식: 'AI 도구 사용 자체는 패널티가 아니에요 — 최종 검토와 본인 경험을 녹이는 게 중요해요.'", "복제 글·기계적 AI 생성 글 무분별 발행·과도한 광고는 공식 감점 사유예요.", "베타 프로그램이라 기준·지원금은 바뀔 수 있어요 — 공식 페이지(mate.naver.com) 기준."], status: pub >= 20 ? "now" : "locked", note: pub >= 20 ? "" : "글 쌓이면", emoji: "🏅", cta: { label: "내 인용수 보러 가기", url: "https://mate.naver.com/my" } },
    ],
  };
}

// 이모지 → 글래스 타일 매핑(수익화 길 4종)
const GLASS_OF: Record<string, { name: string; tint: GlassTint }> = {
  "📢": { name: "adpost", tint: "blue" },
  "🎁": { name: "gift", tint: "rose" },
  "🛒": { name: "cart", tint: "orange" },
  "🏅": { name: "medal", tint: "amber" },
};
function LogoSlot({ emoji }: { logo?: string; emoji?: string; size?: string }) {
  const g = emoji ? GLASS_OF[emoji] : undefined;
  if (g) return <GlassIcon name={g.name} tint={g.tint} size={38} />;
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
      {emoji && <span className="text-[17px]">{emoji}</span>}
    </span>
  );
}

function StatusChip({ status }: { status: PathStatus }) {
  if (status === "now") return <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">지금 가능</span>;
  if (status === "done") return <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">진행 중</span>;
  return null;
}

function PathRow({ p, first, onOpen }: { p: Path; first: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={`at-press flex w-full items-center gap-3 py-3 text-left transition ${first ? "" : "border-t border-neutral-100"}`}>
      <LogoSlot logo={p.logo} emoji={p.emoji} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold text-neutral-900">{p.label}</span>
          <StatusChip status={p.status} />
        </p>
        <p className="mt-0.5 truncate text-[12px] text-neutral-400">{p.desc}</p>
      </div>
      {p.status === "progress" || p.status === "locked" ? (
        <span className="shrink-0 text-[11px] font-medium text-neutral-300">{p.note}</span>
      ) : null}
      <svg className="shrink-0 text-neutral-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}

function PathDetail({ p, onBack }: { p: Path; onBack: () => void }) {
  return (
    <div className="ateflo-page-in rounded-2xl at-glass p-5 ">
      <button onClick={onBack} className="-ml-1 flex items-center gap-1 text-[13px] font-medium text-neutral-400 transition hover:text-neutral-700">
        <span className="text-base leading-none">←</span> 돌아가기
      </button>
      <div className="mt-3 flex items-center gap-3">
        <LogoSlot logo={p.logo} emoji={p.emoji} size="h-11 w-11" />
        <div>
          <p className="flex items-center gap-1.5 text-[17px] font-bold text-neutral-900">{p.label} <StatusChip status={p.status} /></p>
          <p className="text-[12.5px] text-neutral-400">{p.desc}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12px] font-bold text-neutral-400">기준</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-700">{p.conditions}</p>
      </div>

      <div className="mt-4">
        <p className="text-[12px] font-bold text-neutral-400">어떻게 하나요</p>
        <ul className="mt-1.5 space-y-2">
          {p.how.map((h, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-neutral-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1D75F7]/10 text-[11px] font-bold text-[#1D75F7]">{i + 1}</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {p.tips && p.tips.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          <p className="text-[12.5px] font-bold text-amber-700">꼭 알아두기</p>
          <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-amber-900/80">
            {p.tips.map((t, i) => (
              <li key={i}>· {t}</li>
            ))}
          </ul>
        </div>
      )}

      {p.cta && (
        <div className="mt-5">
          {p.cta.url ? (
            <a href={p.cta.url} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl bg-[#1D75F7] py-3 text-center text-[14px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">{p.cta.label}</a>
          ) : (
            <button onClick={p.cta.onClick} className="w-full rounded-xl bg-[#1D75F7] py-3 text-[14px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">{p.cta.label}</button>
          )}
        </div>
      )}
    </div>
  );
}

// 히어로 v2 — 말 대신 숫자. 발행 수(주 지표) + 다음 목표까지 진행 바.
// 네이버는 방문자 API가 없어 '발행·꾸준함'이 우리가 보여줄 수 있는 가장 정직한 지표다.
function AssetHero({ written, streak, pub, onWrite }: {
  written: number; streak: number; pub: number; onWrite: () => void;
}) {
  if (written === 0) {
    return (
      <div className="rounded-2xl at-glass p-6 text-center">
        <p className="text-[16px] font-extrabold tracking-tight text-neutral-900">첫 글을 쓰면 여기에 성과가 쌓여요</p>
        <p className="mt-1 text-[13px] text-neutral-400">발행 수·꾸준함·수익화 진행을 한눈에</p>
        <button onClick={onWrite} className="at-press mt-4 rounded-xl bg-[#1D75F7] px-5 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90">첫 글 쓰러 가기</button>
      </div>
    );
  }
  const GOAL = 15; // 애드포스트 신청 목표선
  const ratio = Math.min(1, pub / GOAL);
  const remain = Math.max(0, GOAL - pub);
  return (
    <div className="rounded-2xl at-glass p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12.5px] font-semibold text-neutral-400">발행한 글</p>
          <p className="mt-1 leading-none tracking-tight text-neutral-900">
            <span className="text-[42px] font-extrabold">{pub}</span>
            <span className="ml-1 text-[17px] font-bold text-neutral-400">편</span>
          </p>
        </div>
        <div className="text-right">
          {streak >= 2 && <p className="text-[12.5px] font-bold text-orange-500">{streak}주 연속 발행</p>}
          <p className="mt-0.5 text-[12px] text-neutral-400">작성 {written}편</p>
        </div>
      </div>
      {/* 다음 목표 진행 바 */}
      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200/60">
          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: "linear-gradient(90deg, #1D75F7, #38cdf8)", transition: "width 0.9s var(--at-ease)" }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-neutral-600">
            {remain === 0 ? "애드포스트를 신청할 수 있어요" : `애드포스트 신청까지 ${remain}편`}
          </p>
          <p className="text-[11.5px] text-neutral-400">{pub}/{GOAL}</p>
        </div>
      </div>
    </div>
  );
}

function ExpectationCard({ pub }: { pub: number }) {
  const msg =
    pub === 0
      ? "씨앗을 뿌리는 시기예요. 첫 글부터 차근차근 시작해봐요."
      : pub < 8
        ? "블로그는 복리예요. 지금 쌓는 글이 블로그 지수가 돼서, 보통 4~8주부터 노출이 늘어요."
        : "꾸준함이 블로그 지수가 돼요. 계속 쌓을수록 더 빠르게 올라와요.";
  return (
    <div className="rounded-2xl bg-[#1D75F7]/[0.06] p-4">
      <p className="text-[13px] font-bold text-[#1D75F7]">💡 조급해하지 마세요</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{msg}</p>
    </div>
  );
}

export default function PerformanceView({
  articles,
  onWrite,
}: {
  articles: Article[];
  onWrite: () => void;
}) {
  const stats = useMemo(() => {
    const nonGen = articles.filter((a) => a.status !== "generating");
    const written = nonGen.length;
    const pub = articles.filter((a) => a.status === "published").length;
    const streak = computeWeekStreak(nonGen.map((a) => new Date(a.created_at)));
    return { written, pub, streak };
  }, [articles]);

  const { title, paths } = buildPaths(stats.pub, onWrite);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx !== null ? paths[openIdx] : null;

  return (
    <div className="space-y-4">
      <div className=""><AssetHero written={stats.written} streak={stats.streak} pub={stats.pub} onWrite={onWrite} /></div>

      {open ? (
        <PathDetail p={open} onBack={() => setOpenIdx(null)} />
      ) : (
        <div className="rounded-2xl at-glass p-5 ">
          <p className="text-[15px] font-bold text-neutral-900">{title}</p>
          <div className="mt-1">
            {paths.map((p, i) => <PathRow key={p.label} p={p} first={i === 0} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </div>
      )}

      <div className=""><ExpectationCard pub={stats.pub} /></div>
    </div>
  );
}
