// 블로그 이름 자동생성 — 카테고리/세부에 이미 "블로그"가 있으면 중복 안 붙게.
// 예: "수익형 블로그" → "수익형 블로그"(중복 X), "재테크" → "재테크 블로그", "블로그" → "블로그".
export function defaultBlogName(label: string | null | undefined): string {
  const base = String(label ?? "").replace(/\s*블로그\s*$/, "").trim();
  return base ? `${base} 블로그` : "블로그";
}
