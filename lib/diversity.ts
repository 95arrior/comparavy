// P1-C 콘텐츠 차별화 — 추가 모델 호출 0.
// 같은 사용자가 같은(비슷한) 키워드로 생성해도 매번 다른 구조가 나오도록,
// "생성 전에" 구조 변형을 고른다. SimHash는 사후 기록(모니터링)용일 뿐
// 재생성을 트리거하지 않는다 → 글 1편 = 모델 호출 1번 (마진 불변식).

export interface StructureVariant {
  key: string;
  instruction: string;
}

/** 도입 훅 · 전개 구조 · 관점 조합 풀. 모델 호출 없이 프롬프트로만 다양화. */
export const VARIANTS: StructureVariant[] = [
  { key: "problem", instruction: "도입은 독자가 겪는 구체적인 상황·문제 장면으로 연다. 본문은 문제 → 원인 → 해결 순서로 전개한다." },
  { key: "myth", instruction: "도입은 흔한 오해나 통념을 짚으며 연다. 본문은 핵심 포인트를 중요도 순으로 배치한다." },
  { key: "answer-first", instruction: "도입에서 핵심 답·결론을 먼저 제시한 뒤(역피라미드), 본문에서 근거와 방법을 풀어낸다." },
  { key: "question", instruction: "도입은 독자가 가장 궁금해할 질문을 던지고 바로 답한다. 본문은 그 질문을 확장하는 묶음으로 구성한다." },
  { key: "criteria", instruction: "무엇을 보고 판단해야 하는지 '기준' 중심으로 구성한다. 각 소제목이 하나의 판단 기준이 된다." },
  { key: "mistakes", instruction: "초보자가 흔히 하는 실수와 그 대안을 축으로 구성한다. 각 소제목이 '실수 → 올바른 방법'을 다룬다." },
  { key: "story", instruction: "도입은 짧은 사례·에피소드 장면으로 연다. 본문은 그 사례에서 얻는 포인트로 확장한다." },
  { key: "step", instruction: "전체를 '순서·단계'로 구성한다. 1단계부터 차례대로 따라가게 쓴다." },
  { key: "compare", instruction: "선택지·유형을 나눠 장단점을 비교하는 축으로 구성한다(특정 브랜드 실명 없이 일반 유형으로)." },
  { key: "checklist", instruction: "꼭 확인할 것들을 체크리스트처럼 항목별로 짚어주는 구성으로 쓴다." },
  { key: "case", instruction: "상황·대상·유형별로 나눠(케이스별) 각각에 맞는 정보를 준다." },
  { key: "timeline", instruction: "'시작 전 → 진행 → 이후 관리'의 시간 흐름으로 구성한다." },
];

/** 콘텐츠 '관점·강조점' 축 — 구조(VARIANTS)와 직교. 유저별로 달라 같은 키워드도 강조가 다르게. */
export const ANGLES: string[] = [
  "실전에서 바로 쓰는 구체적인 팁에 깊이를 준다.",
  "완전 초보 눈높이에서 기본 개념부터 차근차근 설명한다.",
  "비용·가성비·시간 같은 현실적 고려사항을 비중 있게 다룬다.",
  "흔한 후회·실수 포인트를 콕 짚어 예방에 무게를 둔다.",
  "직접 해본 듯한 경험·과정 관점에서 생생하게 풀어낸다.",
  "상황·유형별 케이스로 나눠 맞춤 정보를 준다.",
  "자주 묻는 궁금증을 풀어주듯 Q&A 호흡으로 채운다.",
  "준비물·사전 점검 등 '시작 전에 챙길 것'에 무게를 둔다.",
  "요즘 방식·달라진 점 같은 최신 관점을 반영한다.",
  "장기적인 관리·유지 관점까지 넓혀서 다룬다.",
];

export function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 아직 안 쓴 구조 변형을 우선 고른다(같은 키워드에 다른 구조 강제).
 * 모두 썼으면 seed 해시로 회전 선택. 결정론적이라 디버깅도 쉽다.
 */
export function pickVariant(usedSignatures: string[], seed: string): StructureVariant {
  const used = new Set(usedSignatures);
  const unused = VARIANTS.filter((v) => !used.has(v.key));
  const pool = unused.length > 0 ? unused : VARIANTS;
  return pool[hashSeed(seed) % pool.length];
}

/** 유저+키워드 시드로 '관점' 1개 선택 — 구조와 직교라 (구조 12 × 관점 10) 조합으로 같은 키워드도 유저마다 다른 글. */
export function pickAngle(seed: string): string {
  return ANGLES[hashSeed(`angle:${seed}`) % ANGLES.length];
}

// ─── SimHash (근접 중복 모니터링용, 재생성 트리거 아님) ─────────────
// 32비트 구현 — 모니터링 목적이라 충분하고 BigInt가 필요 없다.
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 본문(HTML 제거)의 32비트 SimHash를 16진 문자열로 반환. */
export function simhash(text: string): string {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 3) return "00000000";
  const bits = new Array<number>(32).fill(0);
  for (let i = 0; i < clean.length - 2; i++) {
    const h = fnv1a32(clean.slice(i, i + 3));
    for (let b = 0; b < 32; b++) {
      if ((h >>> b) & 1) bits[b] += 1;
      else bits[b] -= 1;
    }
  }
  let out = 0;
  for (let b = 0; b < 32; b++) if (bits[b] > 0) out |= 1 << b;
  return (out >>> 0).toString(16).padStart(8, "0");
}

/** 두 SimHash 간 해밍 거리(0~32). 작을수록 유사. */
export function hammingDistance(a: string, b: string): number {
  let x = (parseInt(a, 16) ^ parseInt(b, 16)) >>> 0;
  let d = 0;
  while (x) {
    d += x & 1;
    x >>>= 1;
  }
  return d;
}
