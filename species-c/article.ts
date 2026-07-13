// [species-c] §7 본문 생성 — 뼈대 9단 고정, 심리 임무는 브리프에서 주입, 문체는 style-guide.md에서 주입.
import fs from "node:fs";
import path from "node:path";
import { ARTICLE_LENGTH, DISCLOSURE_TEXT, LINK_MARKER, LLM, TAG_COUNT } from "./config";
import { askJson } from "./llm";
import type { ArticleDraft, ArticleType, KeywordResult, Product, PsychBrief, ReviewMining } from "./types";

const STYLE_GUIDE = fs.readFileSync(path.join(__dirname, "style-guide.md"), "utf8");

const TYPE_NOTE: Record<ArticleType, string> = {
  "problem-solve": "유형=문제해결형(기본 뼈대 그대로).",
  compare: "유형=비교형: 섹션 4를 두 상품 비교 구조로, [이미지: 비교표 카드] 마커를 섹션 4에 추가.",
  "how-to-choose": "유형=고르는법형: 섹션 4 앞부분에 '고르는 기준 3가지'를 먼저 제시한 뒤 이 상품이 그 기준에 어떻게 맞는지로 전개.",
  "season-preempt": "유형=시즌선점형: 도입을 다가오는 시즌 이벤트 프레임(지금 준비해야 하는 이유)으로.",
};

export async function writeArticle(p: Product, kw: KeywordResult, brief: PsychBrief, reviews: ReviewMining): Promise<ArticleDraft> {
  const missions = brief.sectionMissions.map((m) => `- ${m.section}: ${m.mission}`).join("\n");
  const draft = await askJson<ArticleDraft>(
    [
      `너는 '박카상사 판매왕' — 정직해서 잘 파는 사람이다. 네이버 블로그 커머스 글을 쓴다.`,
      ``,
      `[스타일 가이드 — 전부 준수]`,
      STYLE_GUIDE,
      ``,
      `[상품] ${p.name} / ${p.price.toLocaleString()}원${p.discountPct ? ` (할인 ${p.discountPct}%)` : ""} / 평점 ${p.rating} / 리뷰 ${p.reviewCount.toLocaleString()}건 / 카테고리 ${p.category}`,
      p.myExperience ? `[실사용 입력 — 이 범위 안에서만 직접 경험 서술 허용] ${p.myExperience}` : `[실사용 입력 없음 — 직접 경험 서술 전면 금지, 리뷰 집계 프레임만]`,
      `[메인 키워드] ${kw.main.keyword} (제목·첫 문단에 자연 포함) / 서브: ${kw.subs.map((s) => s.keyword).join(", ")}`,
      `[리뷰 집계 실측 — 이 숫자·문구만 사용, 창작 금지]`,
      `- 만족 TOP3: ${reviews.satisfactionTop3.map((s) => `${s.point}(${s.mentions}회)`).join(" / ")}`,
      `- 불만 TOP2: ${reviews.complaintsTop2.map((c) => `${c.point}(${c.mentions}회)`).join(" / ")}`,
      `- 구체 표현(따옴표 인용 가능, 15자 이내·3회 이하): ${reviews.vividPhrases.map((v) => `"${v}"`).join(", ")}`,
      `- 구매 맥락: ${reviews.buyContexts.map((b) => `${b.context}(${b.share})`).join(" / ")}`,
      `[심리 브리프 — 각 섹션이 이 임무를 수행해야 한다]`,
      `- 검색 직전 장면: ${brief.scene}`,
      `- 두려움: ${brief.fears.join(" / ")}`,
      `- 사게 만드는 확인: ${brief.buySignals.join(" / ")}`,
      `- 이탈 순간(피할 것): ${brief.exitMoments.join(" / ")}`,
      missions,
      ``,
      `[뼈대 — 순서 고정, 번호는 출력하지 않는다]`,
      `1. 문제 공감 도입: 브리프의 장면으로 시작. 두괄식 3~4문장. 메인 키워드 자연 포함.`,
      `2. 대가성 고백: 정확히 이 문구를 그대로: "${DISCLOSURE_TEXT}"`,
      `3. 리뷰 집계: "실구매자 ${p.reviewCount.toLocaleString()}건의 리뷰를 읽어봤습니다" 프레임 + 만족 TOP3. 이 섹션 끝에 단독 줄로: [이미지: 리뷰 분석 카드]`,
      `4. 핵심 스펙·사용 맥락: 스펙 나열이 아니라 '사게 만드는 확인'에 답하는 순서로. ${TYPE_NOTE[kw.articleType]}`,
      `5. 단점 인정: 불만 TOP2 중 1~2개 정직하게 + 누구에게는 문제고 누구에게는 아닌지 구분. "이런 분께는 못 팝니다" 화법 허용.`,
      `6. CTA 1: 구매 제안 2~3문장. 끝에 단독 줄 두 개: [이미지: CTA 카드] 그리고 ${LINK_MARKER}`,
      `7. 체크리스트: "이런 분께 맞습니다" 3~4줄 / "이런 분은 다시 생각하세요" 2~3줄(문장으로, 기호 없이). 끝에 단독 줄: [이미지: 체크리스트 카드]`,
      `8. 마무리: 타겟 호명 + 짧은 CTA. 끝에 단독 줄: ${LINK_MARKER}`,
      ``,
      `[분량] 본문 ${ARTICLE_LENGTH.min}~${ARTICLE_LENGTH.max}자.`,
      `[제목 2안] titleSearch=검색 최적화(메인 키워드 앞쪽 배치, 30자 이내) / titleHook=홈판 훅(궁금증, 28자 이내, 낚시 금지 — 본문이 답하는 것만)`,
      `[태그] ${TAG_COUNT}개 — 메인·서브 키워드 + 문제 상황 변형. # 없이 단어만.`,
      ``,
      `JSON: {"titleSearch":"...","titleHook":"...","body":"...(플레인 텍스트, 문단 사이 빈 줄)","tags":["..."]}`,
    ].join("\n"),
    LLM.articleMaxTokens,
  );
  if (!draft.body || !draft.titleSearch) throw new Error("본문 생성 실패(필수 필드 누락)");
  draft.tags = (draft.tags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, TAG_COUNT);
  return draft;
}
