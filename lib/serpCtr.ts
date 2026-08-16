// ★승부처 판정(2026-07-29 유저 실측 — pigtong 3주차: 전 키워드가 5.8~7.9위인데 클릭 0).
//  진단: 순위를 못 잡는 게 아니라 '1페이지 안에서 아래쪽'이다. 모바일에서 7위는 AI 개요+상위3+관련질문에 밀려
//  사실상 2페이지 취급 → 노출은 쌓이는데 클릭이 안 난다. 그래서 화면에 필요한 건 '순위표'가 아니라
//  "지금 밀면 넘어가는 글"의 목록이다.
//  이 파일은 그 판정 규칙 한 곳 — 화면·API가 같은 기준을 쓰게 한다.

/** 구글 검색 순위별 평균 CTR(업계 관측치 근사). 정밀 예측용이 아니라 '어느 글을 먼저 밀지' 순서를 정하는 용도. */
const SERP_CTR: number[] = [0.28, 0.15, 0.11, 0.08, 0.06, 0.05, 0.04, 0.032, 0.028, 0.025];
export function ctrAt(position: number): number {
  if (!Number.isFinite(position) || position < 1) return 0;
  if (position <= 10) return SERP_CTR[Math.round(position) - 1] ?? 0.025;
  if (position <= 20) return 0.01; // 2페이지 — 사실상 클릭 없음
  return 0.003;
}

/** 승부처 구간 — 1페이지에 걸쳐 있으나 상위 3 밖(= 밀면 넘어가는 자리). 3위 안은 이미 이겼고, 10위 밖은 아직 이르다. */
export const PUSH_MIN = 3.5;
export const PUSH_MAX = 10.5;
export function isPushable(position: number): boolean {
  return position >= PUSH_MIN && position <= PUSH_MAX;
}

/** 3위까지 올렸을 때 늘어날 것으로 기대되는 클릭 수 — 화력 배분 순서를 정하는 점수. */
export function pushGain(impressions: number, position: number, target = 3): number {
  const gain = ctrAt(target) - ctrAt(position);
  return gain <= 0 ? 0 : impressions * gain;
}

// ★제로클릭 정의형(2026-07-17 AI 브리핑 전략과 같은 규칙) — 1위를 해도 AI 개요가 답을 끝내 클릭이 안 남는 검색어.
//  성과 집계에서 빼야 '올릴 수 있는 글'이 가려지지 않는다. 실측(2026-07-29): '국채금리란'·'국채 뜻' 노출 9회·클릭 0.
//  '~란'은 '대란·혼란·파란'류 오검출을 피해 고정 길이 제외만 둔다(가변 lookbehind 금지 — Safari 파싱 사망).
const ZERO_CLICK_RE = /(뜻(?![가-힣])|무슨\s?뜻|정의(?![가-힣])|영어로(?![가-힣])|약자(?![가-힣])|무엇인가요?(?![가-힣])|뭔가요|뭐예요|(?<![대혼소파광])란(?![가-힣]))/;
const CASE_BRANCH_RE = /(계산(?!기)|비교|차이|방법|조건|기준(?![가-힣])|구간|사례|시뮬|얼마나|장단점|활용|절세)/;
/** 정의만 묻는 검색어인가(케이스 분기 신호가 있으면 구제 — '연말정산 뜻과 계산 방법'은 클릭이 남는다). */
export function isZeroClickQuery(query: string): boolean {
  const q = String(query || "");
  return ZERO_CLICK_RE.test(q) && !CASE_BRANCH_RE.test(q);
}
