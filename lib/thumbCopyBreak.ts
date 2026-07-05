// ★썸네일 문구 개행 — 9자 이상이면 중간 어절 경계에서 2줄로(어색한 분절 금지, 렌더러는 \n 지원).
export function breakThumbCopy(text: string): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  const chars = [...t];
  if (chars.length <= 8 || !t.includes(" ")) return t;
  const words = t.split(" ");
  if (words.length === 1) return t;
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const diff = Math.abs([...a].length - [...b].length);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}
