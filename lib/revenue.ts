// ★수익 경로 판정 + 대가성 문구(공정위 표시광고) — 판정 로직을 한 곳에 모은다.
//  리뷰/제휴형 = 쇼핑커넥트 연계 가능(태그) + 대가성 문구·링크 자리 필요(Part C).
//  정보형 = 애드포스트. 수익 보장류 표현 금지.

export interface RevenueInput { keyword?: string; title?: string; intent?: string | null; promo?: boolean }

// 상품 리뷰/비교/추천 신호(제휴 링크가 자연스러운 글). '비교'만으론 부족 — 상품 맥락 키워드.
const REVIEW_KW = /(후기|리뷰|추천|순위|best|베스트|가성비|내돈내산|언박싱|사용기|비교|vs|직구|할인|최저가|구매\s*가이드|입문템)/i;

// ★리뷰/제휴형인가 — 대가성 문구·쇼핑커넥트 태그의 단일 판정. (C단계 브리프 intent 통합 지점)
export function isReviewType(p: RevenueInput): boolean {
  if (p.promo) return true;                       // 홍보/제휴 명시
  const text = `${p.keyword ?? ""} ${p.title ?? ""}`;
  if (REVIEW_KW.test(text)) return true;          // 키워드 휴리스틱
  if (p.intent && /비교\s*분석/.test(p.intent)) return true; // C단계 앵글 브리프 의도(비교대조형)
  return false;
}

// 수익 경로 태그 — 정보이지 행동이 아니다(잠금과 무관하게 표시).
export type RevenuePath = "adpost" | "shopping";
export function revenuePath(p: RevenueInput): RevenuePath {
  return isReviewType(p) ? "shopping" : "adpost";
}

// 공정위 취지 — 명확·눈에 띄게, 본문 상단. 흐리거나 끝에 숨기지 않는다.
export const DISCLOSURE_TEXT = "이 글에는 구매 시 작성자가 수수료를 받을 수 있는 링크가 포함되어 있습니다.";
export const LINK_MARKER = "[상품 링크 자리]";

// 대가성 문구가 이미 있나(핵심 문구 존재 여부).
export function hasDisclosure(html: string): boolean {
  return /수수료를 받을 수 있는 링크|경제적 대가|제휴\s*링크가 포함/.test(html);
}

// ★대가성 문구 규칙 v2(실측: 링크 없는 정보성 글에 수수료 문구가 붙어 신뢰 자해) —
//  [상품 링크 자리]가 실제 본문에 있을 때만 수수료 고지. 없으면 반대로 잘못 든 고지를 '제거'하고
//  정보성 신뢰 문구(조사 기반·공식 확인 안내)는 본문 마무리 규칙이 맡는다.
export function ensureDisclosure(html: string, isReview: boolean): string {
  const hasLinkSlot = html.includes(LINK_MARKER);
  if (hasLinkSlot) {
    if (hasDisclosure(html)) return html;
    return `<p><b>${DISCLOSURE_TEXT}</b></p>\n${html}`;
  }
  // 링크 자리가 없는데 고지가 있으면 오폭 — 그 문단 제거
  if (hasDisclosure(html)) {
    return html.replace(/<p>(?:<b>)?[^<]*(?:수수료를 받을 수 있는 링크|제휴\s*링크가 포함)[^<]*(?:<\/b>)?<\/p>\n?/g, "");
  }
  return html;
}
