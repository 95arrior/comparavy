// ★서로이웃 인사말 변주 체계 — 앵글 브리프와 같은 원리: 구조는 코드가 결정론 배정(무중복 분산), 문장은 LLM.
//  1만 유저가 같은 카테고리 블로거에게 신청해도 구조×소재×시드가 갈려 같은 인사말이 반복되지 않는다.
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export const GREET_OPEN = [
  { key: "intro", guide: "내 소개 먼저 — 내가 어떤 주제를 쓰는 사람인지부터 말하고 시작한다." },
  { key: "mention", guide: "상대 글 언급 먼저 — 단, 실제로 읽지 않았으니 카테고리 수준 언급까지만('지원금 글 잘 봤어요' 수준). 특정 글 제목·구체 내용을 지어내는 것 절대 금지." },
  { key: "common", guide: "공통점 먼저 — 같은 주제를 다루는 사람이라는 접점으로 시작한다." },
] as const;
export const GREET_CLOSE = [
  { key: "suggest", guide: "소통 제안형으로 마무리(가볍게)." },
  { key: "hope", guide: "종종 들르고 싶다는 소망형으로 마무리." },
  { key: "plain", guide: "군더더기 없이 담백한 인사로 끝." },
] as const;
export const GREET_LEN = [1, 2, 3] as const;
// 첫 문장 '소재' 축 — 도입 유형이 같아도 첫 어절이 갈리게(주제어·'저는' 수렴 방지). 3×3×3×5 = 135 조합.
export const GREET_LEAD = [
  "요즘 그 분야에서 관심 가는 흐름 하나로 말문을 연다",
  "블로그를 쓰게 된 나만의 계기 한 조각으로 시작한다('월급만으로는' 같은 흔한 표현 금지)",
  "어떤 독자를 위해 쓰는지로 시작한다",
  "내가 '최근에 쓴 내 글'의 소재 하나를 언급하며 시작한다(상대의 글이 아니라 반드시 내 글)",
  "꾸준히 기록하는 습관 이야기로 시작한다",
] as const;

export interface GreetAssign { open: (typeof GREET_OPEN)[number]; close: (typeof GREET_CLOSE)[number]; len: (typeof GREET_LEN)[number]; lead: (typeof GREET_LEAD)[number] }

/** userId 시드 결정론 배정 + variant(재생성 카운터)로 변형. */
export function assignGreeting(userId: string, variant = 0): GreetAssign {
  const h = fnv(`${userId}|greet|${variant}`);
  return {
    open: GREET_OPEN[h % GREET_OPEN.length],
    close: GREET_CLOSE[(h >>> 4) % GREET_CLOSE.length],
    len: GREET_LEN[(h >>> 8) % GREET_LEN.length],
    lead: GREET_LEAD[(h >>> 12) % GREET_LEAD.length],
  };
}

// 과공손 상투구·동일 도입 금지 — 코드 검출(검출 시 1회 재생성)
const GREET_BANNED_RE = /(소중한 인연|좋은 하루 되세요|행복한 하루|번창하|즐거운 하루|방문해 주시면 감사)/;
const STALE_OPEN_RE = /^(좋은 글|블로그를 둘러|블로그 잘 보|유익한 글|알찬|저는|안녕하세요[,.!]?\s*저는|월급만으로는)/;
// 상대 글 구체 내용 단정(읽지 않았으므로 거짓 디테일) — 검출 시 재생성
const FAKE_DETAIL_RE = /(다루셨더라고요|올리셨더라고요|정리하셨|쓰셨던 글|그 글에서|지난 글)/;
export function greetViolates(text: string): boolean {
  return GREET_BANNED_RE.test(text) || STALE_OPEN_RE.test(text.trim()) || FAKE_DETAIL_RE.test(text);
}
