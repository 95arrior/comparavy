// ★경제 제도 개정 캘린더(2026-07-17 전략 회의) — 에버그린은 '한 번 쓰면 자산'이 아니라 갱신해야 유지되는 자산.
//  개정 시즌 윈도우가 열리면 그 주제의 오래된 발행 글을 갱신 후보로 자동 선정한다(선정=자동, 재발행=검토 후).
//  시즌 추가·조정은 이 파일 한 곳에서만(게이트 중앙화 원칙과 같은 결).

export interface RevisionSeason {
  key: string;
  label: string;
  months: number[]; // 시즌이 열리는 월(KST, 1~12)
  topicRe: RegExp; // keyword+title 매칭
}

export const REVISION_SEASONS: RevisionSeason[] = [
  { key: "yearend_tax", label: "연말정산 시즌(전년 귀속 신고 준비)", months: [12, 1], topicRe: /(연말정산|세액공제|소득공제|연금저축|IRP|인적공제|월세\s*공제)/i },
  { key: "tax_reform", label: "세법개정안 발표 시즌(7~8월)", months: [7, 8], topicRe: /(세법|양도세|종부세|증여세|상속세|ISA|비과세|금융소득)/i },
  { key: "rate_notice", label: "건보·요율 고시 시즌(8~9월)", months: [8, 9], topicRe: /(건강보험|건보료|장기요양|국민연금\s*보험료|요율)/ },
  { key: "min_wage", label: "최저임금 고시 시즌(7~8월)", months: [7, 8], topicRe: /(최저임금|주휴수당|시급|알바\s*급여)/ },
  { key: "new_year", label: "신년 제도 일괄 변경(1월)", months: [1], topicRe: /(지원금|수당|국민연금|기초연금|육아휴직|출산|청년\s*(도약|월세|내일))/ },
  { key: "property_tax", label: "재산세·종부세 납부 시즌(6·9·12월)", months: [6, 9, 12], topicRe: /(재산세|종부세|보유세|부동산\s*세금)/ },
];

/** 이번 달(1~12, KST) 기준 열려 있는 시즌들. */
export function activeSeasons(month: number): RevisionSeason[] {
  return REVISION_SEASONS.filter((s) => s.months.includes(month));
}

/** keyword·title이 현재 열린 시즌에 걸리면 그 시즌, 아니면 null. */
export function matchSeason(text: string, month: number): RevisionSeason | null {
  return activeSeasons(month).find((s) => s.topicRe.test(text)) ?? null;
}

/** 시즌 인스턴스 키 — 해마다 반복되므로 연도를 붙인다. 연말정산처럼 12월~1월에 걸친 시즌은 1월 쪽 연도로 묶는다(한 인스턴스). */
export function seasonInstanceKey(season: RevisionSeason, now: Date): string {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  let year = kst.getUTCFullYear();
  if (season.months.includes(12) && season.months.includes(1) && kst.getUTCMonth() + 1 === 12) year += 1;
  return `${season.key}:${year}`;
}
