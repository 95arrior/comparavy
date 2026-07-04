// ★제목 훅 패턴 라이브러리 + 금지어 필터 + 열린 고리(open-loop) 원칙.
//  두 명제: (1) 네이버가 자랑스러울 절제된 완성도 (2) 답을 숨기고 궁금증만 남긴다.
//  단, 궁금증은 본문이 반드시 해소 — 본문이 못 답하는 약속은 어그로(체류 붕괴 → 노출 역효과).

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export interface HookPattern { key: string; name: string; guide: string; example: string }

// 훅 8종 — LLM에게 주는 지침(guide) + 예시. 홈판 클릭형 제목에 시드로 배정.
export const HOOK_PATTERNS: HookPattern[] = [
  { key: "loss", name: "손실회피형", guide: "모르면 놓치는·그대로 두면 손해인 구조를 지적한다(공포조장 말고 담담하게).", example: "그냥 두면 새는 돈, 통장 이자" },
  { key: "number", name: "숫자구체형", guide: "구체적 금액·기간 차이를 제시하되 무엇이 다른지는 숨긴다.", example: "월 5천 원 차이가 나는 이유" },
  { key: "target", name: "대상지목형", guide: "특정 독자를 콕 집는다(사회초년생·신혼부부 등 온보딩 타깃 활용).", example: "사회초년생이 먼저 봐야 할 통장" },
  { key: "twist", name: "반전형", guide: "통념을 뒤집는다. 단, 본문이 근거로 뒷받침할 수 있는 반전만. ★단정 경구체 금지 — 'A는 B가 아니라 C였다/이다'처럼 칼럼 제목 같은 단정 문장은 쓰지 말고, '~인 경우'·'~일 수 있는 이유'처럼 조건·가능성 형태로 연다.", example: "금리 높은 통장이 손해인 경우" },
  { key: "confession", name: "경험고백형", guide: "직접 해 본 관점으로. 없는 1인칭 경험은 지어내지 않는다.", example: "갈아타 보니 달랐던 점" },
  { key: "deadline", name: "마감시의형", guide: "기한을 강조한다. ★씨앗 데이터에 실제 날짜·마감이 있을 때만 사용.", example: "이번 달까지만 되는 신청" },
  { key: "question", name: "질문형", guide: "독자의 고민을 그대로 질문으로. 물음표 1개만 허용.", example: "지금 갈아타도 될까?" },
  { key: "compare", name: "비교대조형", guide: "두 선택지의 유불리를 대비한다. 승자는 본문에서.", example: "파킹통장과 적금, 지금은?" },
];

// 씨앗에 마감·날짜 신호가 있을 때만 deadline 패턴 허용.
export function seedHasDeadline(seedText: string): boolean {
  return /(마감|오늘|이번\s?달|이번\s?주|까지|신청|기한|D-\d|\d{1,2}월\s?\d{1,2}일|연장|종료)/.test(seedText || "");
}

/**
 * 훅 패턴 선택 — userId·씨앗·날짜 시드. 직전 N개 패턴 제외(연속 반복 방지).
 * deadline은 씨앗에 마감 신호가 있을 때만 후보에 포함.
 */
export function pickHookPattern(userId: string, seedKeyword: string, day: string, recentKeys: string[] = [], seedText = ""): HookPattern {
  const allowDeadline = seedHasDeadline(`${seedText} ${seedKeyword}`);
  let pool = HOOK_PATTERNS.filter((p) => (p.key === "deadline" ? allowDeadline : true));
  const recent = new Set(recentKeys.slice(0, 3));
  const fresh = pool.filter((p) => !recent.has(p.key));
  if (fresh.length > 0) pool = fresh; // 직전 3개 제외, 다 걸리면 전체에서
  const h = fnv1a(`${userId}|${seedKeyword}|${day}|hook`);
  return pool[h % pool.length];
}

// ── 금지어 필터 — 본문이 못 지킬 약속·과장·보장류. 코드로 강제. ──
//  단어 경계가 애매한 한국어라 부분일치. '100%'·'무조건'·'보장'·'확실'·'완벽'·어그로 접두.
const BANNED_PATTERNS: RegExp[] = [
  /100\s?%/,
  /무조건/,
  /보장(?!금|보험)/,      // '보장'(약속). '보장금·보장보험'은 명사라 제외
  /절대\s?(안|못|없)/,     // '절대 안 놓쳐요' 류 약속
  /확실(히|한)\s?(수익|이득|성공|합격)/,
  /완벽\s?(정리|가이드)?\s?(보장)?/,
  /(무료로|공짜로)?\s?떼돈|대박\s?나는|한\s?방에\s?해결/,
  /반드시\s?(성공|이득|수익|오른다|번다)/,
  /충격|경악|헉/,          // 유튜브식 어그로
];
export function bannedHits(text: string): string[] {
  const t = text || "";
  const hits: string[] = [];
  for (const re of BANNED_PATTERNS) { const m = re.exec(t); if (m) hits.push(m[0]); }
  return hits;
}
export function containsBanned(text: string): boolean {
  return bannedHits(text).length > 0;
}

// 열린 고리 자가 테스트 지침 — 브리프 생성 프롬프트에 주입.
export const OPEN_LOOP_GUIDE = [
  "★열린 고리 원칙(카피·클릭형 제목 공통): 답을 주지 말고 질문을 남긴다. 결론을 숨기고 결론의 '존재'만 알린다.",
  "- '이유·차이·기준·경우·순서·함정'처럼 내용을 예고하되 내용은 담지 않는 미완결 명사로 끝내는 형태를 우선한다.",
  "- 구체 숫자로 신뢰를 주되 답은 숨긴다(예: '월 5천 원 차이' — 무엇이 다른지는 본문에서).",
  "- 자가 테스트: 이 카피를 읽으면 독자 머릿속에 질문이 생기는가? 카피가 스스로 답하고 있으면 다시 쓴다.",
  "  · 닫힌(나쁨): '파킹통장 금리 비교 정리'  · 열린(좋음): '지금 바꿔야 하는 이유'",
  "- 금지: 본문이 근거를 못 대는 약속, 무조건·100%·보장류, 충격·경악식 어그로, 느낌표(!). 물음표는 질문형에서 1개만.",
].join("\n");
