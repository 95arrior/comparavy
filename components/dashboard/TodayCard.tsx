"use client";

import GlassIcon from "@/components/GlassIcon";

import type { CourseInfo } from "@/lib/course";

// '오늘 할 일' 카드 — 홈 최상단, 뇌빼고의 심장. 오늘 해야 할 단 하나만 보여준다.
// 상태 머신: 시작 전 → 오늘 글 쓰기 → 발행 대기(복붙) → 오늘 완료 → (크레딧 0) 잠김 → (20일) 승인 신청.
// 잠김 = 빈 화면이 아니라 '이미 준비된 오늘의 글'이 🔒로 보이는 상태(손실 회피) — 누르면 페이월.

export default function TodayCard({
  topic,
  loading,
  credits,
  info,
  onWriteKeyword,
  onGoPerformance,
}: {
  /** 오늘의 글감(추천 1순위) — 로딩 전이면 null */
  topic: { keyword: string; title: string; tag?: string; newsContext?: string; briefText?: string; titleSearch?: string } | null;
  loading: boolean;
  credits: number;
  info: CourseInfo;
  /** 글감으로 쓰기 — 잔액 0이면 상위(DashboardClient)에서 페이월을 띄운다 */
  onWriteKeyword: (keyword: string, title: string, newsContext?: string, briefText?: string, titleSearch?: string) => void;
  /** 오늘 만든 초안 열기(발행 대기 상태) */
  onGoPerformance: () => void;
}) {
  const locked = credits <= 0;
  
  // 코스 20일 완주 → 승인 신청 안내 (★정직: 승인은 네이버 심사라 보장 아님 — 반려 시 재신청 흐름 안내)
  if (info.finished) {
    return (
      <Card>
        <Header label="승인 준비 코스" chip="완주 🎉" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">준비 코스를 완주했어요.<br />애드포스트 신청해볼 차례예요.</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">승인 여부는 네이버 심사(최대 5영업일)가 정해요. 반려돼도 글을 계속 쌓다가 재신청하면 돼요.</p>
        <button onClick={onGoPerformance} className="mt-4 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">
          승인 신청 방법 보기
        </button>
      </Card>
    );
  }

  // 오늘 완료 — 발행까지 끝
  if (info.publishedToday) {
    return (
      <Card>
        <Header label="오늘의 글" chip="완료 ✓" />
        <p className="mt-2 text-[17px] font-bold leading-snug text-neutral-900">오늘 미션 완료!<br />내일 새 글감이 와요.</p>
        {topic && !locked && (
          <button onClick={() => onWriteKeyword(topic.keyword, topic.title, topic.newsContext, topic.briefText, topic.titleSearch)} className="mt-3 w-full rounded-xl bg-neutral-100 py-2.5 text-[13px] font-bold text-neutral-600 transition hover:bg-neutral-200 active:scale-[0.99]">
            한 편 더 쓰기 <span className="font-medium text-neutral-400">· 승인이 빨라져요</span>
          </button>
        )}
      </Card>
    );
  }

  // ★초안 대기 카드 제거 — 발행 전 초안이 있어도 '오늘의 글'엔 신선한 글감을 보여준다(초안은 글 목록에서 접근).

  // 오늘 글 쓰기 전 — 글감 로딩 중
  if (loading || !topic) {
    return (
      <Card>
        <Header label="오늘의 글" chip={(topic?.tag === "issue" || topic?.tag === "trend") ? "🔥 실시간 트렌드" : undefined} />
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="ateflo-skel h-5 w-3/4 rounded" />
          <div className="ateflo-skel h-10 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  // 잠김 — 오늘의 글이 준비돼 있는데 크레딧 0 (D-3 트라이얼 소진 시나리오)
  if (locked) {
    return (
      <Card highlight>
        <Header label="오늘의 글" chip="잠김" chipIcon={<GlassIcon name="lock" tint="grey" size={18} icon={0.7} radius={6} />} />
        <p className="mt-2 flex items-start gap-1.5 text-[16px] font-bold leading-snug text-neutral-400">
          <span aria-hidden>🔒</span>
          <span className="min-w-0 flex-1">{topic.title}</span>
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">오늘의 글이 준비돼 있어요. 크레딧을 충전하면 바로 이어서 써요.</p>
        <button onClick={() => onWriteKeyword(topic.keyword, topic.title, topic.newsContext, topic.briefText, topic.titleSearch)} className="mt-3.5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">
          코스 이어가기
        </button>
      </Card>
    );
  }

  // 기본 — 오늘의 글 쓰기 (코스 시작 전이면 첫 글 = D-1)
  return (
    <Card highlight>
      <Header label="오늘의 글" chip={(topic?.tag === "issue" || topic?.tag === "trend") ? "🔥 실시간 트렌드" : undefined} />
      <p className="mt-2 text-[18px] font-bold leading-snug text-[color:var(--at-grey-900)]">{topic.title}</p>
      {info.day === 0 && <p className="mt-1 text-[12.5px] text-neutral-400">첫 글이 코스 D-1이에요. 위 링이 승인 준비까지 차올라요.</p>}
      <button onClick={() => onWriteKeyword(topic.keyword, topic.title, topic.newsContext, topic.briefText, topic.titleSearch)} className="mt-3.5 w-full rounded-xl bg-[#1D75F7] py-3.5 text-[15px] font-bold text-white transition hover:opacity-90 active:scale-[0.99]">
        이 글 쓰기
      </button>
    </Card>
  );
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-5 ring-1 transition ${highlight ? "ring-[#1D75F7]/25 shadow-[0_10px_30px_-16px_rgba(29,117,247,0.35)]" : "ring-black/[0.04]"}`}>
      {children}
    </div>
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
