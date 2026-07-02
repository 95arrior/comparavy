// ★계정별 스타일 페르소나 — '1만 계정이 같은 폼으로 발행' 지문 문제의 해법.
// 유저 ID 해시(고정 시드)로 스타일 변수 6개를 뽑아 '유저 프롬프트'에 주입한다.
//  - 같은 계정 = 항상 같은 스타일 (C-Rank는 블로그 내 일관성을 좋아함 — 같은 사람이 쓴 것처럼)
//  - 계정 간 = 서로 다름 (사람 블로거 세계의 자연 분포와 동일)
//  - 시스템 프롬프트에 넣지 않는 이유: 프롬프트 캐싱(공유 프리픽스)을 깨지 않기 위해. 비용 증가 0.

// FNV-1a 32bit — 의존성 없는 결정적 해시
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const INTROS = [
  "도입은 <blockquote> 한 줄 요약 박스로 시작",
  "도입은 검색자의 상황을 콕 집는 공감 문장으로 시작(박스 없이)",
  "도입은 궁금증을 던지는 질문 한 줄로 시작",
  "도입은 결론부터 먼저 말하고 시작",
];
const MARKS = [
  "형광펜(<mark>)은 글 전체에서 핵심 문장 2~3곳에 (독자가 그것만 읽어도 결론을 알게)",
  "형광펜(<mark>)은 소제목 구간마다 가장 중요한 한 구절에 (스캔 리듬을 만들게)",
];
const ENDINGS = [
  "마무리는 핵심 요약을 <ul> 리스트로",
  "마무리는 요약을 2~3문장 문단으로(리스트 없이)",
  "마무리는 '다음에 궁금할 질문' 한 줄 예고로 끝",
];
const HASHTAGS = ["해시태그 5~8개", "해시태그 9~14개", "해시태그 15~20개"];
const HEADINGS = [
  "소제목(h2)은 질문형 위주",
  "소제목(h2)은 명사형 위주(짧고 단정하게)",
  "소제목(h2)은 질문형과 명사형을 섞어서",
];
const VOICES = [
  "문장을 짧게 끊는 편",
  "가끔 짧은 혼잣말·감탄을 한두 번 섞는 편(과하지 않게)",
  "차분하고 담백하게 이어가는 편",
];
const EMOJIS = [
  "이모지는 쓰지 않는다",
  "소제목이나 핵심 포인트에 이모지를 아주 가끔(글 전체 1~3개)",
  "문단 포인트·팁 표시에 이모지를 적절히(글 전체 3~6개, 같은 이모지 반복 금지)",
];

/** 유저별 고정 스타일 지시문. 같은 userId는 언제나 같은 문자열을 돌려준다. */
export function stylePersonaInstruction(userId: string): string {
  const h = fnv1a(userId);
  // 각 변수는 서로 다른 비트 구간에서 뽑아 조합 독립성 확보
  const pick = <T,>(arr: T[], shift: number): T => arr[(h >>> shift) % arr.length];
  return [
    pick(INTROS, 0),
    pick(MARKS, 4),
    pick(ENDINGS, 8),
    pick(HASHTAGS, 12),
    pick(HEADINGS, 16),
    pick(VOICES, 20),
    pick(EMOJIS, 24),
  ].join(" · ");
}
