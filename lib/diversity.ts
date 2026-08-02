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
  "과정·단계를 순서대로 구체적이고 생생하게 풀어낸다(없는 개인 경험은 지어내지 않음).",
  "상황·유형별 케이스로 나눠 맞춤 정보를 준다.",
  "자주 묻는 궁금증을 풀어주듯 Q&A 호흡으로 채운다.",
  "준비물·사전 점검 등 '시작 전에 챙길 것'에 무게를 둔다.",
  "요즘 방식·달라진 점 같은 최신 관점을 반영한다.",
  "장기적인 관리·유지 관점까지 넓혀서 다룬다.",
];

export function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── 근접 중복 판정(2026-07-24 유저: "중복 빡세게 잡아줘") ───────────────
// 표면 변주(수식어 인픽스 '통장', 조사·어순·연도)만 다른 '사실상 같은 글감'을 잡는다.
// 실측 실패 쌍: 'CMA 추천'(7/24) ↔ 'CMA통장 추천'(7/17) — 기존 정확일치·앞4자·5-gram·bigram이
//  전부 인픽스 '통장'에 어긋나 통과. 코어 명사로 환원해 비교하면 cma==cma로 잡힌다.
// 수식어(각도·형식어) 목록 — 이게 있고 없고는 '검색자군'을 바꾸지 않는다(코어 명사가 같으면 같은 글).
const DUP_MODIFIER_RE = /(통장|추천|방법|하는\s?법|후기|비교|정리|총정리|완전정리|순위|종류|유형별|유형|가격|이유|조건|기준|신청|대상|자격|혜택|알아보기|안내|정보|가입|개설|만들기|바로가기|총|완전)/g;
// 코어 비교 시 무시할 일반 토큰(수식·행정 공통어) — 이것만 겹치는 건 '같은 글'이 아니다.
const DUP_GENERIC_TOK = new Set(["지원금", "지원", "신청", "방법", "정리", "총정리", "조건", "기간", "확인", "세금", "혜택", "정부", "정부지원금", "보조금", "금리", "대출", "연금", "청약", "추천", "통장", "비교", "순위", "종류", "유형", "유형별", "2025", "2026"]);

/** 수식어·공백·문장부호·숫자를 걷어낸 '코어 명사 키'. 두 글감의 코어가 같으면 같은 검색자군으로 본다. */
export function coreKey(s: string): string {
  const base = String(s ?? "")
    .toLowerCase()
    .replace(/[\s]+/g, "")
    .replace(/[.,!?~·…'"“”‘’()[\]{}<>|/\\:;\-—_+*#%]/g, "")
    .replace(/\d+년?/g, ""); // 연도·숫자 제거('2026년 유형별' ↔ '유형별')
  return base.replace(DUP_MODIFIER_RE, "");
}

// bigram Dice(0~1) — 거의 같은 문장 판별용. 짧은 금융어 오탐(정기예금↔정기적금) 방지로 임계는 보수적.
function bigramDice(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[\s]+/g, "").replace(/[.,!?~·…'"“”‘’()[\]{}<>|/\\:;\-—_+*#%]/g, "");
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s: string) => { const g = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); g.set(k, (g.get(k) ?? 0) + 1); } return g; };
  const ga = grams(x), gb = grams(y);
  let inter = 0; for (const [k, v] of ga) inter += Math.min(v, gb.get(k) ?? 0);
  return (2 * inter) / (Math.max(1, x.length - 1) + Math.max(1, y.length - 1));
}

/** 두 글감(키워드·제목)이 '사실상 같은 글'인가 — 표면 변주만 다르면 true. */
export function nearDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  // 1) 코어 명사 정확 일치 — 수식어 인픽스만 다른 쌍(CMA추천 ↔ CMA통장추천)의 핵심 방어.
  const ca = coreKey(a), cb = coreKey(b);
  if (ca.length >= 2 && cb.length >= 2 && ca === cb) return true;
  // 2) 거의 같은 문장(제목 통째 유사) — 오탐 방지로 보수적 임계.
  if (bigramDice(a, b) >= 0.62) return true;
  // 3) 비수식어 핵심 토큰 2개 이상이 (포함 매칭) 겹침 — 어순·조사 변주 방어.
  const toks = (t: string) => t.replace(/[^가-힣a-z0-9 ]/gi, " ").split(/\s+/).filter((w) => w.length >= 2 && !DUP_GENERIC_TOK.has(w));
  const at = toks(a), bt = toks(b);
  const small = at.length <= bt.length ? at : bt, big = at.length <= bt.length ? bt : at;
  if (small.length >= 2) {
    const hit = small.filter((w) => big.some((x) => x === w || x.includes(w) || w.includes(x))).length;
    if (hit >= 2 && hit / small.length >= 0.6) return true;
  }
  return false;
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

// ★같은 상품군 판정(2026-08-02 유저 화면 실측 — 보드에 이 둘이 같이 떴다):
//   "연금펀드로 노후자금 준비, 수익률과 수수료 비교"
//   "연금저축펀드 가입 전 수수료와 수익률 비교"
//  거의 같은 글인데 nearDuplicate가 못 잡았다(코어 환원이 인픽스 '저축'을 못 지웠다).
//  제목 유사도도 0.39로 낮다 — 표현이 다르면 문장 비교로는 안 잡힌다.
//
//  ★판별 기준: 짧은 키워드가 긴 키워드 안에 '순서대로' 들어가는가(부분수열).
//   연금펀드 ⊂ 연금저축펀드  → 연·금·(저축 건너뜀)·펀·드 = 같은 상품군 ✓
//   주담대이율 ⊄ 주담대환대출 → '이'가 없다. 이율과 환대출은 다른 글이다 ✓
//   신용카드환급 ⊄ 통신비환급금 → '용'이 없다 ✓
//  글자 단순 포함(includes)으로는 인픽스를 못 넘고, 유사도로는 과차단된다. 그 사이가 여기다.
export function sameProductFamily(a: string, b: string): boolean {
  const cmp = (x: string) => String(x || "").replace(/[\s·,]/g, "").toLowerCase();
  let [s, l] = [cmp(a), cmp(b)];
  if (s.length > l.length) [s, l] = [l, s];
  if ([...s].length < 4) return false; // 너무 짧으면 우연히 걸린다('대출'이 아무 데나 들어간다)
  let i = 0;
  for (const ch of l) { if (ch === s[i]) i += 1; if (i === s.length) return true; }
  return false;
}
