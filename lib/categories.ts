// 수익형 블로그 카테고리 — 온보딩에서 자유 입력 대신 이 목록 기반 자동완성으로 선택(오타 검색 방지).
// 각 카테고리에 선택적 하위 세부. 최종 저장값(blog_profiles.topic)은 선택한 '리프'(카테고리명 또는 세부명).

export interface Category {
  name: string;
  subs?: string[];
}

export const CATEGORIES: Category[] = [
  { name: "재테크", subs: ["주식", "부동산", "절약", "연금", "가상화폐", "ETF", "예적금"] },
  { name: "부업", subs: ["블로그수익", "스마트스토어", "앱테크", "배달", "쿠팡파트너스", "유튜브"] },
  { name: "반려동물", subs: ["강아지", "고양이", "사료", "훈련", "건강관리"] },
  { name: "요리", subs: ["자취요리", "다이어트요리", "베이킹", "에어프라이어", "밑반찬", "간식"] },
  { name: "여행", subs: ["국내여행", "해외여행", "캠핑", "호캉스", "맛집"] },
  { name: "건강", subs: ["운동", "다이어트", "영양제", "질환", "홈트"] },
  { name: "육아", subs: ["신생아", "이유식", "유아교육", "출산준비", "장난감"] },
  { name: "IT/리뷰", subs: ["스마트폰", "가전", "앱", "가성비템", "노트북"] },
  { name: "정부지원금/생활정보", subs: ["지원금", "복지", "청약", "세금", "공과금"] },
  { name: "뷰티", subs: ["스킨케어", "메이크업", "헤어", "다이어트"] },
  { name: "인테리어", subs: ["셀프인테리어", "가구", "수납", "원룸", "조명"] },
  { name: "자동차", subs: ["신차", "중고차", "관리", "용품"] },
  { name: "교육/자격증", subs: ["자격증", "공무원", "어학", "코딩"] },
  { name: "패션", subs: ["코디", "남성패션", "여성패션", "신발"] },
  { name: "게임", subs: ["모바일게임", "PC게임", "공략", "콘솔"] },
  { name: "결혼/웨딩", subs: ["준비", "예산", "스드메", "신혼집"] },
  { name: "취미", subs: ["사진", "그림", "독서", "식물"] },
  { name: "원예/식물", subs: ["실내식물", "다육이", "텃밭"] },
];

/** 자동완성 후보 한 건. value=최종 저장값(리프), parent=상위(세부일 때) */
export interface CategorySuggestion {
  value: string; // 선택 시 저장될 값 (카테고리명 또는 세부명)
  label: string; // 표시용 ("재테크" 또는 "재테크 › 주식")
  parent?: string;
}

function norm(s: string): string {
  return s.replace(/[\s/·]/g, "").toLowerCase();
}

/** 음절 단위 Levenshtein 거리 — "재태크"↔"재테크" = 1 처럼 오타 보정용. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[m];
}

interface Entry { value: string; label: string; parent?: string; keys: string[] }

// 카테고리 + 세부를 평탄화한 검색 인덱스
const ENTRIES: Entry[] = (() => {
  const out: Entry[] = [];
  for (const c of CATEGORIES) {
    out.push({ value: c.name, label: c.name, keys: [norm(c.name)] });
    for (const s of c.subs ?? []) {
      out.push({ value: s, label: `${c.name} › ${s}`, parent: c.name, keys: [norm(s), norm(c.name + s)] });
    }
  }
  return out;
})();

/**
 * 카테고리 자동완성: 접두/부분일치 우선, 없으면 오타 보정(거리 ≤2)으로 유사어 제안.
 * 반환 순위: 접두(0) < 부분일치(1) < 오타보정(2 + 거리), 카테고리(세부 아님) 약간 우대.
 */
export function searchCategories(query: string, limit = 8): CategorySuggestion[] {
  const q = norm(query);
  if (!q) return CATEGORIES.slice(0, limit).map((c) => ({ value: c.name, label: c.name }));

  const scored: { e: Entry; score: number }[] = [];
  for (const e of ENTRIES) {
    let best = Infinity;
    for (const k of e.keys) {
      if (k.startsWith(q)) best = Math.min(best, 0);
      else if (k.includes(q)) best = Math.min(best, 1);
      else {
        // 오타 보정: 질의 길이 대비 가까우면 후보 (거리 ≤2)
        const d = levenshtein(q, k);
        if (d <= 2 && Math.abs(k.length - q.length) <= 2) best = Math.min(best, 2 + d);
      }
    }
    if (best < Infinity) {
      const isCategory = !e.parent ? -0.3 : 0; // 상위 카테고리 살짝 우대
      scored.push({ e, score: best + isCategory });
    }
  }
  scored.sort((a, b) => a.score - b.score || a.e.label.length - b.e.label.length);
  return scored.slice(0, limit).map(({ e }) => ({ value: e.value, label: e.label, parent: e.parent }));
}

/** 정확히 목록(카테고리·세부)에 있는 값인지 — 최종 저장 전 검증용. */
export function isValidCategory(value: string): boolean {
  const v = norm(value);
  return ENTRIES.some((e) => norm(e.value) === v);
}
