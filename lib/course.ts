// 애드포스트 승인 코스 — '오늘 할 일 카드'의 상태 계산 (순수 함수, 클라 공용).
// 코스 = 첫 글 생성일이 D-1, 20일간 매일 발행(권장 공식: 꾸준함 → 방문자 → 다음 달 초 승인 신청).
// 서버 컬럼 없이 articles만으로 파생 — 크로스 디바이스 일관(글은 DB에 있으니까).

export const COURSE_DAYS = 20;

export interface CourseArticleLite {
  status: string;
  created_at: string;
}

export interface CourseInfo {
  /** 코스 진행일(1~20). 0 = 아직 첫 글 전(코스 시작 전) */
  day: number;
  /** 코스 20일을 다 채웠나 (승인 신청 안내 단계) */
  finished: boolean;
  /** 오늘 만든 글 수(생성 중 제외) */
  todayCount: number;
  /** 오늘 만든 글 중 발행됨 존재 → 오늘 미션 완료 */
  publishedToday: boolean;
  /** 오늘 만든 글 중 아직 초안(발행 대기) 1건 인덱스용 created_at — 없으면 null */
  hasDraftToday: boolean;
  /** 연속 일수(오늘 또는 어제까지 이어진, 하루 1편 이상 만든 날) */
  streak: number;
}

function dayKey(d: Date): string {
  // 로컬(KST) 기준 날짜 키
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function courseInfo(articles: CourseArticleLite[], now: Date = new Date()): CourseInfo {
  const real = (articles ?? []).filter((a) => a.status !== "generating");
  if (real.length === 0) {
    return { day: 0, finished: false, todayCount: 0, publishedToday: false, hasDraftToday: false, streak: 0 };
  }

  // 코스 시작 = 가장 오래된 글의 날짜
  let firstMs = Infinity;
  for (const a of real) {
    const t = new Date(a.created_at).getTime();
    if (t < firstMs) firstMs = t;
  }
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const rawDay = Math.floor((startOfDay(now) - startOfDay(new Date(firstMs))) / 86400000) + 1;
  const day = Math.max(1, Math.min(COURSE_DAYS, rawDay));
  const finished = rawDay > COURSE_DAYS;

  const todayK = dayKey(now);
  const todays = real.filter((a) => dayKey(new Date(a.created_at)) === todayK);
  const publishedToday = todays.some((a) => a.status === "published");
  const hasDraftToday = todays.some((a) => a.status === "draft");

  // 연속 일수 — 오늘 안 썼으면 어제부터 카운트(오늘 쓰면 이어짐)
  const daysWithArticle = new Set(real.map((a) => dayKey(new Date(a.created_at))));
  let streak = 0;
  const cur = new Date(now);
  if (!daysWithArticle.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  while (daysWithArticle.has(dayKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  return { day, finished, todayCount: todays.length, publishedToday, hasDraftToday, streak };
}
