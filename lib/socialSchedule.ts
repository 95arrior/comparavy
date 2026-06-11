// SNS 자동 발행 시각 계산 — '시작 시각'부터 '발행 간격(N시간)'마다 하루 발행 수만큼.
// 예) 시작 9시 · 간격 12시간 · 2개 → [9, 21] / 시작 9시 · 간격 4시간 · 3개 → [9, 13, 17]

/** 발행 슬롯 시각(KST hour) 목록. */
export function slotHours(startHour: number, perDay: number, gapHours: number): number[] {
  const n = Math.max(1, Math.min(5, perDay));
  const gap = clampGap(gapHours);
  const set = new Set<number>();
  for (let k = 0; k < n; k++) set.add((((startHour + k * gap) % 24) + 24) % 24);
  return [...set].sort((a, b) => a - b);
}

/** 발행 간격(시간) — 1~12로 보정(레거시 24 등도 안전하게). */
export function clampGap(gapHours: number): number {
  return Math.max(1, Math.min(12, gapHours || 12));
}

/** 슬롯 사이 최소 간격(시간) — 같은 회차 중복 발행 방지 가드에 사용. */
export function minGapHours(gapHours: number): number {
  return clampGap(gapHours);
}
