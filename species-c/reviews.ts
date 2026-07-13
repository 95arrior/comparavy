// [species-c] §6 리뷰 마이닝 — 입력된 리뷰 텍스트에서 만족 TOP3·불만 TOP2·구체 표현·구매 맥락 추출.
// 원료 부족은 에러가 아니라 게이트 재확인 신호(§6 마지막 줄).
import { LLM, REVIEW_QUOTE } from "./config";
import { askJson } from "./llm";
import type { ReviewMining } from "./types";

export class ReviewShortage extends Error {}

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
      ``,
      `JSON만: {"totalParsed":0,"satisfactionTop3":[{"point":"","mentions":0}],"complaintsTop2":[{"point":"","mentions":0}],"vividPhrases":[""],"buyContexts":[{"context":"","share":""}]}`,
      ``,
      `--- 리뷰 원문 ---`,
      trimmed.slice(0, 12000),
    ].join("\n"),
    LLM.reviewMaxTokens,
  );
  if (!mined.satisfactionTop3?.length) throw new ReviewShortage("리뷰에서 만족 포인트를 추출하지 못했습니다 — 리뷰 텍스트를 더 붙여넣으세요");
  mined.vividPhrases = (mined.vividPhrases ?? []).map((p) => [...p].slice(0, REVIEW_QUOTE.maxLen).join("")).filter(Boolean).slice(0, 5);
  return mined;
}
