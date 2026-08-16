// [species-c] §6 리뷰 마이닝 — 입력된 리뷰 텍스트에서 만족 TOP3·불만 TOP2·구체 표현·구매 맥락 추출.
// 원료 부족은 에러가 아니라 게이트 재확인 신호(§6 마지막 줄).
import { LLM, REVIEW_QUOTE } from "./config";
import { askJson } from "./llm";
import type { ReviewMining } from "./types";

export class ReviewShortage extends Error {}

/** ★A-1: 표본 건수는 LLM이 아니라 코드가 센다(사고 원인: 카운터 부재). 별점 마커 우선, 없으면 문단 블록. */
export function countSample(text: string): { sampleSize: number; negativeCount: number } {
  const stars = [...text.matchAll(/[★☆]\s*([1-5])(?:\.\d)?\b/g)];
  const blocks = text.split(/\n+/).map((b) => b.trim()).filter((b) => [...b].length >= 25 && /[가-힣]/.test(b) && !/^\[/.test(b));
  const sampleSize = stars.length >= 3 ? stars.length : Math.max(stars.length, blocks.length);
  const negativeCount = stars.filter((m) => Number(m[1]) <= 3).length;
  return { sampleSize, negativeCount };
}

export async function mineReviews(reviewsText: string, productName: string): Promise<ReviewMining> {
  const trimmed = reviewsText.trim();
  // 대략 리뷰 10건 미만 분량이면 원료 부족 — 게이트 재확인으로 되돌린다
  if (trimmed.length < 300) throw new ReviewShortage("리뷰 텍스트가 부족합니다 — 상품 페이지에서 리뷰 20~50개를 복사해 reviewsText에 붙여넣으세요");

  const mined = await askJson<ReviewMining>(
    [
      `상품 "${productName}"의 실구매자 리뷰 뭉치다. 집계 분석하라(창작 금지 — 텍스트에 실제로 있는 것만).`,
      ``,
      `추출 항목:`,
      `- totalParsed: 리뷰로 식별되는 건수(대략)`,
      `- satisfactionTop3: 만족 포인트 상위 3개 {point, mentions(언급 횟수)}`,
      `- complaintsTop2: 불만 포인트 상위 2개 {point, mentions}`,
      `- vividPhrases: 반복 등장하는 구체 표현 3~5개 — 원문 그대로, 각 ${REVIEW_QUOTE.maxLen}자 이내로 자른다`,
      `- buyContexts: 어떤 상황의 사람들이 샀나 2~4개 {context, share("다수"/"일부" 수준)}`,
      `- searchPhrases: 구매자들의 표현을 근거로 '이 사람들이 사기 전에 검색했을 법한 검색어' 5~10개 (리뷰에 실제로 나온 상황·표현 기반, 브랜드명 금지)`,
      ``,
      `JSON만: {"totalParsed":0,"satisfactionTop3":[{"point":"","mentions":0}],"complaintsTop2":[{"point":"","mentions":0}],"vividPhrases":[""],"buyContexts":[{"context":"","share":""}],"searchPhrases":[""]}`,
      ``,
      `--- 리뷰 원문 ---`,
      trimmed.slice(0, 12000),
    ].join("\n"),
    LLM.reviewMaxTokens,
  );
  if (!mined.satisfactionTop3?.length) throw new ReviewShortage("리뷰에서 만족 포인트를 추출하지 못했습니다 — 리뷰 텍스트를 더 붙여넣으세요");
  mined.vividPhrases = (mined.vividPhrases ?? []).map((p) => [...p].slice(0, REVIEW_QUOTE.maxLen).join("")).filter(Boolean).slice(0, 5);
  // ★A-1: 표본은 코드 카운트가 진실 — LLM 추정치 덮어쓰기 + 언급 수는 표본을 넘을 수 없다(클램프)
  const counted = countSample(reviewsText);
  mined.sampleSize = counted.sampleSize;
  mined.negativeCount = counted.negativeCount;
  mined.totalParsed = counted.sampleSize;
  const clamp = (m: number) => Math.max(1, Math.min(m, counted.sampleSize));
  mined.searchPhrases = (mined.searchPhrases ?? []).map((x) => String(x).trim()).filter((x) => x && [...x].length <= 25).slice(0, 10);
  mined.satisfactionTop3 = mined.satisfactionTop3.map((x) => ({ ...x, mentions: clamp(x.mentions) }));
  mined.complaintsTop2 = (mined.complaintsTop2 ?? []).map((x) => ({ ...x, mentions: clamp(x.mentions) }));
  return mined;
}
