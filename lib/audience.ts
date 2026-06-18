// 대상(audience) 축 — 검색 심리 글감 1단계(academy 업종부터).
// 사장이 '누구를 가르치나'를 다중 선택으로 저장하고, 글감을 그 대상으로 거른다.
// stage 1: keyword_pool.audience(정밀 분류)는 비어 있어, 키워드 텍스트 휴리스틱(audienceOf)으로 우선 분류.
// stage 2: 풀을 정밀 분류해 pool.audience를 채우면, 라우트가 그 저장값을 우선 사용한다.

export const ACADEMY_AUDIENCES = [
  { value: "유아", label: "유아" },
  { value: "초등", label: "초등" },
  { value: "중고등", label: "중고등" },
  { value: "성인", label: "성인" },
  { value: "전체", label: "전체 (다 가르쳐요)" },
] as const;

export const AUDIENCE_VALUES: Set<string> = new Set(ACADEMY_AUDIENCES.map((a) => a.value));

// "전체" = 필터 해제 신호(특정 대상 아님 → sub 전체에서 뽑음).
export const AUDIENCE_ALL = "전체";

// 키워드 텍스트 → 대상 추정(휴리스틱). 명확한 마커가 없으면 null(중립 = 어느 대상이든 허용).
// stage 1 임시 분류 — 완벽하진 않다(예: 도메인 영어는 마커로 잡되, 못 잡는 건 stage 2 정밀 분류로).
const MARKERS: ReadonlyArray<readonly [string, RegExp]> = [
  ["유아", /유아|영유아|아동|어린이|키즈|누리과정|한글\s?떼기|파닉스|오감|어린이집|유치원|학습지|구몬|방문\s?학습/],
  ["초등", /초등|초딩|방과후/],
  ["중고등", /중등|중학|고등|고교|수능|내신|모의고사|등급컷?|정시|수시|학생부|입시|특목고|자사고/],
  ["성인", /토익|토플|토스|오픽|텝스|비즈니스|금융|무역|회계|항공|승무원|호텔|면접|취업|이직|승진|직장인|왕초보|회화|공무원|자격증|편입|어학연수|스피킹|성인|실무/],
];

export function audienceOf(keyword: string): string | null {
  const k = keyword ?? "";
  for (const [aud, re] of MARKERS) if (re.test(k)) return aud;
  return null;
}
