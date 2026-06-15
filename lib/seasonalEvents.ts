// 한국 시즌/이벤트 — 다가오는 시즌을 "지금 쓰면 선점" 으로 알린다. (외부 API 없음, 하드코딩)
// categories는 대분류(lib/categories.ts) 이름. 비어 있으면 모든 카테고리에 노출.

interface SeasonEvent {
  name: string;
  emoji: string;
  message: string;
  categories: string[]; // 빈 배열 = 전체
  month?: number; // 매년 반복(월)
  day?: number; // 매년 반복(일)
  dates?: string[]; // 음력 등 연도별 명시(yyyy-mm-dd)
}

const EVENTS: SeasonEvent[] = [
  { name: "연말정산", emoji: "🧾", message: "절세·환급 글을 지금 쓰면 검색 선점!", categories: ["재테크", "부업", "정부지원금/생활정보"], month: 1, day: 15 },
  { name: "새해 다이어트", emoji: "🏃", message: "새해 결심 시즌 — 다이어트·운동 검색 폭증", categories: ["건강", "뷰티", "요리"], month: 1, day: 1 },
  { name: "발렌타인데이", emoji: "🍫", message: "초콜릿·선물 키워드가 뜨는 시기", categories: ["요리", "뷰티"], month: 2, day: 14 },
  { name: "봄 이사철", emoji: "📦", message: "이사철 — 부동산·인테리어 수요 상승", categories: ["재테크", "인테리어"], month: 3, day: 1 },
  { name: "환절기 건강", emoji: "🌿", message: "환절기 — 건강관리 키워드 챙길 때", categories: ["건강", "반려동물"], month: 3, day: 1 },
  { name: "어린이날", emoji: "🎈", message: "선물·나들이 키워드 미리 선점", categories: ["육아"], month: 5, day: 5 },
  { name: "종합소득세 신고", emoji: "💸", message: "종소세 마감 — 환급·절세 검색 급증", categories: ["재테크", "부업"], month: 5, day: 31 },
  { name: "여름 휴가철", emoji: "🏖️", message: "여행·캠핑 검색이 가장 뜨거운 시기", categories: ["여행", "자동차"], month: 7, day: 15 },
  { name: "반려동물 여름나기", emoji: "🐶", message: "더위·관리 키워드 수요 상승", categories: ["반려동물"], month: 7, day: 1 },
  { name: "부가세 신고", emoji: "🧮", message: "사업자 부가세 — 자영업 키워드", categories: ["부업"], month: 7, day: 25 },
  { name: "추석 연휴", emoji: "🌕", message: "차례·선물·귀성 키워드", categories: ["요리", "여행", "재테크"], dates: ["2026-09-25"] },
  { name: "가을 이사철", emoji: "🍂", message: "이사철 — 부동산·인테리어 수요 상승", categories: ["재테크", "인테리어"], month: 10, day: 1 },
  { name: "수능", emoji: "✏️", message: "수능 시즌 — 교육·입시 키워드", categories: ["교육/자격증", "육아"], month: 11, day: 13 },
  { name: "김장철", emoji: "🥬", message: "김치·밑반찬 요리 키워드 시즌", categories: ["요리"], month: 11, day: 15 },
  { name: "블랙프라이데이", emoji: "🛍️", message: "쇼핑·리뷰 검색 급증 — 리뷰 글 선점", categories: ["IT/리뷰", "패션", "뷰티"], month: 11, day: 29 },
  { name: "연말 분양/청약", emoji: "🏗️", message: "연말 분양 — 청약 키워드", categories: ["재테크"], month: 12, day: 1 },
  { name: "설 연휴", emoji: "🎍", message: "설 차례·세뱃돈·귀성 키워드", categories: ["요리", "여행", "재테크"], dates: ["2026-02-17"] },
];

export interface UpcomingEvent {
  name: string;
  emoji: string;
  message: string;
  dday: number; // 며칠 남음
  dateLabel: string; // "M/D"
}

function nextDate(e: SeasonEvent, today: Date): Date | null {
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  if (e.dates && e.dates.length) {
    const future = e.dates.map((d) => new Date(d + "T00:00:00")).filter((d) => d.getTime() >= t.getTime()).sort((a, b) => a.getTime() - b.getTime());
    return future[0] ?? null;
  }
  if (e.month && e.day) {
    let d = new Date(t.getFullYear(), e.month - 1, e.day);
    if (d.getTime() < t.getTime()) d = new Date(t.getFullYear() + 1, e.month - 1, e.day);
    return d;
  }
  return null;
}

/** 카테고리에 맞는 '다가오는' 이벤트(향후 windowDays 내) D-day 순. */
export function upcomingEvents(category: string | null, today: Date = new Date(), windowDays = 60, limit = 4): UpcomingEvent[] {
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  const out: UpcomingEvent[] = [];
  for (const e of EVENTS) {
    if (e.categories.length && category && !e.categories.includes(category)) continue;
    const d = nextDate(e, t);
    if (!d) continue;
    const dday = Math.round((d.getTime() - t.getTime()) / 86400000);
    if (dday < 0 || dday > windowDays) continue;
    out.push({ name: e.name, emoji: e.emoji, message: e.message, dday, dateLabel: `${d.getMonth() + 1}/${d.getDate()}` });
  }
  out.sort((a, b) => a.dday - b.dday);
  return out.slice(0, limit);
}
