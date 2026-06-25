// 업종별 '지역 범위 차등' — 손님 이동 반경에 따라 지역 단위를 다르게.
//  - 동(洞): 도보권 밀착(초중고 학원, 동네의원·소아과, 미용실 등) → '역삼동 영어학원'
//  - 구: 고관여(성형·피부·치과 등) 멀리서도 옴 → '강남 성형외과' (역세권은 주소에 역명이 없어 구로 처리)
//  - 광역/전국: 비대면 가능(법률·세무·노무, 온라인 업종) → 지역 거의 안 잡고 주제 중심
export type RegionLevel = "dong" | "gu" | "wide";

// 온라인/전국형(지역 무의미)
const NON_LOCAL_SUBS = new Set(["쇼핑몰", "영상편집", "AI교육컨설팅"]);
// 커스텀 sub(목록 밖)도 온라인/비대면 성격이면 지역 무의미 → wide. 키워드 신호로 판정.
// (블로그·부업·n잡·온라인 판매·콘텐츠 등. 로컬 업종이 잘못 걸려도 '지역글감 안 붙음'뿐이라 안전)
const ONLINE_HINTS = [
  "블로그", "온라인", "쇼핑몰", "스마트스토어", "스토어", "이커머스", "전자상거래", "셀러",
  "부업", "n잡", "엔잡", "재택", "투잡", "콘텐츠", "유튜브", "유튜버", "인스타", "릴스",
  "마케팅", "수익", "애드센스", "구매대행", "위탁판매", "위탁", "무역", "디지털", "판매대행", "크리에이터",
];
function isOnlineSub(sub: string | null): boolean {
  if (!sub) return false;
  const s = sub.replace(/\s+/g, "");
  return ONLINE_HINTS.some((h) => s.includes(h));
}
// 의료 중 고관여(멀리서도 옴) → 구. 나머지 의원은 동네밀착 → 동.
const MEDICAL_GU = new Set(["성형외과", "피부과", "치과"]);
// 학원 중 전국/온라인 성격 → 광역. 나머지(초중고 교육) → 동.
const ACADEMY_WIDE = new Set(["공무원", "자격증"]);
// 일반업종 중 멀리서도 찾아오는(광역) → 구. 나머지 동네밀착 → 동.
const GENERAL_GU = new Set(["인테리어", "부동산", "결혼웨딩", "이사", "펜션", "도배장판", "도장방수", "철거", "샷시창호", "자동차도장"]);

/** 업종·서브 → 지역 범위 레벨. */
export function regionLevel(vertical: string, sub: string | null): RegionLevel {
  if (vertical === "online" || vertical === "hobby") return "wide"; // 수익형·취미 = 전국형(지역 무의미)
  if (vertical === "professional" || vertical === "b2b") return "wide"; // 법률·세무·노무 등 비대면
  if (sub && (NON_LOCAL_SUBS.has(sub) || isOnlineSub(sub))) return "wide"; // 온라인/블로그/부업 등(커스텀 포함)
  if (vertical === "medical") return sub && MEDICAL_GU.has(sub) ? "gu" : "dong";
  if (vertical === "academy") return sub && ACADEMY_WIDE.has(sub) ? "wide" : "dong";
  if (vertical === "general") return sub && GENERAL_GU.has(sub) ? "gu" : "dong";
  return "gu"; // 애매 → 구 폴백
}

/** 주소에서 시/구/동 토큰 파싱. */
function parseAddress(address: string): { gu?: string; dong?: string; si?: string } {
  const parts = address.trim().split(/\s+/);
  const guTok = parts.find((p) => /^[가-힣]{1,8}(구|군)$/.test(p));
  const dongTok = parts.find((p) => /^[가-힣]{1,8}동$/.test(p));
  const siTok = parts.find((p) => /^[가-힣]{1,8}시$/.test(p) && !/특별시|광역시$/.test(p));
  return {
    gu: guTok ? guTok.replace(/(구|군)$/, "") : undefined, // 강남구 → 강남
    dong: dongTok, // 역삼동 (검색 그대로)
    si: siTok ? siTok.replace(/시$/, "") : undefined, // 성남시 → 성남
  };
}

/** 레벨에 맞는 지역어 추출. 동=동(없으면 구), 구=구(없으면 시), 광역=없음. */
export function extractRegions(address: string | null | undefined, level: RegionLevel): string[] {
  if (level === "wide" || !address) return [];
  const a = parseAddress(address);
  if (level === "dong") {
    const r = a.dong ?? a.gu ?? a.si; // 동 우선, 없으면 구/시로 보수적 폴백
    return r ? [r] : [];
  }
  // gu
  const r = a.gu ?? a.si;
  return r ? [r] : [];
}

/** 지역형(동·구 레벨 + 지역어 있음)인지. 광역/전국은 false → 주제 중심. */
export function isLocalBusiness(level: RegionLevel, regions: string[]): boolean {
  return level !== "wide" && regions.length > 0;
}

/**
 * 주소 → 지역 계층(좁은→넓은). 진행적 확장(오송→흥덕→청주)·타지역 판별에 사용.
 * level=dong(이동 어려움: 유아·초등 학원 등) → [읍/동, 구, 시]
 * level=gu(이동 가능: 성형·인테리어 등)   → [구, 시]  (읍/동은 너무 좁아 제외)
 * 예: "청주시 흥덕구 봉산리" + dong → ["봉산", "흥덕", "청주"] (오송은 AI 별칭으로 별도 보강)
 */
export function addressRegionTiers(address: string | null | undefined, level: RegionLevel = "dong"): string[] {
  if (!address || level === "wide") return [];
  const parts = address.trim().split(/\s+/);
  const out: string[] = [];
  if (level === "dong") {
    const emr = parts.find((p) => /^[가-힣]{2,8}(읍|면|리)$/.test(p)); // 봉산리·오송읍
    if (emr) out.push(emr.replace(/(읍|면|리)$/, ""));
  }
  const a = parseAddress(address);
  if (level === "dong" && a.dong) out.push(a.dong);
  if (a.gu) out.push(a.gu); // 구
  if (a.si) out.push(a.si); // 시 — 진행적 확장의 가장 넓은 단계
  return [...new Set(out)];
}

// sub가 없을 때 업종 기반 일반 표현
const VERTICAL_PHRASE: Record<string, string> = { medical: "병원", academy: "학원" };

/** '지역 + 업종' 조합에 쓸 자연스러운 업종 표현. (영어 → 영어학원, 치과 → 치과 …) */
function localServicePhrase(vertical: string, sub: string | null): string | null {
  if (sub) {
    if (vertical === "academy") return sub.endsWith("학원") ? sub : `${sub}학원`;
    return sub;
  }
  return VERTICAL_PHRASE[vertical] ?? null;
}

/**
 * 지역 글감 시드 생성(좁은→넓은 순): "오송 영어학원", "오송 초등영어", "흥덕 영어학원" …
 * regions는 좁은→넓은 순으로 들어온다고 가정 → 시드도 그 순서(진행적 확장).
 * academy면 대상(유아/초등 등)을 붙인 좁은 검색어도 추가해 동네 데이터를 더 잘 잡는다.
 */
export function buildLocalSeeds(regions: string[], vertical: string, sub: string | null, audiences?: string[]): string[] {
  const phrase = localServicePhrase(vertical, sub);
  if (!phrase) return [];
  const auds = (audiences ?? []).filter((a) => a && a !== "전체" && /^[가-힣]{2,4}$/.test(a));
  const seeds: string[] = [];
  for (const r of regions) {
    seeds.push(`${r} ${phrase}`);
    if (vertical === "academy" && sub) {
      for (const a of auds) seeds.push(`${r} ${a}${sub}`); // "오송 초등영어"
      if (!auds.length) seeds.push(`${r} ${sub}`); // "오송 영어"
    }
  }
  return [...new Set(seeds)];
}
