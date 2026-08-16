// ★수익 경로 태그(FF_REVENUE_TAG §6) — 표시·필터용(기존 단가 스코어 BID_*와 별개, 선별 점수에 관여하지 않음).
//  문구는 사실 기술만: 수익 예측 숫자·보장 표현 금지. 판정은 카테고리 매핑(상수)로 시작 — 실측 RPM이 쌓이면 조정.
import { REVENUE_HIGH_CPC_DEPTH } from "./scoreWeights";

export type RevenuePath = "high_cpc" | "affiliate" | "brandconnect" | "none";

// 제휴 연결이 자연스러운 주제(카드·보험 비교, 여행, 상품 비교·리뷰류) — 키워드 패턴 매핑 테이블
const AFFILIATE_RE = /(카드\s?(추천|비교|혜택)|체크카드|신용카드|보험\s?(비교|추천)|여행\s?(준비|예약|숙소)|호텔|항공권|렌터카|추천\s?(제품|상품)|최저가|가성비|리뷰|후기\s?모음|비교\s?(순위|추천))/;
// 커머스(브랜드커넥트) 연결 가능 주제 — 실물 상품·체험 카테고리
const BRAND_RE = /(화장품|스킨케어|영양제|건강기능식품|생활용품|주방|가전\s?(제품|추천)|유아용품|반려\s?(용품|간식)|밀키트|간편식)/;

export interface RevenueTagInput {
  keyword: string;
  title?: string | null;
  adDepth?: number | null; // keyword_pool.ad_depth(광고 밀도 실측 프록시)
}

export function revenuePathOf(input: RevenueTagInput): RevenuePath {
  const text = `${input.keyword} ${input.title ?? ""}`;
  if ((input.adDepth ?? 0) >= REVENUE_HIGH_CPC_DEPTH) return "high_cpc"; // 네이버 광고 실측(입찰 밀도) 상위
  if (AFFILIATE_RE.test(text)) return "affiliate";
  if (BRAND_RE.test(text)) return "brandconnect";
  return "none";
}

/** 카드 뱃지 문구 — 사실 기술만(§6). none은 뱃지 없음. */
export const REVENUE_TAG_LABEL: Record<Exclude<RevenuePath, "none">, string> = {
  high_cpc: "광고 단가 높은 주제",
  affiliate: "제휴 연결 가능 주제",
  brandconnect: "커머스 연결 가능 주제",
};
