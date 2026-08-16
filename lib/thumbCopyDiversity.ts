// ★썸네일 문구 다양성(2026-07-29 유저 실측 — 발행 글 4편 연속 "가장 많이 헷갈리는 곳/착각하는 구간/빠지는 함정/여기서 가장 많이 걸립니다":
//  목록이 한 글처럼 보인다). 진범 둘:
//   ① 채택 규칙 — LLM 후보 6개(역할 6종) 중 '게이트 통과한 첫 후보'를 항상 집었다. 모델은 지시 순서대로 ①실수 역할을 먼저 내놓으므로
//      모든 글이 ①실수로 고정된다(스크린샷 4장 전부 실수형). 문구가 아니라 '역할'이 고정된 것이 반복의 정체.
//   ② 프롬프트 — '좋은 표현 결'에 '가장 많이'가 예시로 들어 있어, 어느 글에나 붙는 범용 프레임을 우리가 권장하고 있었다.
//  → ①은 글별 시드 역할 로테이션으로, ②는 범용 프레임 코드 게이트로 막는다(프롬프트는 방향, 코드는 한계선 — CLAUDE.md).

export interface ThumbRole { key: string; label: string; guide: string; example: string }

// 역할 6종 — 프롬프트와 로테이션이 같은 목록을 쓴다(둘이 갈라지면 역할 번호가 어긋난다).
export const THUMB_ROLES: ThumbRole[] = [
  { key: "mistake", label: "실수", guide: "독자가 실제로 틀리는 지점 하나를 집는다.", example: "여기서 많이 틀립니다" },
  { key: "action", label: "행동", guide: "지금 당장 할 한 가지 동작을 시킨다.", example: "먼저 확인하세요" },
  { key: "result", label: "결과", guide: "결과의 크기·방향만 알리고 값은 숨긴다.", example: "생각보다 큽니다" },
  { key: "curiosity", label: "궁금증", guide: "갈림길이 있다는 사실만 알린다.", example: "여기서 갈립니다" },
  { key: "time", label: "시간", guide: "걸리는 시간·마감을 앞세운다.", example: "3분이면 됩니다" },
  { key: "warn", label: "경고", guide: "사실 기반 주의만('모르면 손해' 금지).", example: "놓치기 쉽습니다" },
];

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ★범용 프레임(2026-07-29) — 주제를 지우고 읽어도 말이 되는 문구 = 어느 글에나 붙는다 = 목록에서 같은 글로 보인다.
//  실측 4종이 전부 '가장 많이 + 관형형' 한 틀. 특정 문구가 아니라 '틀'을 막는다(문구만 막으면 모델이 동의어로 우회).
const STICKY_FRAME_RES: RegExp[] = [
  /(가장|제일)\s?많이/,          // 가장 많이 헷갈리는/착각하는/빠지는/걸립니다 — 실측 4종 전부
  /여기서\s?많이/,               // 역할 ①예시 프레임
  /많이들/,                      // '많이들 놓칩니다'
  /(다들|모두)\s?(하는|놓치는|틀리는)/,
  /흔히\s?(하는|저지르는)/,
];
/** 어느 글에나 붙는 범용 프레임인가 — true면 이 글만의 각도가 없다는 뜻. */
export function isStickyFrame(copy: string): boolean {
  const t = (copy || "").trim();
  return STICKY_FRAME_RES.some((re) => re.test(t));
}

export interface ThumbCandidate { role?: string | number | null; copy: string }

/**
 * 역할 로테이션 채택 — '첫 통과분'이 아니라 '이 글에 배정된 역할'부터 훑는다.
 * 시드(userId:articleId)로 시작 역할을 정하고 6종을 순환하며 첫 통과 후보를 집는다 → 연속 발행 글의 역할이 서로 달라진다.
 * 범용 프레임은 1차에서 배제하고, 살아남은 게 하나도 없을 때만 2차에서 허용한다(문구 없음보다는 낫다 — 키워드 폴백 방지).
 */
export function pickDiverseCopy(
  cands: ThumbCandidate[],
  seed: string,
  isValid: (copy: string) => boolean,
): string | null {
  const list = (cands || []).filter((c) => c && String(c.copy || "").trim());
  if (list.length === 0) return null;
  const start = fnv1a(`${seed}|thumb-role`) % THUMB_ROLES.length;
  // 후보를 역할 인덱스로 정렬(태그 없으면 제시 순서 = 역할 순서로 간주)
  const byRole = new Map<number, ThumbCandidate[]>();
  list.forEach((c, i) => {
    const idx = roleIndexOf(c.role, i);
    const arr = byRole.get(idx) ?? [];
    arr.push(c);
    byRole.set(idx, arr);
  });
  for (const pass of [1, 2]) {
    for (let step = 0; step < THUMB_ROLES.length; step++) {
      const idx = (start + step) % THUMB_ROLES.length;
      for (const c of byRole.get(idx) ?? []) {
        const copy = String(c.copy).trim();
        if (pass === 1 && isStickyFrame(copy)) continue;
        if (isValid(copy)) return copy;
      }
    }
  }
  return null;
}

function roleIndexOf(role: string | number | null | undefined, fallbackIdx: number): number {
  if (typeof role === "number" && Number.isFinite(role)) return (Math.trunc(role) - 1 + 600) % THUMB_ROLES.length; // 1-based
  const s = String(role ?? "").trim();
  if (s) {
    const n = Number(s.replace(/[^0-9]/g, ""));
    if (Number.isFinite(n) && n >= 1 && n <= THUMB_ROLES.length) return n - 1;
    const hit = THUMB_ROLES.findIndex((r) => r.key === s || r.label === s || s.includes(r.label));
    if (hit >= 0) return hit;
  }
  return fallbackIdx % THUMB_ROLES.length;
}
