// ★썸네일 문구 개행(유저 규격) — 1줄 최대 9자·최대 2줄, 어절 경계에서만 분할(단어 중간 절단 금지).
export function breakThumbCopy(text: string): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  const chars = [...t];
  if (chars.length <= 9 || !t.includes(" ")) return t;
  const words = t.split(" ");
  if (words.length === 1) return t;
  // 1줄이 9자를 넘지 않는 분할점 중 두 줄 균형이 가장 좋은 곳 — 없으면 균형 최선
  let best = -1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const la = [...a].length, lb = [...b].length;
    const fits = la <= 9 && lb <= 9;
    const diff = Math.abs(la - lb) + (fits ? 0 : 100); // 9자 준수 분할 최우선
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  if (best < 1) best = 1;
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}
