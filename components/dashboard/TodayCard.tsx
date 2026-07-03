"use client";

import GlassIcon from "@/components/GlassIcon";
import type { CourseInfo } from "@/lib/course";
import { nextWritePercent } from "@/lib/course";
import { whyNow } from "@/lib/whyNow";

// '오늘 할 일' 카드 — 홈 최상단, 뇌빼고의 심장. 오늘 해야 할 단 하나만.
//  주인공 카드가 가장 많은 근거를 가진다: 데이터 배지 + '왜 지금' 한 줄 + '쓰면 N%' 인과.
//  이모지·장식 기호 금지.

type CompLevel = "low" | "mid" | "high" | undefined;
export interface TodayTopic {
  keyword: string; title: string; tag?: string; newsContext?: string;
  briefText?: string; titleSearch?: string; thumb?: { mainCopy: string; subCopy: string; badge: string };
  vol?: number; comp?: CompLevel; blogTotal?: number | null;
}

export default function TodayCard({
  topic, loading, credits, info, onWriteKeyword, onGoPerformance,
}: {
  topic: TodayTopic | null;
  loading: boolean;
  credits: number;
  info: CourseInfo;
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string, thumb?: { mainCopy: string; subCopy: string; badge: string }) => void;
  onGoPerformance: () => void;
}) {
  const locked = credits <= 0;
  const write = (t: TodayTopic) => onWriteKeyword(t.keyword, t.title, t.newsContext, t.briefText, t.titleSearch, t.thumb);

  // 코스 완주 → 승인 신청 안내
  if (info.finished) {
    return (
      <Card>
        <Header label="승인 준비 코스" chip="완주" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">준비 코스를 완주했어요.<br />애드포스트 신청해볼 차례예요.</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">승인 여부는 네이버 심사(최대 5영업일)가 정해요. 반려돼도 글을 계속 쌓다가 재신청하면 돼요.</p>
        <button onClick={onGoPerformance} className="mt-4 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">승인 신청 방법 보기</button>
      </Card>
    );
  }

  // 오늘 완료
  if (info.publishedToday) {
    return (
      <Card>
        <Header label="오늘의 글" chip="완료" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">오늘 미션 완료!<br />내일 새 글감이 와요.</p>
        {topic && !locked && (
          <button onClick={() => write(topic)} className="mt-3 w-full rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-200 active:scale-[0.99]">
            한 편 더 쓰기 <span className="font-medium text-neutral-400">· 승인이 빨라져요</span>
          </button>
        )}
      </Card>
    );
  }

  // 로딩
  if (loading || !topic) {
    return (
      <Card>
        <Header label="오늘의 글" />
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="ateflo-skel h-5 w-3/4 rounded" />
          <div className="ateflo-skel h-10 w-full rounded-xl" />
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
        <button onClick={() => write(topic)} className="mt-3.5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">코스 이어가기</button>
      </Card>
    );
  }

  // 기본 — 오늘의 글 쓰기 (주인공 카드: 배지 + 제목 + 왜 지금 + 쓰면 N%)
  return (
    <Card highlight>
      <Header label="오늘의 글" />
      <DemandRow topic={topic} />
      <p className="mt-2 text-[19px] font-extrabold leading-snug text-[color:var(--at-grey-900)]">{topic.title}</p>
      {why && <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-neutral-500">{why}</p>}
      <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#1D75F7]/[0.06] px-3.5 py-2.5">
        <span className="text-[13px] font-bold text-[#1D75F7]">이 글을 쓰면 {writePct}%가 돼요</span>
        {info.day === 0 && <span className="text-[12px] font-medium text-[#1D75F7]/70">· 첫 글이 코스 시작</span>}
      </div>
      <button onClick={() => write(topic)} className="at-press mt-3.5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">이 글 쓰기</button>
    </Card>
  );
}

// 데이터 배지 행 — 주인공 카드로 이동(월 검색량·경쟁·선점 기회).
function DemandRow({ topic, muted }: { topic: TodayTopic; muted?: boolean }) {
  const isTrend = topic.tag === "issue" || topic.tag === "trend";
  const comp = topic.comp === "low" ? { label: "경쟁 낮음", cls: "bg-emerald-50 text-emerald-600" }
    : topic.comp === "mid" ? { label: "경쟁 보통", cls: "bg-amber-50 text-amber-600" }
    : topic.comp === "high" ? { label: "경쟁 높음", cls: "bg-rose-50 text-rose-500" } : null;
  const demand = isTrend ? "지금 뜨는 중 · 선점 기회" : (topic.vol && topic.vol > 0) ? `월 ${topic.vol.toLocaleString("ko-KR")}회 검색` : "숨은 수요 키워드";
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${muted ? "opacity-60" : ""}`}>
      {isTrend
        ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">실시간 트렌드</span>
        : comp && <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${comp.cls}`}>{comp.label}</span>}
      <span className="text-[12px] font-medium text-[color:var(--at-grey-400)]">{demand}</span>
    </div>
  );
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-5 ring-1 transition ${highlight ? "ring-[#1D75F7]/25 shadow-[0_10px_30px_-16px_rgba(29,117,247,0.35)]" : "ring-black/[0.04]"}`}>{children}</div>
  );
}

function Header({ label, chip, chipIcon }: { label: string; chip?: string; chipIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[12px] font-bold tracking-tight text-[#1D75F7]">{label}</p>
      {chip && <span className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">{chipIcon}{chip}</span>}
    </div>
  );
}
