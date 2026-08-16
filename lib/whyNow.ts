// ★"왜 지금" 한 줄 — 씨앗 데이터 기반 자동 생성. 실존 마감이 있을 때만 마감 문구(지어내기 금지).
//  존댓말 짧은 한 문장, 이모지·장식·보장류 금지.
export interface WhyNowTopic { title?: string; keyword?: string; newsContext?: string | null; tag?: string; vol?: number }

// 강한 마감 신호만(실제 날짜·시각·오늘마감·D-n). '신청'만으론 마감으로 보지 않는다.
const STRONG_DEADLINE = /(오늘\s*마감|마감\s*임박|오늘\s*(오후|오전)?\s*\d{1,2}\s*시|\d{1,2}월\s*\d{1,2}일\s*(까지|마감)|이번\s*달\s*까지|기한\s*내|신청\s*마감|D-\s?\d)/;

export function whyNow(t: WhyNowTopic): string {
  const text = `${t.title ?? ""} ${t.keyword ?? ""} ${t.newsContext ?? ""}`;
  if (STRONG_DEADLINE.test(text)) return "마감이 가까운 이슈예요. 지금 쓰면 검색 유입을 선점해요.";
  if (t.tag === "trend" || t.tag === "issue") return "지금 검색이 빠르게 늘고 있는 주제예요.";
  if ((t.vol ?? 0) >= 5000) return "꾸준히 많이 검색되는 주제예요.";
  return "";
}
