"use client";

import GlassIcon, { type GlassTint } from "@/components/GlassIcon";

import { useEffect, useMemo, useState } from "react";
import RevenueDash from "./RevenueDash";
import ApprovalInput from "./ApprovalInput";
import { isVerifiedStatus } from "@/lib/course";
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

// ★수익화 사다리 — 애드포스트 → 쇼핑커넥트 → 체험단 → 인플루언서/브랜드커넥트.
//  숫자(수수료·조건)는 확인 시점 표기 + 변동 문구. 수익 보장류 금지("열렸어요"=기회 개방, 수익 약속 아님).
//  잠금해제 게이트: adpost(발행15), 쇼핑(adpost 달성=발행15), 체험단(발행30), 인플루언서(장기).
const ASOF = "2026년 7월 기준이며 네이버 정책에 따라 달라질 수 있어요.";
function buildPaths(pub: number, onWrite: () => void, approved = false): { title: string; paths: Path[]; otherChannels: Path[] } {
  const adpostDone = approved || pub >= 15; // 승인 입력이 진짜 열쇠, 발행 15편은 신청 가능 게이트
  return {
    title: "수익화 사다리",
    paths: [
      approved ? { label: "네이버 애드포스트", desc: "승인 완료 · 초기 설정 가이드", conditions: `승인을 축하해요. 이제 광고 설정만 하면 수익이 쌓이기 시작해요. 아래 값은 2026년 7월 기준이며 네이버 정책에 따라 달라질 수 있어요.`, how: ["adpost.naver.com [미디어 관리]에서 내 블로그를 선택해요.", "광고 게재 위치: 본문 하단은 기본으로 켜고, 본문 중간 광고도 켜는 걸 권해요(수익 기회가 늘어요 — 효과 수치는 계정마다 달라요).", "게재율은 기본값으로 시작해요. 며칠 수익을 보고 조절해도 늦지 않아요.", "설정 후 첫 반영까지 시간이 걸릴 수 있어요 — 다음 날 글에서 광고가 보이는지 확인해요."], tips: ["설정 효과는 블로그마다 달라요 — 확인되지 않은 수치를 믿기보다 내 수익 기록으로 판단해요.", "아침 체크인에 어제 수익을 기록하면 글당 평균이 계산돼요."], status: "done" as PathStatus, note: "", emoji: "adpost", cta: { label: "애드포스트 설정 열기", url: ADPOST } } : { label: "네이버 애드포스트", desc: "글에 광고가 붙는 기본 수익", conditions: `만 19세 이상 + 네이버 심사 통과가 필요해요. 심사 기준(운영 기간·글·방문자)은 공식 공개가 아니라, 통설 기준으로 매일 1편씩 15편 이상 + 일 방문 100명 안팎을 목표로 준비해요. ${ASOF}`, how: ["adpost.naver.com에 접속해 네이버 아이디로 로그인하고 회원가입해요(본인인증 필요).", "가입 후 [미디어 관리 → 미디어 등록]에서 내 블로그를 선택해 검수를 신청해요.", "검수는 최대 5영업일 — 결과가 네이버 메일로 와요. 그동안 평소처럼 글을 계속 써요.", "승인되면 글에 광고가 자동으로 붙어요. 반려돼도 보완하고(글·방문자 더 쌓고) 다시 신청할 수 있어요."], tips: ["여기까지의 준비(주제 일관·검색 허용·꾸준한 발행)는 우리 코스가 챙겨온 거예요 — 신청만 하면 돼요.", "승인 전에 쓴 글도 승인 후 전부 수익 대상이 돼요.", "반려는 실패가 아니라 흔한 과정이에요 — 재신청에 불이익 없어요."], status: adpostDone ? "now" : "progress", note: adpostDone ? "" : `발행 ${pub}/15편`, emoji: "adpost", cta: adpostDone ? { label: "애드포스트 신청하러 가기", url: ADPOST } : { label: "글 쓰러 가기", onClick: onWrite } },
      { label: "네이버 쇼핑커넥트", desc: "상품 추천 수수료 · 네이버 자체 제휴", conditions: `채널 인증만으로 시작할 수 있어요. 수수료는 판매자 설정에 따라 상품별로 달라요(상품에 따라 높게 잡히기도 해요). ${ASOF}`, how: ["네이버 브랜드커넥트(쇼핑커넥트)에 접속해 내 채널을 인증해요.", "글 주제에 맞는 상품을 골라 제휴 링크를 만들어요.", "리뷰·비교 글의 [상품 링크 자리]에 내 링크를 넣어요.", "방문자가 링크로 구매하면 수수료가 정산돼요."], tips: ["네이버 자체 제휴라 외부 링크보다 노출에 안정적이에요.", "리뷰·비교형 글과 궁합이 좋아요 — 글감 카드의 '쇼핑커넥트' 태그를 참고해요.", "'열렸어요'는 기회가 열린 거지 수익을 보장하는 게 아니에요."], status: adpostDone ? "now" : "locked", note: adpostDone ? "" : "애드포스트 승인 후", emoji: "cart", cta: adpostDone ? { label: "쇼핑커넥트 알아보기", url: "https://brandconnect.naver.com" } : undefined },
      { label: "체험단·기자단", desc: "지수 조금만 올라도 건당 현금·제품", conditions: `발행 글 수와 운영 기간이 어느 정도 쌓이면 선정되기 시작해요(일 방문자 수백 명 안팎). ${ASOF}`, how: ["체험단 플랫폼(레뷰 등)에 내 블로그를 등록해요.", "내 주제와 맞는 캠페인에 신청해요.", "선정되면 제품·서비스를 받고 기한 안에 솔직한 후기를 써요.", "실적이 쌓이면 더 좋은 캠페인·원고료 제안이 들어와요."], tips: ["'협찬·제공받았다'는 사실을 글에 꼭 표기해요(공정위 규정 — 미표기 시 과태료 위험).", "주제와 동떨어진 체험단 도배는 블로그 지수에 해로워요.", "과장 후기는 신뢰·노출에 오히려 독이에요."], status: pub >= 30 ? "now" : "locked", note: pub >= 30 ? "" : `발행 ${pub}/30편`, emoji: "gift" },
      { label: "네이버 인플루언서 · 브랜드커넥트", desc: "협찬·PPL·커머스 제휴 · 사다리 꼭대기", conditions: `네이버 인플루언서 승인이 있어야 브랜드커넥트로 협찬·PPL을 할 수 있어요. 한 분야의 꾸준한 전문성이 승인의 핵심이라 장기 목표예요. ${ASOF}`, how: ["한 주제로 경험이 담긴 글을 꾸준히 쌓아요(전문성·일관성).", "인플루언서 홈에서 내 분야로 지원해요.", "승인되면 브랜드커넥트에서 협찬·커머스 캠페인이 매칭돼요."], tips: ["단기 목표가 아니에요 — 앞 단계를 착실히 밟는 게 곧 준비예요.", "승인은 네이버 심사라 보장이 아니에요.", "'열렸어요'는 기회의 개방이지 수익 약속이 아니에요."], status: "locked", note: "장기 목표", emoji: "medal", cta: { label: "인플루언서 알아보기", url: "https://in.naver.com" } },
    ],
    // 사다리 밖 — 외부 제휴. 균형 잡힌 리스크 안내(겁주기 금지, 사실만).
    otherChannels: [
      { label: "쿠팡파트너스", desc: "외부 상업 링크 수수료 · 선택 채널", conditions: `블로그만 있으면 가입할 수 있고 기본 수수료는 3% 안팎이에요. ${ASOF}`, how: ["partners.coupang.com에서 가입해요.", "상품을 검색해 '링크 생성'으로 내 추천 링크를 만들어요.", "상품을 추천·비교하는 자연스러운 자리에만 최소로 넣어요.", "링크로 24시간 안에 구매가 일어나면 수수료가 들어와요."], tips: ["'쿠팡 파트너스 활동의 일환으로 일정 수수료를 받습니다' 문구를 꼭 넣어요(필수).", "네이버는 외부 상업 링크에 민감해요 — 도배하면 노출이 떨어질 수 있으니 꼭 필요한 글에만 최소로 쓰세요.", "네이버 자체 제휴인 쇼핑커넥트를 먼저 고려하고, 쿠팡은 보조로 쓰는 걸 권해요."], status: "now", note: "", emoji: "cart-o", cta: { label: "쿠팡파트너스 가입", url: COUPANG } },
    ],
  };
}

// 아이콘 키 → 글래스 타일 매핑(이모지 아님, 명명 키).
const GLASS_OF: Record<string, { name: string; tint: GlassTint }> = {
  adpost: { name: "adpost", tint: "blue" },
  cart: { name: "cart", tint: "blue" },
  "cart-o": { name: "cart", tint: "orange" },
  gift: { name: "gift", tint: "rose" },
  medal: { name: "medal", tint: "amber" },
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
  if (status === "locked") return <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-400">잠김</span>;
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
            <a href={p.cta.url} target="_blank" rel="noopener noreferrer" className="block w-full rounded-xl tk-grad-cta py-3 text-center text-[14px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">{p.cta.label}</a>
          ) : (
            <button onClick={p.cta.onClick} className="w-full rounded-xl tk-grad-cta py-3 text-[14px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">{p.cta.label}</button>
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
        <button onClick={onWrite} className="at-press mt-4 rounded-xl tk-grad-cta px-5 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90">첫 글 쓰러 가기</button>
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
      <p className="text-[13px] font-bold text-[#1D75F7]">조급해하지 마세요</p>
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
    const pub = articles.filter((a) => isVerifiedStatus(a.status)).length; // ★게이지=verified만(+레거시)
    const streak = computeWeekStreak(nonGen.map((a) => new Date(a.created_at)));
    return { written, pub, streak };
  }, [articles]);

  const [approved, setApproved] = useState(false);
  useEffect(() => { try { setApproved(localStorage.getItem("ateflo_adpost_approved") === "1"); } catch { /* ignore */ } }, []);
  const { title, paths, otherChannels } = buildPaths(stats.pub, onWrite, approved);
  const allRows = [...paths, ...otherChannels];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx !== null ? allRows[openIdx] : null;

  return (
    <div className="space-y-4">
      <div className=""><AssetHero written={stats.written} streak={stats.streak} pub={stats.pub} onWrite={onWrite} /></div>

      {/* 수익 대시보드 v1 — 입력 데이터만 */}
      <RevenueDash publishedCount={stats.pub} />

      {/* 승인 결과 입력 — 승인=수익칸·쇼핑커넥트 열쇠 / 거절=D-7 재신청 코스 */}
      {stats.pub >= 10 && <ApprovalInput onChanged={() => { try { setApproved(localStorage.getItem("ateflo_adpost_approved") === "1"); } catch { /* ignore */ } }} />}

      {open ? (
        <PathDetail p={open} onBack={() => setOpenIdx(null)} />
      ) : (
        <>
          <div className="rounded-2xl at-glass p-5 ">
            <p className="text-[15px] font-bold text-neutral-900">{title}</p>
            <div className="mt-1">
              {paths.map((p, i) => <PathRow key={p.label} p={p} first={i === 0} onOpen={() => setOpenIdx(i)} />)}
            </div>
          </div>
          <div className="rounded-2xl at-glass p-5 ">
            <p className="text-[15px] font-bold text-neutral-900">그 밖의 채널</p>
            <p className="mt-0.5 text-[12px] text-neutral-400">사다리 밖 외부 제휴 — 필요할 때 선택으로</p>
            <div className="mt-1">
              {otherChannels.map((p, i) => <PathRow key={p.label} p={p} first={i === 0} onOpen={() => setOpenIdx(paths.length + i)} />)}
            </div>
          </div>
        </>
      )}

      <div className=""><ExpectationCard pub={stats.pub} /></div>
    </div>
  );
}
