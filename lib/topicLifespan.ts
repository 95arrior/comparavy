// ★글감 수명·천장 판정(2026-07-29 전략 회의 — "우리 글감 황금키워드 맞나?").
//  실측 근거(주간 조회수 순위): 전국·상시 글감은 살고(은행 금리비교 136 / 채무탕감 128 / 삼성카드 87),
//  지역·시효·초협소 글감은 죽는다(경남 추경 7 / 루원시티 청약 8 / 대구 꾸러미 10 / 1톤 전기트럭 19).
//  기존 finalGate는 '부적합한 글감'(사칭대출·B2B·민감)을 막는 데 맞춰져 있어 '작은 글감'은 통과시킨다.
//  ★이 파일은 아직 차단하지 않는다 — 측정 전용(로그·진단). 임계는 실측 분포를 보고 정한다.
//   조이는 순간 글감 풀이 얼마나 얇아지는지 모르고 막으면 발행이 멈춘다(유저 판단: 로그 먼저).

/** 광역시는 기존 게이트가 잡지만 '도' 단위는 통과한다(실측: '경남 2차 추경' 주 7회). */
const PROVINCE_RE = /(^|[\s(])(경기|강원|충북|충남|전북|전남|경북|경남|제주)(도)?([\s)]|$|\d)/;
const CITY_RE = /(^|[\s(])(서울|부산|대구|인천|광주|대전|울산|세종)(시)?([\s)]|$|\d)/;

/** 날짜가 박힌 글감 — 쓸 땐 유효하지만 그 날짜가 지나면 죽는다(실측: 루원시티 청약 91 → 8). */
const DATED_RE = /(\d{1,2}\s?월\s?\d{1,2}\s?일|\d{4}\s?년\s?\d{1,2}\s?월\s?\d{1,2}|D-\s?\d+|마감\s?임박|오늘\s?마감|이번\s?주\s?마감)/;
/** 회차·차수형 — 그 회차가 끝나면 같이 죽는다('경남 2차 추경', '제11회 …'). */
const ROUND_RE = /(\d+\s?차(?![가-힣])|제\s?\d+\s?회(?![가-힣])|\d+\s?기(?![가-힣]))/;

export interface LifespanVerdict {
  /** 잡힌 이유들 — 비어 있으면 '전국·상시' 글감 */
  reasons: string[];
  /** 월 검색량(있을 때만) */
  searches: number | null;
}

/**
 * 글감의 수명·천장 판정(차단 아님, 측정용).
 * @param minSearches 천장 임계 — 이 값 미만이면 low_ceiling. 0이면 검색량 판정 생략.
 */
export function scanLifespan(
  keyword: string,
  title: string,
  monthlySearches: number | null | undefined,
  minSearches = 0,
): LifespanVerdict {
  const text = `${keyword ?? ""} ${title ?? ""}`;
  const reasons: string[] = [];
  // 지역 — 도 단위는 새 판정, 광역시는 기존 게이트와 중복이라 따로 표시(중복 계상 방지용 라벨)
  if (PROVINCE_RE.test(text)) reasons.push("province");
  else if (CITY_RE.test(text)) reasons.push("metro_city");
  if (DATED_RE.test(text)) reasons.push("dated");
  if (ROUND_RE.test(text)) reasons.push("round");
  const s = typeof monthlySearches === "number" ? monthlySearches : null;
  if (minSearches > 0 && s !== null && s < minSearches) reasons.push("low_ceiling");
  return { reasons, searches: s };
}

/** 분포 요약 — 임계를 정하려면 평균이 아니라 분위수를 봐야 한다(소수 대형 키워드가 평균을 끌어올린다). */
export function quantiles(values: number[]): { n: number; p10: number; p25: number; p50: number; p75: number; p90: number } | null {
  const v = values.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const at = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor((v.length - 1) * p)))]!;
  return { n: v.length, p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) };
}
