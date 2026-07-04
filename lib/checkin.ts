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
