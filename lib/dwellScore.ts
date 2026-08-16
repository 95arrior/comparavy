// ★체류 프록시(FF_DWELL_SCORE §3) — "이 글감이 체류 시간이 긴 본문이 될 수 있는가"의 결정론 판정.
//  스펙의 'Haiku 스코어러'는 실재하지 않아(돈+행동 스코어=정규식) 승인된 대안: 코드 휴리스틱 1차.
//  기존 스코어 함수 무수정 — 호출측이 별도 가산(§0-2). 골든 케이스: scripts/check-dwell.mjs
export type DwellPotential = 2 | 1 | 0 | -1;

// +2: 계산·시뮬레이션·조건별 비교가 본문의 중심이 될 수 있는 글감
const CALC_RE = /(계산|얼마나?\s?(내|받|나오)|환급액|세율|이자|금리\s?(비교|높은)|수익률|시뮬|모의|유불리|손익|절세|공제\s?(한도|액)|월\s?납입|대출\s?한도|비교(?![가-힣])|케이스별|조건별|유형별)/;
// +1: 단계별 절차·표 정리가 가능한 글감
const STEP_RE = /(신청\s?(방법|절차|순서)|서류|준비물|자격\s?(요건|조건)|가입\s?방법|개설|만드는\s?법|하는\s?법|체크리스트|순서대로)/;
// -1: 날짜·사실 확인 한 줄이면 끝나는 글감
const ONELINE_RE = /(언제(부터|까지)?\s*$|날짜\s*$|발표일|디데이|몇\s?시|영업시간|휴무일|위치\s*$|전화번호)/;

export function dwellPotential(text: string): DwellPotential {
  const t = (text || "").trim();
  if (!t) return 0;
  if (CALC_RE.test(t)) return 2;
  if (STEP_RE.test(t)) return 1;
  if (ONELINE_RE.test(t)) return -1;
  return 0;
}

/** dwell +2 글감의 브리프에 붙는 본문 지시(§3) — 증식층이 briefText에 이어 붙인다. */
export const DWELL_BRIEF_DIRECTIVE =
  "[체류 지시] 이 글감은 계산·비교가 핵심이다 — 본문에 구체 숫자 계산 예시 또는 조건별 비교(표)를 반드시 포함하라. 독자가 자기 케이스를 대입해볼 수 있어야 한다.";
