// 키워드 예약 큐 공통.

export interface QueueItem {
  id: string;
  keyword: string;
  status: string; // queued | generating | done | failed
  scheduled_for: string | null; // YYYY-MM-DD
  article_id: string | null;
  position: number;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 발행 예정일 자동 분산: 오늘부터 첫 3일은 하루 2개, 이후 하루 1개.
 * (초반에 몰아서 블로그를 빨리 키우고, 이후 꾸준히)
 */
export function distributeDates(count: number, start: Date = new Date()): string[] {
  const out: string[] = [];
  let dayOffset = 0;
  let usedToday = 0;
  for (let i = 0; i < count; i++) {
    const cap = dayOffset < 3 ? 2 : 1; // 첫 3일 2개/일, 이후 1개/일
    if (usedToday >= cap) {
      dayOffset++;
      usedToday = 0;
    }
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    out.push(toYMD(d));
    usedToday++;
  }
  return out;
}
