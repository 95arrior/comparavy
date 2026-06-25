"use client";

import { useEffect, useMemo, useState } from "react";
import type { Article } from "./types";
import type { BloggerType } from "@/lib/bloggerTypes";
import SearchPerformance from "./SearchPerformance";

// 성과 페이지 — 유형(online/local/hobby)별 적응. 초반 이탈 방어:
//  자산 히어로 + 단계별 '길'(수익화/손님) 리스트 → 행 탭하면 상세(기준·어떻게·시작).

const COUPANG = "https://partners.coupang.com/";
const ADSENSE = "https://www.google.com/adsense/start/";
const TENPING = "https://www.tenping.kr/";
const NAVER_PLACE = "https://smartplace.naver.com/";

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

function buildPaths(type: BloggerType, pub: number, wpConnected: boolean, onWrite: () => void, onGoConnect: () => void, onRegion: () => void): { title: string; paths: Path[] } {
  if (type === "local") {
    return {
      title: "손님이 오는 길",
      paths: [
        { label: "동네 검색에 뜨기", desc: "동네 손님이 검색에서 우리 가게 발견", conditions: "글을 꾸준히 발행하면 자동으로 노출돼요. 별도 가입 없음.", how: ["‘동네 + 업종’ 글을 꾸준히 써요.", "구글·네이버가 글을 색인해 검색에 보여줘요.", "동네 손님이 우리 가게를 처음 만나요."], status: pub >= 5 ? "done" : "progress", note: pub >= 5 ? "" : `발행 ${pub}/5편`, logo: "/logos/local-search.png", emoji: "🔍", cta: { label: "글 쓰러 가기", onClick: onWrite } },
        { label: "지역 키워드 선점", desc: "‘우리동네 OO’ 검색 상위 노리기", conditions: "경쟁 적은 동네 키워드를 먼저 글로 써서 선점해요.", how: ["지역 강화로 우리 동네 키워드를 찾아요.", "경쟁 적은 키워드부터 글로 선점해요.", "한 번 상위에 오르면 계속 손님이 들어와요."], status: "now", note: "", logo: "/logos/local-keyword.png", emoji: "📍", cta: { label: "지역 강화 시작", onClick: onRegion } },
        { label: "단골 만들기", desc: "가게 이름 검색·재방문 손님", conditions: "꾸준한 정보 글로 신뢰가 쌓이면 재방문·브랜드 검색이 늘어요.", how: ["꾸준히 유용한 글을 쌓아요.", "가게 이름으로 검색하는 손님이 생겨요.", "신뢰가 쌓여 단골·재방문으로 이어져요."], status: pub >= 15 ? "done" : "locked", note: pub >= 15 ? "" : "글 더 쌓이면", logo: "/logos/local-regular.png", emoji: "👥", cta: { label: "글 쓰러 가기", onClick: onWrite } },
        { label: "네이버 플레이스 연동", desc: "길찾기·전화·예약 받기 (선택)", conditions: "네이버 스마트플레이스 무료 가입.", how: ["네이버 스마트플레이스에 가게를 등록해요.", "블로그 글에서 길찾기·전화·예약으로 바로 연결돼요."], status: "now", note: "", logo: "/logos/naverplace.png", emoji: "📌", cta: { label: "스마트플레이스 등록", url: NAVER_PLACE } },
      ],
    };
  }
  return {
    title: type === "hobby" ? "수익화 (선택)" : "수익화 길",
    paths: [
      { label: "쿠팡파트너스", desc: "전환 1건이면 첫 수익", conditions: "블로그(사이트)만 있으면 가입 · 거의 즉시 승인 · 첫 3개월 내 실적 1건 권장.", how: ["partners.coupang.com에서 가입해요. 블로그(사이트)만 있으면 거의 즉시 승인돼요.", "글 주제에 맞는 쿠팡 상품을 검색하고 ‘링크 생성’으로 내 추천 링크를 만들어요.", "글에서 상품을 추천·비교하는 자연스러운 자리에 그 링크를 넣어요.", "방문자가 그 링크로 들어가 24시간 안에 무언가 사면 수수료가 들어와요(꼭 그 상품이 아니어도 돼요)."], tips: ["‘쿠팡 파트너스 활동의 일환으로 일정 수수료를 받습니다’ 문구를 글에 꼭 넣어요(필수).", "가입 후 첫 3개월 안에 실적 1건을 만들면 자격이 유지돼요.", "가전·뷰티처럼 단가 높은 카테고리가 수익에 유리해요."], status: wpConnected ? "now" : "progress", note: wpConnected ? "" : "블로그 먼저 연결", logo: "/logos/coupang.png", emoji: "🛒", cta: wpConnected ? { label: "쿠팡파트너스 가입", url: COUPANG } : { label: "블로그 먼저 연결", onClick: onGoConnect } },
      { label: "구글 애드센스", desc: "자동 광고로 안정적 수동수입", conditions: "고유 도메인 + 양질의 글 20편+ 권장 · 구글 심사(수일~수주) · 정책 준수. ※ 편수만으로 승인을 보장하진 않아요.", how: ["글을 15~20편 이상 쌓아요(직접 경험·정보가 담길수록 유리). ★신뢰 페이지(소개·운영자·문의·개인정보처리방침)도 꼭 있어야 해요 — ‘워드프레스’ 탭에서 버튼 한 번으로 만들 수 있어요.", "adsense.google.com → ‘시작하기’ → 내 사이트 주소를 넣고 구글 계정을 연결해요.", "구글이 준 ‘연결 코드’를 사이트에 넣어요. 워드프레스는 플러그인 ‘Site Kit’을 깔면 클릭 몇 번으로 끝나요.", "‘검토 요청’을 누르면 구글이 심사해요(보통 며칠~2주). 승인되면 메일이 와요.", "승인 후 ‘자동 광고’를 켜면 글에 광고가 자동으로 붙어 수익이 시작돼요."], tips: ["한 번에 승인이 안 나도 부족한 부분(글·페이지)을 보완해 다시 신청할 수 있어요.", "‘광고 눌러주세요’ 같은 클릭 유도, 내 광고 직접 클릭은 계정 정지 사유 — 절대 금지.", "처음엔 수익이 적어요. 글·방문자가 쌓일수록 늘어나는 구조예요."], status: pub >= 20 ? "now" : "progress", note: pub >= 20 ? "" : `발행 ${pub}/20편`, logo: "/logos/adsense.png", emoji: "📢", cta: pub >= 20 ? { label: "애드센스 신청", url: ADSENSE } : undefined },
      { label: "제휴마케팅", desc: "텐핑·알리 등 다양한 제휴", conditions: "누구나 가입 · 사이트/SNS 있으면 OK.", how: ["텐핑·애드픽 같은 제휴 플랫폼에 가입해요(사이트나 SNS 있으면 OK).", "내 글 주제에 맞는 캠페인을 골라 ‘내 전용 링크’를 받아요.", "글에 그 링크를 자연스럽게 넣어요(주제랑 맞게, 과하지 않게).", "방문자가 클릭하거나 가입·구매하면 건당 수익이 쌓여요."], tips: ["글 주제와 안 맞는 캠페인을 도배하면 신뢰도·검색 노출에 해로워요.", "광고·제휴 링크임을 표기하면 더 안전해요."], status: "now", note: "", logo: "/logos/tenping.png", emoji: "🔗", cta: { label: "텐핑 가입", url: TENPING } },
      { label: "체험단·협찬", desc: "브랜드 협찬·원고료", conditions: "어느 정도 방문자·영향력이 쌓여야 제안이 들어와요.", how: ["방문자·구독이 어느 정도 쌓이면 브랜드나 체험단에서 협찬 제안이 들어와요.", "레뷰 등 체험단 플랫폼에 블로그를 등록해두면 직접 신청해 협찬을 받을 수도 있어요.", "제품·서비스를 받고 솔직한 후기를 써요."], tips: ["‘협찬·제공받았다’는 사실을 꼭 표기해요(공정위 규정).", "솔직하지 않은 과장 후기는 신뢰·노출에 오히려 독이 돼요."], status: "locked", note: "트래픽 쌓이면", emoji: "🎁" },
    ],
  };
}

function LogoSlot({ logo, emoji, size = "h-9 w-9" }: { logo?: string; emoji?: string; size?: string }) {
  // 이모지 = 베이스(로고 파일 추가 전), 로고 이미지 = 위에 덮음(있으면). 파일 없으면 onError로 숨겨 이모지 노출.
  return (
    <span className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100`}>
      {emoji && <span className="text-[17px]">{emoji}</span>}
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}
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
    <button onClick={onOpen} className={`flex w-full items-center gap-3 py-3 text-left transition active:bg-neutral-50 ${first ? "" : "border-t border-neutral-100"}`}>
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
    <div className="ateflo-page-in rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
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

interface LocalDemand { keyword?: string; searches?: number; needAddress?: boolean }

function HeroShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-gradient-to-br from-[#1D75F7] to-[#1565d8] p-5 text-white shadow-[0_12px_30px_-14px_rgba(29,117,247,0.6)]">{children}</div>;
}
function HeroChips({ streak, indexed }: { streak: number; indexed: number }) {
  if (streak < 2 && indexed <= 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {streak >= 2 && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold">🔥 {streak}주 연속</span>}
      {indexed > 0 && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-bold">🔍 구글이 {indexed}편 찾았어요</span>}
    </div>
  );
}

// 히어로 — '욕망' 지표로. 자영업=우리 동네 검색 수요(네이버), n잡=방문자(GSC). 데이터 전엔 결승선.
function AssetHero({ written, streak, pub, indexed, type, localDemand, visitors, onWrite, onEditBusiness }: {
  written: number; streak: number; pub: number; indexed: number; type: BloggerType;
  localDemand: LocalDemand | null; visitors: number | null; onWrite: () => void; onEditBusiness?: () => void;
}) {
  if (written === 0) {
    return (
      <HeroShell>
        <p className="text-[13px] font-semibold text-white/75">시작하기</p>
        <p className="mt-2 text-[19px] font-extrabold leading-snug tracking-tight">첫 글을 쓰면<br />여기에 성과가 쌓여요</p>
        <button onClick={onWrite} className="mt-3.5 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-[#1D75F7] transition active:scale-95">첫 글 쓰러 가기</button>
      </HeroShell>
    );
  }
  const local = type === "local";
  const remain = Math.max(0, (local ? 5 : 20) - pub);
  const finishLine = local
    ? remain === 0 ? "동네 검색에 노출되는 중이에요" : `동네 검색 노출까지 ${remain}편`
    : remain === 0 ? "이제 애드센스 신청할 수 있어요" : `애드센스 신청까지 ${remain}편`;

  // 자영업자 — 주소 미등록
  if (local && localDemand?.needAddress) {
    return (
      <HeroShell>
        <p className="text-[13px] font-semibold text-white/75">우리 동네 검색 수요</p>
        <p className="mt-2 text-[18px] font-extrabold leading-snug tracking-tight">업체 주소를 등록하면<br />동네 손님 수요가 보여요</p>
        <button onClick={onEditBusiness} className="mt-3.5 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-[#1D75F7] transition active:scale-95">업체 등록하러 가기</button>
      </HeroShell>
    );
  }

  // 자영업자 — 동네 검색 수요(네이버)
  if (local && localDemand && (localDemand.searches ?? 0) > 0) {
    return (
      <HeroShell>
        <p className="text-[13px] font-semibold text-white/75">우리 동네 검색 수요</p>
        <p className="mt-2 leading-none tracking-tight"><span className="text-[34px] font-extrabold">{(localDemand.searches ?? 0).toLocaleString("ko-KR")}</span><span className="ml-1 text-[15px] font-bold text-white/80">회 / 월</span></p>
        <p className="mt-2.5 text-[13px] font-bold text-white">한 달간 ‘{localDemand.keyword}’ 검색 · 지금 잡으면 우리가 1등 🎯</p>
        <HeroChips streak={streak} indexed={indexed} />
      </HeroShell>
    );
  }

  // n잡·취미 — 방문자(GSC)
  if (!local && (visitors ?? 0) > 0) {
    return (
      <HeroShell>
        <p className="text-[13px] font-semibold text-white/75">최근 28일 방문자</p>
        <p className="mt-2 leading-none tracking-tight"><span className="text-[34px] font-extrabold">{(visitors ?? 0).toLocaleString("ko-KR")}</span><span className="ml-1 text-[15px] font-bold text-white/80">명</span></p>
        <p className="mt-2.5 text-[13px] font-bold text-white">🎯 {finishLine}</p>
        <HeroChips streak={streak} indexed={indexed} />
      </HeroShell>
    );
  }

  // 데이터 전/0 — 결승선 중심(욕망: 돈·손님이 코앞)
  return (
    <HeroShell>
      <p className="text-[13px] font-semibold text-white/75">{local ? "우리 동네 공략" : "수익화 여정"}</p>
      <p className="mt-2 text-[19px] font-extrabold leading-snug tracking-tight">🎯 {finishLine}</p>
      <p className="mt-1.5 text-[13px] font-medium text-white/85">{local ? "조금만 더 쓰면 동네 손님이 우리를 찾아요" : "조금만 더 쓰면 광고 수익을 시작할 수 있어요"}</p>
      <HeroChips streak={streak} indexed={indexed} />
    </HeroShell>
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
  onEditBusiness,
}: {
  articles: Article[];
  wpConnected: boolean;
  type: BloggerType;
  onWrite: () => void;
  onGoConnect: () => void;
  onRegion: () => void;
  onEditBusiness?: () => void;
}) {
  const stats = useMemo(() => {
    const nonGen = articles.filter((a) => a.status !== "generating");
    const written = nonGen.length;
    const chars = nonGen.reduce((s, a) => s + (a.char_count ?? 0), 0);
    const pub = articles.filter((a) => a.status === "published").length;
    const streak = computeWeekStreak(nonGen.map((a) => new Date(a.created_at)));
    return { written, chars, pub, streak };
  }, [articles]);

  const [indexed, setIndexed] = useState(0);
  const [visitors, setVisitors] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/searchconsole/indexed")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setIndexed(d.count ?? 0); setVisitors(d.clicks ?? 0); } })
      .catch(() => {});
  }, []);

  // 자영업자만 — 우리 동네 검색 수요(네이버)
  const [localDemand, setLocalDemand] = useState<LocalDemand | null>(null);
  useEffect(() => {
    if (type !== "local") return;
    fetch("/api/local-demand")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setLocalDemand(d); })
      .catch(() => {});
  }, [type]);

  const { title, paths } = buildPaths(type, stats.pub, wpConnected, onWrite, onGoConnect, onRegion);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx !== null ? paths[openIdx] : null;

  return (
    <div className="space-y-4">
      <AssetHero written={stats.written} streak={stats.streak} pub={stats.pub} indexed={indexed} type={type} localDemand={localDemand} visitors={visitors} onWrite={onWrite} onEditBusiness={onEditBusiness} />

      {open ? (
        <PathDetail p={open} onBack={() => setOpenIdx(null)} />
      ) : (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.04]">
          <p className="text-[15px] font-bold text-neutral-900">{title}</p>
          <div className="mt-1">
            {paths.map((p, i) => <PathRow key={p.label} p={p} first={i === 0} onOpen={() => setOpenIdx(i)} />)}
          </div>
        </div>
      )}

      <SearchPerformance onGoConnect={onGoConnect} />

      <ExpectationCard pub={stats.pub} />
    </div>
  );
}
