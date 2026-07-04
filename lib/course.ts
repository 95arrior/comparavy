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
  const publishedToday = todays.some((a) => a.status === "published" || a.status === "verified" || a.status === "pending_verify"); // 낙관: 신고 즉시 미션 완료(게이지는 verified만)
  const hasDraftToday = todays.some((a) => a.status === "draft" || a.status === "copied"); // copied=복사까지 하고 발행 신고 전

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

// ★발행 확인 상태 참조 — 한 곳에 모음. 지금은 자기신고('published'). RSS 검증 배포 시 'verified'로 여기만 바꾸면 전체 반영.
export function isPublishConfirmed(a: CourseArticleLite): boolean {
  return isVerifiedStatus(a.status); // RSS 검증 배포됨 — verified + 자기신고 레거시(published)
}

// 코스 진행 퍼센트(일수 기준, 기존 정의 그대로).
export function coursePercent(info: CourseInfo): number {
  return info.finished ? 100 : Math.round(Math.max(0, Math.min(1, info.day / COURSE_DAYS)) * 100);
}
// '이 글을 쓰면 N%' — 오늘 몫을 채웠을 때 도달 퍼센트(일수 기준). day 0이면 첫 글 → 1일차.
export function nextWritePercent(info: CourseInfo): number {
  return Math.round(Math.max(1, info.day || 1) / COURSE_DAYS * 100);
}
// 어제 발행 확인된 글이 있나(어제 결과 한 줄 조건).
export function yesterdayPublished(articles: CourseArticleLite[], now: Date = new Date()): boolean {
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yk = dayKey(y);
  return (articles ?? []).some((a) => isPublishConfirmed(a) && dayKey(new Date(a.created_at)) === yk);
}

// ★상태 모델 v2 — 완료 판정은 '발행'(claimed) 기준. 생성(draft)은 완료가 아니다.
//  링 진행률도 같은 기준: 오늘 발행 전엔 오늘 몫을 채우지 않는다.
export function progressPercent(info: CourseInfo): number {
  if (info.finished) return 100;
  const effectiveDay = info.publishedToday ? info.day : Math.max(0, info.day - 1);
  return Math.round(Math.max(0, Math.min(1, effectiveDay / COURSE_DAYS)) * 100);
}

// ★RSS 검증 상태 모델 — 게이지·성과는 verified만 인정. 기존 자기신고(published)=verified_legacy 취급(자동 소급 삭제 금지).
export function isVerifiedStatus(status: string): boolean {
  return status === "verified" || status === "published"; // published = 레거시 자기신고(소급 유지)
}
export const VERIFIED_STATUSES = ["verified", "published"] as const;

const normKw = (s: string) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

/** '한 편 더'·오늘의 글 후보 — 오늘 이미 만든 글감 제외 + ★트렌드 명시 우선(배열 순서 의존 제거): 실시간 > 꾸준 > 풀. */
export function pickNextTopic<T extends { keyword: string; tag?: string }>(topics: T[], todayKeywords: string[]): T | null {
  const used = new Set(todayKeywords.map(normKw));
  const avail = topics.filter((t) => !used.has(normKw(t.keyword)));
  const rank = (t: T) => (t.tag === "trend" || t.tag === "issue" ? 0 : t.tag === "steady" ? 1 : 2);
  return avail.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** 같은 글감의 오늘 draft — 있으면 재생성이 아니라 재진입(크레딧 이중 소모 방지). */
export function findTodayDraftByKeyword<A extends { keyword?: string | null; status: string; created_at: string }>(
  articles: A[], keyword: string, now: Date = new Date(),
): A | null {
  const k = normKw(keyword);
  return articles.find((a) => (a.status === "draft" || a.status === "copied") && normKw(a.keyword ?? "") === k && dayKey(new Date(a.created_at)) === dayKey(now)) ?? null;
}

/** 오늘 생성한 글들의 keyword 목록(다음 글감 제외용). */
export function todayKeywords<A extends { keyword?: string | null; status: string; created_at: string }>(articles: A[], now: Date = new Date()): string[] {
  return (articles ?? []).filter((a) => a.status !== "generating" && dayKey(new Date(a.created_at)) === dayKey(now)).map((a) => String(a.keyword ?? "")).filter(Boolean);
}

// ★발행 후 삭제 케이스(규칙): 당일 미션은 유지(이미 수행) — 클라 로컬 플래그(ateflo_pub_{day})가 담당.
//  게이지 카운트 차감은 RSS 삭제 감지/수동 차감 규칙(별도 설계)이 처리. 홈에 별도 표시 없음.
export function localPubFlagKey(now: Date = new Date()): string {
  return `ateflo_pub_${dayKey(now)}`;
}
