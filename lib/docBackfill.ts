// ★문서수(blog_total) 백필 — 판정 로직만(HTTP·DB 없음, 그래서 테스트가 가능하다).
//  배경(2026-08-04 실측): 신생 밴드 안 2,864개 중 1,821개(64%)가 blog_total 미측정이었다.
//  미측정은 밴드 상한 쿼리를 그냥 통과하므로, 상한을 아무리 조여도 실제로는 작동하지 않는다.
//  ★그리고 이 백필의 두 번째 목적은 '상한을 얼마로 둘 것인가'의 근거를 만드는 것이다 —
//   측정된 1,043개 중 1,000 미만이 5개뿐이었다. 감이 아니라 분포를 보고 정해야 한다.

/** 상한 후보별 생존 수를 센다 — 백필 결과가 곧 '상한을 얼마로 둘까'의 근거표가 된다. */
export const DOC_BUCKETS = [1000, 2000, 3000, 5000, 10000, 30000] as const;

export function bucketByDocMax(values: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of DOC_BUCKETS) out[`~${b.toLocaleString("en-US")}`] = values.filter((v) => v < b).length;
  out["그 이상"] = values.filter((v) => v >= DOC_BUCKETS[DOC_BUCKETS.length - 1]).length;
  return out;
}

/**
 * 측정 순서 = 서빙 순서(topics의 fetchPool과 같은 정렬: 덜 쓰인 것 우선 → 검색량 높은 것).
 * 같은 키워드가 여러 sub에 중복 저장돼 있으므로 키워드 단위로 합친다 — 한 번 재면 전 sub가 채워진다.
 */
export function nextTargets<T extends { keyword: string; times_assigned?: number | null; monthly_searches?: number | null }>(
  rows: T[],
  limit: number,
): T[] {
  const seen = new Set<string>();
  return rows
    .slice()
    .sort((a, b) => (a.times_assigned ?? 0) - (b.times_assigned ?? 0) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
    .filter((r) => { const k = r.keyword.trim(); if (!k || seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, Math.max(0, limit));
}

/**
 * ★죽은 API 앞에서 헛돌지 않는다. fetchBlogTotal은 권한 없음·쿼터 초과·네트워크 실패를 전부 null로 준다 —
 *  '측정했더니 없음'과 구분이 안 되므로, 연속 실패가 쌓이면 중단하고 그 사실을 응답에 남긴다.
 *  (0으로 조용히 넘어가면 다음 사람이 '백필 돌았는데 왜 그대로지'를 처음부터 다시 판다.)
 */
export const ABORT_AFTER_FAILS = 10;
export function shouldAbort(consecutiveFails: number, cap = ABORT_AFTER_FAILS): boolean {
  return consecutiveFails >= cap;
}
