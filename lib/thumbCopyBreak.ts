// ★썸네일 문구 개행(유저 규격) — 1줄 최대 9자·최대 2줄, 어절 경계에서만 분할(단어 중간 절단 금지).
// ★의미 경계 보강(2026-07-16 유저 실측 2건: "같은 1000만/원 금리로 두 배", "채무탕감 신청/전 내 자격부터" —
//  단위(원)·의존명사(전)가 다음 줄 머리로 떨어짐): ①숫자+단위는 병합 ②의존어 줄머리 분할은 강한 감점.
const UNIT_MERGE_RE = /(\d[\d,.]*[만억천]?)\s+(원|명|개|배|년|월|일|살|번|위|시간|분)(?=\s|$)/g;
const BOUND_HEAD_RE = /^(원|전|후|중|시|것|수|만|억|배|개|명|위|살|번)$/; // 줄머리에 오면 어색한 의존어('내'는 소유격 줄머리가 자연스러워 제외)
export function breakThumbCopy(text: string): string {
  const t = (text || "").trim().replace(/\s+/g, " ").replace(UNIT_MERGE_RE, "$1$2");
  const chars = [...t];
  if (chars.length <= 9 || !t.includes(" ")) return t;
  const words = t.split(" ");
  if (words.length === 1) return t;
  // 1줄이 9자를 넘지 않는 분할점 중 두 줄 균형이 가장 좋은 곳 — 의미 경계 감점이 9자 미세 초과보다 무겁다
  let best = -1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const la = [...a].length, lb = [...b].length;
    const fits = la <= 9 && lb <= 9;
    const nearFit = la <= 10 && lb <= 10; // 1자 초과는 렌더러가 미세 축소로 흡수
    const boundPenalty = BOUND_HEAD_RE.test(words[i]!) ? 120 : 0; // 의존어 줄머리 — 사실상 금지
    const diff = Math.abs(la - lb) + (fits ? 0 : nearFit ? 40 : 100) + boundPenalty;
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  if (best < 1) best = 1;
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}
