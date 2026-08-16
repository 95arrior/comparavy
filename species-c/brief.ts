// [species-c] §5 구매 심리 브리프 — 이 파이프라인의 심장. 본문 생성 전 별도 LLM 호출, 패키지에 동봉(검수용).
import { askJson } from "./llm";
import { LLM } from "./config";
import type { KeywordResult, Product, PsychBrief, ReviewMining } from "./types";

export async function buildBrief(p: Product, kw: KeywordResult, reviews: ReviewMining | null): Promise<PsychBrief> {
  const brief = await askJson<PsychBrief>(
    [
      `너는 구매 심리 분석가다. 네이버에 "${kw.main.keyword}"를 방금 검색한 사람을 분석하라.`,
      `상품 맥락: ${p.name} (${p.category}, ${p.price.toLocaleString()}원, 평점 ${p.rating}, 리뷰 ${p.reviewCount.toLocaleString()}건)`,
      reviews ? `실구매자 리뷰 신호: 만족=${reviews.satisfactionTop3.map((s) => s.point).join(", ")} / 불만=${reviews.complaintsTop2.map((c) => c.point).join(", ")}` : "",
      ``,
      `다섯 질문에 전부, 구체적으로 답하라(추상어 금지 — 장면·감정·행동 수준):`,
      `1. scene: 이 검색어를 치기 '직전에 겪은 일' 한 장면(시간·장소·감각 포함 1~2문장)`,
      `2. fears: 가장 두려워하는 것 3~4개(돈 낭비, 효과 없음 같은 라벨이 아니라 이 상품 맥락의 구체 문장)`,
      `3. buySignals: 무엇을 확인하면 사는가 3~4개`,
      `4. exitMoments: 사지 않고 이탈하는 순간 3개`,
      `5. sectionMissions: 본문 섹션별 심리 임무 — section은 정확히 이 8개: "문제 공감 도입","대가성 고백","리뷰 집계","핵심 스펙","단점 인정","CTA 1","체크리스트","마무리". mission은 위 답에 근거한 한 줄.`,
      ``,
      `JSON: {"scene":"...","fears":["..."],"buySignals":["..."],"exitMoments":["..."],"sectionMissions":[{"section":"문제 공감 도입","mission":"..."}]}`,
    ].filter(Boolean).join("\n"),
    LLM.briefMaxTokens,
  );
  if (!brief.scene || !brief.sectionMissions?.length) throw new Error("심리 브리프 필수 필드 누락");
  return brief;
}

export function briefToMarkdownish(b: PsychBrief): string {
  return [
    "심리 브리프 (검수용)",
    "",
    "1) 방금 무슨 일을 겪었나",
    b.scene,
    "",
    "2) 가장 두려워하는 것",
    ...b.fears.map((f) => `- ${f}`),
    "",
    "3) 무엇을 확인하면 사는가",
    ...b.buySignals.map((f) => `- ${f}`),
    "",
    "4) 이탈하는 순간",
    ...b.exitMoments.map((f) => `- ${f}`),
    "",
    "5) 섹션별 심리 임무",
    ...b.sectionMissions.map((m) => `- ${m.section}: ${m.mission}`),
  ].join("\n");
}
