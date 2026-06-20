// 지역형 사업장 → 사업장 주소(biz_address)에서 지역어를 뽑아 '지역 글감'을 만든다.
// 자연스러움 우선: 검색 의도(지역+업종)를 정조준하되, 무리한 조합은 만들지 않는다.

// 온라인/전국형이라 지역 글감이 어색한 업종·서브 (지역 글감 제외)
const NON_LOCAL_VERTICALS = new Set(["b2b"]);
const NON_LOCAL_SUBS = new Set(["쇼핑몰", "영상편집", "AI교육컨설팅"]);

/** 주소에서 지역어 추출. 우선순위: 구/군 → 동 → (구 없으면)시. 최대 2개(구·동) 반환. */
export function extractRegions(address?: string | null): string[] {
  if (!address) return [];
  const parts = address.trim().split(/\s+/);
  const guTok = parts.find((p) => /^[가-힣]{1,8}(구|군)$/.test(p)); // 강남구, 양평군
  const dongTok = parts.find((p) => /^[가-힣]{1,8}동$/.test(p)); // 역삼동
  const siTok = parts.find((p) => /^[가-힣]{1,8}시$/.test(p) && !/특별시|광역시$/.test(p)); // 성남시(서울특별시 제외)
  const out: string[] = [];
  if (guTok) out.push(guTok.replace(/(구|군)$/, "")); // 강남구 → 강남
  if (dongTok) out.push(dongTok); // 역삼동 (동은 유지 — 검색 그대로)
  if (out.length === 0 && siTok) out.push(siTok.replace(/시$/, "")); // 성남시 → 성남
  return [...new Set(out)].slice(0, 2);
}

/** 카테고리가 지역형인지 판단 (지역어가 있어야 + 전국형 업종/서브가 아니어야). */
export function isLocalBusiness(vertical: string, sub: string | null, regions: string[]): boolean {
  if (regions.length === 0) return false;
  if (NON_LOCAL_VERTICALS.has(vertical)) return false;
  if (sub && NON_LOCAL_SUBS.has(sub)) return false;
  return true;
}

// sub가 없을 때 업종 기반 일반 표현 (general은 sub 없으면 지역 글감 스킵)
const VERTICAL_PHRASE: Record<string, string> = { medical: "병원", academy: "학원", professional: "전문가" };

/** '지역 + 업종' 조합에 쓸 자연스러운 업종 표현. (영어 → 영어학원, 치과 → 치과 …) */
function localServicePhrase(vertical: string, sub: string | null): string | null {
  if (sub) {
    if (vertical === "academy") return sub.endsWith("학원") ? sub : `${sub}학원`;
    return sub; // 치과 · 세무사 · 인테리어 · 필라테스 …
  }
  return VERTICAL_PHRASE[vertical] ?? null;
}

/** 지역 글감 시드 생성: "강남 치과", "역삼동 치과" … (구·동 각각). 자연스러운 것만. */
export function buildLocalSeeds(regions: string[], vertical: string, sub: string | null): string[] {
  const phrase = localServicePhrase(vertical, sub);
  if (!phrase) return [];
  return [...new Set(regions.map((r) => `${r} ${phrase}`))];
}
