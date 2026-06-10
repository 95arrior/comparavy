// SNS 자동 발행 시각 계산 — 하루 발행 수를 '시작 시각 ~ 저녁 상한' 안에서 고르게 분산한다.
// (24시간 균등 분산이면 하루 5개 시 새벽 1시에도 올라가므로, 낮~저녁 창으로 제한)
export const POST_WINDOW_END = 21; // 마지막 발행 시각 상한(KST)

/** 발행 슬롯 시각(KST hour) 목록. 예) start 9, perDay 2 → [9,21] / perDay 5 → [9,12,15,18,21] */
export function slotHours(startHour: number, perDay: number): number[] {
  const n = Math.max(1, Math.min(5, perDay));
  if (n === 1) return [((startHour % 24) + 24) % 24];
  const last = Math.max(startHour, POST_WINDOW_END);
  const span = last - startHour;
  const set = new Set<number>();
  for (let k = 0; k < n; k++) set.add((Math.round(startHour + (span * k) / (n - 1)) % 24 + 24) % 24);
  return [...set].sort((a, b) => a - b);
}

/** 슬롯 사이 최소 간격(시간) — 같은 회차 중복 발행 방지 가드에 사용. */
export function minGapHours(startHour: number, perDay: number): number {
  const n = Math.max(1, Math.min(5, perDay));
  if (n === 1) return 24;
  const last = Math.max(startHour, POST_WINDOW_END);
  const span = last - startHour;
  return Math.max(1, Math.floor(span / (n - 1)));
}
