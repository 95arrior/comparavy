// 수익형 블로그 카테고리 — 대분류 + 세부(소분류). 온보딩에서 대분류 선택 → 세부 선택으로 좁힌다.
// 세부를 고르면 그 범위로 키워드 발굴(검색어 topic = 세부). "전체"면 대분류 전반(topic = 대분류).

export interface Category {
  name: string;
  subs: string[];
}

export const CATEGORIES: Category[] = [
  { name: "재테크", subs: ["부동산", "주식", "절약", "연금", "대출"] },
  { name: "부업", subs: ["블로그수익", "스마트스토어", "앱테크", "배달", "유튜브"] },
  { name: "반려동물", subs: ["강아지", "고양이", "기타"] },
  { name: "요리", subs: ["한식", "베이킹", "자취요리", "다이어트식"] },
  { name: "여행", subs: ["국내여행", "해외여행", "캠핑", "맛집"] },
  { name: "건강", subs: ["운동", "다이어트", "영양제", "질환"] },
  { name: "육아", subs: ["신생아", "이유식", "유아교육", "출산준비"] },
  { name: "IT/리뷰", subs: ["스마트폰", "가전", "앱", "노트북"] },
  { name: "정부지원금/생활정보", subs: ["지원금", "복지", "청약", "세금"] },
  { name: "뷰티", subs: ["스킨케어", "메이크업", "헤어"] },
  { name: "인테리어", subs: ["셀프인테리어", "가구", "수납", "원룸"] },
  { name: "자동차", subs: ["신차", "중고차", "관리", "용품"] },
  { name: "교육/자격증", subs: ["자격증", "공무원", "어학", "코딩"] },
  { name: "패션", subs: ["코디", "남성패션", "여성패션"] },
  { name: "게임", subs: ["모바일게임", "PC게임", "공략"] },
  { name: "결혼/웨딩", subs: ["준비", "예산", "신혼집"] },
  { name: "취미", subs: ["사진", "그림", "독서"] },
  { name: "원예/식물", subs: ["실내식물", "다육이", "텃밭"] },
];

export const ALL_SUB = "전체"; // 세부 미지정 = 대분류 전반

/** 세부 칩 목록: ["전체", ...subs] */
export function subsOf(category: string): string[] {
  const c = CATEGORIES.find((x) => x.name === category);
  return c ? [ALL_SUB, ...c.subs] : [ALL_SUB];
}

/** 정확히 대분류 목록에 있는 이름인지. */
export function isTopCategory(name: string): boolean {
  const v = norm(name);
  return CATEGORIES.some((c) => norm(c.name) === v);
}

export interface CategorySuggestion {
  value: string;
  label: string;
  parent?: string;
}

function norm(s: string): string {
  return s.replace(/[\s/·]/g, "").toLowerCase();
}

/** 음절 단위 Levenshtein — "재태크"↔"재테크" = 1 (오타 보정). */
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

function buildEntries(topOnly: boolean): Entry[] {
  const out: Entry[] = [];
  for (const c of CATEGORIES) {
    out.push({ value: c.name, label: c.name, keys: [norm(c.name)] });
    if (!topOnly) {
      for (const s of c.subs) {
        out.push({ value: s, label: `${c.name} › ${s}`, parent: c.name, keys: [norm(s), norm(c.name + s)] });
      }
    }
  }
  return out;
}

const ENTRIES_TOP = buildEntries(true);
const ENTRIES_ALL = buildEntries(false);

/**
 * 카테고리 자동완성: 접두/부분일치 우선, 없으면 오타 보정(거리 ≤2) 유사어 제안.
 * topOnly=true면 대분류만(세부는 칩으로 고름).
 */
export function searchCategories(query: string, opts?: { topOnly?: boolean; limit?: number }): CategorySuggestion[] {
  const topOnly = opts?.topOnly ?? false;
  const limit = opts?.limit ?? 8;
  const entries = topOnly ? ENTRIES_TOP : ENTRIES_ALL;
  const q = norm(query);
  if (!q) return entries.slice(0, limit).map((e) => ({ value: e.value, label: e.label, parent: e.parent }));

  const scored: { e: Entry; score: number }[] = [];
  for (const e of entries) {
    let best = Infinity;
    for (const k of e.keys) {
      if (k.startsWith(q)) best = Math.min(best, 0);
      else if (k.includes(q)) best = Math.min(best, 1);
      else {
        const d = levenshtein(q, k);
        if (d <= 2 && Math.abs(k.length - q.length) <= 2) best = Math.min(best, 2 + d);
      }
    }
    if (best < Infinity) scored.push({ e, score: best + (e.parent ? 0 : -0.3) });
  }
  scored.sort((a, b) => a.score - b.score || a.e.label.length - b.e.label.length);
  return scored.slice(0, limit).map(({ e }) => ({ value: e.value, label: e.label, parent: e.parent }));
}

/** 목록(대분류·세부) 어디든 있는 값인지. */
export function isValidCategory(value: string): boolean {
  const v = norm(value);
  return ENTRIES_ALL.some((e) => norm(e.value) === v);
}
