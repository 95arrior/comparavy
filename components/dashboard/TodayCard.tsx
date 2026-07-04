"use client";

import GlassIcon from "@/components/GlassIcon";
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
  topic, loading, credits, info, onWriteKeyword, onGoPerformance, onOpenTodayDraft, preReady, onReadToday,
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
}) {
  const locked = credits <= 0;
  const write = (t: TodayTopic) => onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb, { seriesId: t.seriesId, series: t.series });

  // 코스 완주 → 승인 신청 안내
  if (info.finished) {
    return (
      <Card>
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
      <Card>
        <Header label="오늘의 글" chip="완료" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">오늘 1편 발행 완료.<br />한 편 더 쓰면 승인이 가까워져요.</p>
        {topic && !locked && (
          <div className="mt-3 rounded-xl bg-neutral-50 p-3.5">
            <div><DemandRow topic={topic} onGoPerformance={onGoPerformance} /></div>
            <p className="mt-1.5 text-[14.5px] font-bold leading-snug text-neutral-900">{topic.title}</p>
            {whyNext && <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{whyNext}</p>}
            <button onClick={() => write(topic)} className="at-press mt-3 w-full rounded-[8px] bg-neutral-900 py-2.5 text-[13px] font-semibold text-white tk-tr hover:bg-neutral-800">
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
      <Card highlight>
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
      <Card highlight>
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
      <Card highlight>
        <Header label="오늘의 글" chip="잠김" chipIcon={<GlassIcon name="lock" tint="grey" size={16} icon={0.7} radius={6} />} />
        <DemandRow topic={topic} muted />
        <p className="mt-2 text-[16px] font-bold leading-snug text-neutral-400">{topic.title}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">오늘의 글이 준비돼 있어요. 크레딧을 충전하면 바로 이어서 써요.</p>
        <button onClick={() => write(topic)} className="mt-4 w-full rounded-[8px] bg-[color:var(--color-brand)] py-3.5 text-[15px] font-semibold text-white tk-tr hover:opacity-90">코스 이어가기</button>
      </Card>
    );
  }

  // 기본 — 오늘의 글 쓰기 (주인공 카드: 배지 + 제목 + 왜 지금 + 쓰면 N%)
  return (
    <Card highlight>
      <Header label="오늘의 글" />
      <DemandRow topic={topic} onGoPerformance={onGoPerformance} />
      <p className="mt-3 text-[20px] font-semibold leading-snug text-[color:var(--color-text)]">{topic.title}</p>
      {topic.tag === "followup" ? <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-text-weak)]">어제 글이 반응이 좋았어요. 이어서 쓰면 효과가 커져요.</p> : why ? <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--color-text-weak)]">{why}</p> : null}
      <div className="mt-3 flex items-center gap-1.5 rounded-[8px] bg-[color:var(--color-bg-subtle)] px-4 py-3">
        <span className="text-[15px] text-[color:var(--color-text-sub)]">이 글을 쓰면 <span className="font-semibold tabular-nums text-[color:var(--color-text)]">{writePct}%</span>가 돼요</span>
        {info.day === 0 && <span className="text-[13px] text-[color:var(--color-text-weak)]">· 첫 글이 코스 시작</span>}
      </div>
      <button onClick={() => (preReady && onReadToday ? onReadToday() : write(topic))} className="at-press mt-4 w-full rounded-[8px] bg-[color:var(--color-brand)] py-3.5 text-[15px] font-semibold text-white tk-tr hover:opacity-90">{preReady ? "글 읽어보기" : "이 글 쓰기"}</button>
    </Card>
  );
}

// 데이터 배지 행 — 주인공 카드로 이동(월 검색량·경쟁·선점 기회).
function DemandRow({ topic, muted, onGoPerformance }: { topic: TodayTopic; muted?: boolean; onGoPerformance?: () => void }) {
  const isTrend = topic.tag === "issue" || topic.tag === "trend";
  const isSteady = topic.tag === "steady";
  const comp = topic.comp === "low" ? { label: "경쟁 낮음", cls: "bg-emerald-50 text-emerald-600" }
    : topic.comp === "mid" ? { label: "경쟁 보통", cls: "bg-amber-50 text-amber-600" }
    : topic.comp === "high" ? { label: "경쟁 높음", cls: "bg-rose-50 text-rose-500" } : null;
  const demand = isTrend ? "지금 뜨는 중 · 선점 기회" : isSteady ? "꾸준히 찾는 주제" : (topic.vol && topic.vol > 0) ? `월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : "숨은 수요 키워드";
  // ★수익 경로 태그(정보) — 리뷰/비교형이면 쇼핑커넥트 연계 가능. 사다리(행동)와 별개로 표시.
  const rev = revenuePath({ keyword: topic.keyword, title: topic.title });
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${muted ? "opacity-60" : ""}`}>
      {topic.seriesBadge
        ? <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">{topic.seriesBadge}</span>
        : topic.tag === "followup"
        ? <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">반응 후속</span>
        : isTrend
        ? <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">실시간 트렌드</span>
        : isSteady
        ? <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">꾸준한 수요</span>
        : comp && <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">{comp.label}</span>}
      <button onClick={(e) => {
        e.stopPropagation();
        if (rev === "shopping") {
          let approved = false; try { approved = localStorage.getItem("ateflo_adpost_approved") === "1"; } catch { /* ignore */ }
          if (!approved && onGoPerformance) onGoPerformance(); // 잠김 → "애드포스트 승인 후 열려요" = 사다리 화면이 안내
        } else if (onGoPerformance) onGoPerformance();
      }} className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">{rev === "shopping" ? "쇼핑커넥트" : "애드포스트"}</button>
      {topic.bidHigh && <span className="rounded-full bg-[color:var(--color-brand-weak)] px-2 py-0.5 text-[12px] text-[color:var(--color-warning)]">단가 높음</span>}
      <span className="text-[13px] text-[color:var(--color-text-weak)]">{demand}</span>
    </div>
  );
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-line)] bg-white p-6">{children}</div>
  );
}

function Header({ label, chip, chipIcon }: { label: string; chip?: string; chipIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[13px] font-semibold text-[color:var(--color-text-sub)]">{label}</p>
      {chip && <span className="flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--color-bg-subtle)] px-2 py-0.5 text-[12px] text-[color:var(--color-text-sub)]">{chipIcon}{chip}</span>}
    </div>
  );
}
