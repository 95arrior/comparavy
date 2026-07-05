"use client";

import GlassIcon, { GlassGlyph } from "@/components/GlassIcon";
import TipChip, { tipFor } from "@/components/TipChip";
import type { CourseInfo } from "@/lib/course";
import { nextWritePercent } from "@/lib/course";
import { whyNow } from "@/lib/whyNow";
import { revenuePath } from "@/lib/revenue";

// '오늘 할 일' 카드 — 홈 최상단, 뇌빼고의 심장. 오늘 해야 할 단 하나만.
//  주인공 카드가 가장 많은 근거를 가진다: 데이터 배지 + '왜 지금' 한 줄 + '쓰면 N%' 인과.
//  이모지·장식 기호 금지.

type CompLevel = "low" | "mid" | "high" | undefined;
export interface TodayTopic {
  keyword: string; title: string; tag?: string; newsContext?: string;
  briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string };
  vol?: number; comp?: CompLevel; blogTotal?: number | null; bidHigh?: boolean;
  seriesId?: string; seriesBadge?: string; series?: { title: string; arc: { role: string; angle: string }[] } | null;
}

export default function TodayCard({
  topic, loading, credits, info, onWriteKeyword, onGoPerformance, onOpenTodayDraft, preReady, onReadToday, onHeroSwap, heroSwapsLeft, plain,
}: {
  topic: TodayTopic | null;
  loading: boolean;
  credits: number;
  info: CourseInfo;
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }, extra?: { seriesId?: string; series?: TodayTopic["series"] }) => void;
  onGoPerformance: () => void;
  /** 오늘 draft 재진입(이어서 발행) — draft 상태 카드 전용 */
  onOpenTodayDraft?: () => void;
  /** ★사전 생성 완료 — 버튼이 '글 읽어보기'로 조용히 전환(생성 광고 금지, 이 라벨이 유일한 신호) */
  preReady?: boolean;
  onReadToday?: () => void;
  /** 오늘의 글 교체(한도는 상위에서) */
  onHeroSwap?: () => void;
  /** 오늘 남은 교체 횟수 — 0이면 버튼 흐림(안 먹히는 것처럼 보이는 UX 제거) */
  heroSwapsLeft?: number;
  /** 캔버스 위 섹션(카드 껍데기 없음) — 홈 재설계 */
  plain?: boolean;
}) {
  const locked = credits <= 0;
  const write = (t: TodayTopic) => onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb, { seriesId: t.seriesId, series: t.series });

  // 코스 완주 → 승인 신청 안내
  if (info.finished) {
    return (
      <Card plain={plain}>
        <Header label="승인 준비 코스" chip="완주" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">준비 코스를 완주했어요.<br />애드포스트 신청해볼 차례예요.</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">승인 여부는 네이버 심사(최대 5영업일)가 정해요. 반려돼도 글을 계속 쌓다가 재신청하면 돼요.</p>
        <button onClick={onGoPerformance} className="mt-4 w-full rounded-[8px] bg-neutral-900 py-3.5 text-[15px] font-semibold text-white tk-tr hover:bg-neutral-800">승인 신청 방법 보기</button>
      </Card>
    );
  }

  // 오늘 완료(발행 기준) — 완료 배지와 독려를 한 문장으로. topic은 '오늘 발행분 제외' 다음 글감(상위에서 선별).
  if (info.publishedToday) {
    const whyNext = topic ? whyNow(topic) : "";
    return (
      <Card plain={plain}>
        <div className="flex items-center justify-between">
          <Header label="오늘의 글" chip="완료" />
          {topic && !locked && onHeroSwap && (
            <button onClick={onHeroSwap} aria-label="다음 글감 교체" className={`at-press flex h-8 items-center gap-1.5 rounded-full bg-[#F7F8FA] px-2.5 hover:bg-[#EFF2F6] ${heroSwapsLeft === 0 ? "opacity-45" : ""}`}>
              <GlassIcon name="refresh" tint="grey" size={14} />
              {typeof heroSwapsLeft === "number" && <span className="text-[11.5px] font-bold tabular-nums text-neutral-500">{heroSwapsLeft}</span>}
            </button>
          )}
        </div>
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">오늘 1편 발행 완료.<br />한 편 더 쓰면 승인이 가까워져요.</p>
        {!topic && !locked && (
          <p className="mt-3 rounded-[12px] bg-[#F7F8FA] px-4 py-3 text-[13px] text-[color:var(--color-text-sub)]">이 주제의 새 글감을 모으고 있어요 — 잠시 후 새로고침해 보세요.</p>
        )}
        {topic && !locked && (
          <div className="mt-3 rounded-[12px] bg-[#F7F8FA] p-3.5">
            <div><DemandRow topic={topic} onGoPerformance={onGoPerformance} /></div>
            <p className="mt-1.5 text-[14.5px] font-bold leading-snug text-neutral-900">{topic.title}</p>
            {whyNext && <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{whyNext}</p>}
            <button onClick={() => write(topic)} className="at-press tk-grad-cta mt-3 w-full rounded-[12px] py-3 text-[14px] font-bold text-white">
              다음 글감 쓰기
            </button>
          </div>
        )}
      </Card>
    );
  }

  // ★draft만 있고 발행 없음 — 미션 미완료. 쓰다 만 글 재진입이 1순위 행동.
  if (info.hasDraftToday && onOpenTodayDraft) {
    return (
      <Card plain={plain} highlight>
        <Header label="오늘의 글" chip="발행 전" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">쓰다 만 글이 있어요.<br />발행까지 마쳐야 오늘 미션 완료예요.</p>
        <button onClick={onOpenTodayDraft} className="at-press mt-3.5 w-full rounded-xl bg-[#03C75A] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">
          이어서 발행하기
        </button>
      </Card>
    );
  }

  // 로딩 — 완성 카드와 같은 뼈대의 스켈레톤(배지 줄·제목 2줄·인과 박스·버튼). 갑툭튀 방지 + 레이아웃 시프트 0.
  if (loading || !topic) {
    return (
      <Card plain={plain} highlight>
        <Header label="오늘의 글" />
        <div className="at-rise mt-2 space-y-0" aria-hidden>
          <div className="flex items-center gap-1.5">
            <div className="ateflo-skel h-[18px] w-16 rounded-md" />
            <div className="ateflo-skel h-[18px] w-14 rounded-md" />
            <div className="ateflo-skel h-3.5 w-20 rounded" />
          </div>
          <div className="ateflo-skel mt-3 h-[22px] w-11/12 rounded" />
          <div className="ateflo-skel mt-2 h-[22px] w-3/5 rounded" />
          <div className="ateflo-skel mt-3 h-[42px] w-full rounded-xl" />
          <div className="ateflo-skel mt-3.5 h-[50px] w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  const why = whyNow(topic);
  const writePct = nextWritePercent(info);

  // 잠김 — 크레딧 0
  if (locked) {
    return (
      <Card plain={plain} highlight>
        <Header label="오늘의 글" chip="잠김" chipIcon={<GlassIcon name="lock" tint="grey" size={16} icon={0.7} radius={6} />} />
        <DemandRow topic={topic} muted />
        <p className="mt-2 text-[16px] font-bold leading-snug text-neutral-400">{topic.title}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">오늘의 글이 준비돼 있어요. 크레딧을 충전하면 바로 이어서 써요.</p>
        <button onClick={() => write(topic)} className="mt-4 w-full rounded-[8px] bg-[color:var(--color-brand)] py-3.5 text-[15px] font-semibold text-white tk-tr hover:opacity-90">코스 이어가기</button>
      </Card>
    );
  }

  // 기본 — ★메이트 히어로 배너: 오늘의 글이 포스터다(딥블루 그라데이션+떠다니는 오브+흰 CTA).
  return (
    <div className="tk-hero tk-hero-in mt-4 rounded-[24px] p-6 pb-7 text-white">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white/70">오늘의 글</p>
          {onHeroSwap && (
            <button onClick={onHeroSwap} aria-label="다른 글감으로 교체" className={`at-press flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-2.5 hover:bg-white/25 ${heroSwapsLeft === 0 ? "opacity-45" : ""}`}>
              <GlassGlyph name="refresh" size={14} />
              {typeof heroSwapsLeft === "number" && <span className="text-[11.5px] font-bold tabular-nums text-white/85">{heroSwapsLeft}</span>}
            </button>
          )}
        </div>
        <div className="mt-3.5"><DemandRow topic={topic} onGoPerformance={onGoPerformance} onDark /></div>
        <p className="mt-4 text-[24px] font-extrabold leading-[1.32] tracking-[-0.01em] text-white">{topic.title}</p>
        {topic.tag === "followup" ? (
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">어제 글이 반응이 좋았어요. 이어서 쓰면 효과가 커져요.</p>
        ) : why ? (
          <p className="mt-2.5 text-[13px] leading-relaxed text-white/70">{why}</p>
        ) : null}
        <div className="mt-5 flex items-center gap-1.5 rounded-[12px] bg-white/12 px-4 py-3 backdrop-blur-[2px]">
          <span className="text-[14px] text-white/85">이 글을 쓰면 <span className="font-bold tabular-nums text-white">{writePct}%</span>가 돼요</span>
          {info.day === 0 && <span className="text-[13px] text-white/60">· 첫 글이 코스 시작</span>}
        </div>
        <button onClick={() => (preReady && onReadToday ? onReadToday() : write(topic))} className="at-press tk-hero-cta mt-5 flex h-[54px] w-full items-center justify-center rounded-[14px] text-[16px] font-bold">
          {preReady ? "글 읽어보기" : "이 글 쓰기"}
        </button>
      </div>
    </div>
  );
}

// 데이터 배지 행// 데이터 배지 행 — 주인공 카드로 이동(월 검색량·경쟁·선점 기회).
function DemandRow({ topic, muted, onGoPerformance, onDark }: { topic: TodayTopic; muted?: boolean; onGoPerformance?: () => void; onDark?: boolean }) {
  const isTrend = topic.tag === "issue" || topic.tag === "trend";
  const isSteady = topic.tag === "steady";
  const compLabel = topic.comp === "low" ? "경쟁 낮음" : topic.comp === "mid" ? "경쟁 보통" : topic.comp === "high" ? "경쟁 높음" : null;
  // ★숏테일/롱테일 프레임(유저 제안) — 유형 칩 1개 + 자기설명 문장. '애드포스트' 칩은 정보량 0이라 폐기(2회 실측: 의미 불명).
  const kind = isTrend
    ? { chip: "지금 뜨는 키워드", desc: "숏테일 · 오늘 쓰면 첫 글로 선점할 수 있어요" }
    : isSteady
    ? { chip: "꾸준한 수요", desc: `롱테일 · 검색이 계속 있는 주제${compLabel ? ` · ${compLabel}` : ""}` }
    : { chip: "꾸준한 수요", desc: `롱테일${topic.vol && topic.vol > 0 ? ` · 월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : " · 숨은 수요"}${compLabel ? ` · ${compLabel}` : ""} — 한 번 잡히면 오래 들어와요` };
  const rev = revenuePath({ keyword: topic.keyword, title: topic.title });
  const chip = onDark
    ? "rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-[2px]"
    : "rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]";
  return (
    <div className={muted ? "opacity-60" : ""}>
      <div className="flex flex-wrap items-center gap-1.5 [&>*]:tk-chip">
        {topic.seriesBadge
          ? <TipChip tip={tipFor(topic.seriesBadge)} className={chip}>{topic.seriesBadge}</TipChip>
          : topic.tag === "followup"
          ? <TipChip tip={tipFor("반응 후속")} className={chip}>반응 후속</TipChip>
          : <TipChip tip={tipFor(kind.chip)} className={chip}>{kind.chip}</TipChip>}
        {rev === "shopping" && <TipChip tip={tipFor("커미션 기회")} className={chip}>커미션 기회</TipChip>}
        {topic.bidHigh && <TipChip tip={tipFor("단가 높음")} className={onDark ? "rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-amber-200" : "rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-warning)]"}>단가 높음</TipChip>}
      </div>
      <p className={onDark ? "mt-1.5 text-[12.5px] text-white/60" : "mt-1.5 text-[12.5px] text-[color:var(--color-text-weak)]"}>{kind.desc}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode; highlight?: boolean; plain?: boolean }) {
  // 토스 카드 문법 — 회색 캔버스 위 흰 카드, 라운드 20, 소프트 섀도(빈곤한 플랫 금지)
  return <div className="tk-seq-2 tk-card-glow mt-4 rounded-[20px] p-6 shadow-[0_2px_12px_-4px_rgba(29,117,247,0.12)]">{children}</div>;
}

function Header({ label, chip, chipIcon }: { label: string; chip?: string; chipIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[13px] font-semibold text-[color:var(--color-brand)]">{label}</p>
      {chip && <span className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--color-bg-subtle)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">{chipIcon}{chip}</span>}
    </div>
  );
}
