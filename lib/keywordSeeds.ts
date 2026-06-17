// 업종별 시드 키워드 — 이 시드로 네이버 발굴 → keyword_pool 적재(scripts/build-keyword-pool.ts).
// ⚠️ 시드 실제 값은 운영자가 채운다(여기는 구조 + 형식 예시만). 시드가 넓고 다양할수록 풀이 커지고
//    Stage 3에서 1만 사용자에게 안 겹치게 분산하기 좋다.
// 업종 키는 vertical과 동일: medical / academy / professional / general.

export const VERTICAL_SEEDS: Record<string, string[]> = {
  medical: [
    // 예시 형식) "임플란트", "역류성식도염", "라식", "도수치료", "갑상선",
  ],
  academy: [
    // 예시 형식) "수능 국어", "초등 영어", "중등 수학", "논술", "내신 대비",
  ],
  professional: [
    // 예시 형식) "상속세", "증여세", "부당해고", "법인 설립", "양도소득세",
  ],
  general: [
    // 예시 형식) "강아지 분리불안", "캠핑 초보", "홈카페", "원룸 인테리어",
  ],
};
