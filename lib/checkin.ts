// ★수익 대시보드 계산 — 유저 '입력 데이터만'. 미입력 수익의 추정·예측 생성 절대 금지.
//  페이스 외삽은 실데이터 기반 + '달라질 수 있어요' 문구가 있을 때만 허용(호출측 책임).
export interface CheckinRow { day: string; visitors: number | null; revenue: number | null }

export function totalRevenue(rows: CheckinRow[]): number {
  return rows.reduce((a, r) => a + (r.revenue ?? 0), 0);
}
/** 글당 평균 = 누적 수익 / 발행 확인 글 수. 분모 0 또는 수익 입력 0건이면 null(표시 안 함). */
export function avgPerPost(rows: CheckinRow[], publishedCount: number): number | null {
  const t = totalRevenue(rows);
  const hasAny = rows.some((r) => (r.revenue ?? 0) > 0);
  if (!hasAny || publishedCount <= 0) return null;
  return Math.round(t / publishedCount);
}
/** 이번 달 페이스 = (이번 달 입력 수익 합 ÷ 입력 일수) × 이번 달 일수. 입력 3일 미만이면 null(과장 방지). */
export function monthPace(rows: CheckinRow[], now: Date = new Date()): number | null {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = rows.filter((r) => r.day.startsWith(ym) && r.revenue !== null && r.revenue !== undefined);
  if (month.length < 3) return null;
  const sum = month.reduce((a, r) => a + (r.revenue ?? 0), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((sum / month.length) * daysInMonth / 100) * 100; // 백원 단위 라운딩("약 N원대")
}

// ★크레딧 소진 예측 — 유저 '실사용 페이스'(최근 7일 생성 편수) 기반. 페이스 0이면 예측 근거 없음 → null(지어내기 금지).
export function depletionForecast(
  credits: number, generateCost: number,
  articles: { status: string; created_at: string }[], now: Date = new Date(),
): { daysLeft: number; weekday: string; postsLeft: number } | null {
  const postsLeft = Math.floor(credits / generateCost);
  if (postsLeft <= 0) return null;
  const weekAgo = now.getTime() - 7 * 86400000;
  const recent = (articles ?? []).filter((a) => a.status !== "generating" && new Date(a.created_at).getTime() >= weekAgo).length;
  if (recent === 0) return null; // 최근 사용 없음 — 페이스 산정 불가
  const dailyPace = recent / 7;
  const daysLeft = Math.max(1, Math.ceil(postsLeft / dailyPace));
  if (daysLeft > 14) return null; // 2주 넘게 남으면 배너 소음
  const d = new Date(now); d.setDate(d.getDate() + daysLeft);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + "요일";
  return { daysLeft, weekday, postsLeft };
}

// ★진단 분기 — 최근 '입력된' 3일이 연속 방문자 0 + 그 기간 발행이 있으면 노출 점검 카드.
//  원인 단정 금지 — 확인 행동만 안내(카드 카피는 컴포넌트).
export function threeDayZeroWithPosts(
  rows: CheckinRow[],
  articles: { status: string; created_at: string }[],
  now: Date = new Date(),
): boolean {
  const withV = rows.filter((r) => r.visitors !== null && r.visitors !== undefined).slice(-3);
  if (withV.length < 3) return false;
  if (!withV.every((r) => (r.visitors ?? 0) === 0)) return false;
  const from = new Date(withV[0].day + "T00:00:00").getTime();
  const hasPub = (articles ?? []).some((a) => a.status === "published" && new Date(a.created_at).getTime() >= from && new Date(a.created_at).getTime() <= now.getTime());
  return hasPub;
}

// ★증폭 — 배합 가중 학습(유저 입력 신호만). 상한·하한 필수: 한 유형 독점 금지 + 다양성 하한.
import { MIX_WEIGHT_STEP, MIX_WEIGHT_CAP, MIX_WEIGHT_FLOOR, SPIKE_RATIO, SPIKE_MIN_VISITORS, ATTACK_UNLOCK } from "./scoreWeights";
export type MixWeights = Record<string, number>;
export function bumpMixWeight(cur: MixWeights | null | undefined, type: string): MixWeights {
  const w = { ...(cur ?? {}) };
  w[type] = Math.min(MIX_WEIGHT_CAP, (w[type] ?? 1) + MIX_WEIGHT_STEP);
  for (const k of Object.keys(w)) w[k] = Math.max(MIX_WEIGHT_FLOOR, Math.min(MIX_WEIGHT_CAP, w[k]));
  return w;
}
/** 체크인 급등 — 최근 7일(오늘 제외) 평균 대비 SPIKE_RATIO배 + 절대 최소. 표본 3일 미만이면 false(오탐 방지). */
export function isSpike(todayVisitors: number | null, prevRows: CheckinRow[]): boolean {
  if (todayVisitors === null || todayVisitors < SPIKE_MIN_VISITORS) return false;
  const prev = prevRows.map((r) => r.visitors).filter((v): v is number => v !== null && v !== undefined).slice(-7);
  if (prev.length < 3) return false;
  const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
  return avg > 0 && todayVisitors >= avg * SPIKE_RATIO;
}
/** 공격 모드 잠금해제 — 발행 확인 30편+ & 승인 완료 & 최근 7일 일평균 3편 페이스. */
export function attackEligible(verifiedCount: number, approved: boolean, articlesLast7: number): boolean {
  return verifiedCount >= ATTACK_UNLOCK.minVerified && (approved || !ATTACK_UNLOCK.needApproved) && articlesLast7 / 7 >= ATTACK_UNLOCK.recentDailyPace;
}
