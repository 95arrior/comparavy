// [species-c] §7 본문 생성 — 뼈대 9단 고정, 심리 임무는 브리프에서 주입, 문체는 style-guide.md에서 주입.
import fs from "node:fs";
import path from "node:path";
import { ARTICLE_LENGTH, DISCLOSURE_TEXT, FAKE_REVIEW_WORDS, LLM, MARKER_LINK_1, MARKER_LINK_2, MARKER_PRODUCT_IMG, MARKER_REVIEW_CARD, SAMPLE_MIN_FOR_NUMBERS, samplePhrase, TAG_COUNT } from "./config";
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
      `너는 물건을 깐깐하게 골라 소개하는 커머스 에디터다. 정직함은 말이 아니라 데이터(리뷰 집계·단점 공개)로 보여준다 — 자기 지칭·맹세 멘트는 쓰지 않는다. 네이버 블로그 커머스 글을, 옆자리 동료에게 알려주듯 편하게 쓴다.`,
      ``,
      `[스타일 가이드 — 전부 준수]`,
      STYLE_GUIDE,
      ``,
      `[상품] ${p.name} / ${p.price.toLocaleString()}원${p.discountPct ? ` (할인 ${p.discountPct}%)` : ""} / 평점 ${p.rating} / 리뷰 ${p.reviewCount.toLocaleString()}건 / 카테고리 ${p.category}`,
      p.myExperience ? `[실사용 입력 — 이 범위 안에서만 직접 경험 서술 허용] ${p.myExperience}` : `[실사용 입력 없음 — 직접 경험 서술 전면 금지, 리뷰 집계 프레임만]`,
      `[메인 키워드 — 1글 1바늘] "${kw.main.keyword}" 이 문구가 제목에 자연스럽게 포함되어야 한다(변형 금지). ★서브 키워드(${kw.subs.map((s) => s.keyword).join(", ")})는 제목에 절대 넣지 말고 본문 소제목에만 배치한다.`,
      `[리뷰 집계 실측 — 이 데이터만 사용, 창작 금지]`,
      `★신뢰 회계(절대 조항): 붙여넣기 표본은 ${reviews.sampleSize}건이다. 분석 주장("정독했다·읽어봤다")에는 오직 이 표본 수만 쓴다 — 전체 리뷰 수(${p.reviewCount.toLocaleString()}건)로 분석했다고 말하면 실격. 리뷰 집계 섹션은 정확히 이 문장으로 연다: "${samplePhrase(p.reviewCount, reviews.sampleSize)}"`,
      reviews.sampleSize < SAMPLE_MIN_FOR_NUMBERS
        ? `★표본 ${reviews.sampleSize}건 < ${SAMPLE_MIN_FOR_NUMBERS}건 — 수치 표기 전면 금지. "가장 자주 보인 얘기는 ~였습니다", "여러 건에서 반복된 표현은 ~" 같은 정성 서술만.`
        : `★수치는 비율 표기만: "${reviews.sampleSize}건 중 N건" 형식. 절대 횟수 단독 표기("6회 언급") 금지.`,
      `- 만족 TOP3(빈도순): ${reviews.satisfactionTop3.map((s) => s.point).join(" / ")}`,
      `- 불만 TOP2(빈도순): ${reviews.complaintsTop2.map((c) => c.point).join(" / ")}`,
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
      `0. ★본문 맨 첫 줄(다른 어떤 것보다 먼저, 단독 문단): 정확히 이 문구 그대로 — "${DISCLOSURE_TEXT}"`,
      `1. 문제 공감 도입(리듬 v2 3단 고정): ①독자 속마음 따옴표 대사 1줄(브리프의 장면에서, 30자 이내 — 이 따옴표는 리뷰 인용과 별개로 허용) ②상황 짧은 서술 1~2문장 ③문제 선언 1문장 ④★이득 한 줄(교본 흡수): 이 글에서 얻는 것을 구체로 — 할인 정보가 있으면 그것(${p.discountPct ? `현재 ${p.discountPct}% 할인 중` : "할인 정보 없음 — 지어내지 마"}), 없으면 해결 약속 한 줄. 메인 키워드 자연 포함. 도입 끝에 단독 줄로: ${MARKER_PRODUCT_IMG}`,
      `★상품 이미지 자리 규칙: ${MARKER_PRODUCT_IMG} 단독 줄을 글 전체에 3~5곳 배치한다(글마다 개수·위치를 달리 — 도입 끝 1곳은 고정, 나머지는 리뷰 집계·사용 시나리오·단점·체크리스트 사이 중 내용이 이미지를 부르는 자리에). 연속 배치 금지 — 텍스트 2문단 이상 사이를 둔다.`,
      `2. 리뷰 집계: 위 신뢰 회계 표준 문장으로 열고 + 만족 TOP3. 인용은 나열형이 자연스럽다: "'보송보송' '냄새가 줄었다' 같은 의견이 반복되었습니다"(구체 표현 2~3개 나열, 각 15자 이내). 이 섹션 끝에 단독 줄로: ${MARKER_REVIEW_CARD}`,
      `3. 핵심 스펙·사용 맥락: 스펙 나열이 아니라 '사게 만드는 확인'에 답하는 순서로. 이 섹션에 '사용 시나리오' 한 장면을 가정형으로 넣는다("비 오는 날 퇴근하고 꽂아두면, 다음 날 아침엔 ~" — ★"제가 해봤다"가 아니라 "~하면 ~됩니다" 프레임). ${TYPE_NOTE[kw.articleType]}`,
      `4. 단점 인정: 불만 TOP2 중 1~2개 정직하게 + 누구에게는 문제고 누구에게는 아닌지 구분. 화법은 "~에 민감한 분이라면 구매 전 이 부분은 꼭 고려해 보세요"(★"못 팝니다"류 거절 화법 금지 — 브랜드 비친화).`,
      `5. CTA 1: 구매 제안 2~3문장 — ★행동 지침형(교본 흡수): 링크에서 무엇을 어떻게 확인·적용하는지 순서로 안내("아래 링크에서 현재 가격을 확인하고, 진행 중인 쿠폰이 있다면 적용해 보세요" 톤 — 확인 안 된 쿠폰·세일을 단정하지 마). 조급한 재촉 금지. 끝에 단독 줄: ${MARKER_LINK_1}`,
      `6. 체크리스트(본문 텍스트로만): "이런 분께 추천해요" 3~4줄 / "이런 분껜 아쉬워요" 2~3줄(문장으로, 기호 없이).`,
      `7. 마무리: 타겟 호명 + 짧은 CTA — 역시 마지막 문장이 아래 링크 카드를 자연스럽게 받게. 끝에 단독 줄: ${MARKER_LINK_2}`,
      ``,
      `[표면 리듬 v2 — 스타일 가이드의 골든 샘플 리듬 그대로]`,
      `• 문단당 최대 2문장, 문단 사이 빈 줄(벽돌 금지 — 게이트가 검사한다).`,
      `• 소제목(짧은 훅 줄)의 절반 이상은 질문형 — 본문이 답한다.`,
      `• 핵심 문장 정확히 2~4곳을 ==문장== 마커로 감싼다(형광펜 자리 — 수치·결론 문장 우선).`,
      `• 이모지: 본문 전체 8~12개 — 도입·소제목·감정 문장·CTA 주변에만. ★금지 존: 단점 인정 섹션 전체, 수치·가격이 들어간 문장, 대가성 고지 문구. 제목·태그에는 절대 금지.`,
      `[분량] 본문 ${ARTICLE_LENGTH.min}~${ARTICLE_LENGTH.max}자.`,
      `[제목 2안] titleSearch=검색 최적화(메인 키워드 앞쪽 배치, 30자 이내) / titleHook=홈판 훅(궁금증, 28자 이내, 낚시 금지 — 본문이 답하는 것만)`,
      `★제목 앞 15자 자기검증(의무): 쓴 뒤 앞 15자를 잘라 검사 — 구체 숫자·대상 호명(~라면/~인 분)·질문(?)·따옴표 발화 중 하나가 있어야 한다. '총정리·확인하기·알아보기·방법·이유'는 훅이 아니다. 없으면 재작성.`,
      p.myExperience ? "" : `★실사용 입력 없음 — 제목·본문·태그에 ${FAKE_REVIEW_WORDS.map((w) => `"${w}"`).join("·")} 절대 금지(리뷰 집계 글이지 후기가 아니다).`,
      `[태그] ${TAG_COUNT}개 — 메인·서브 키워드 + 문제 상황 변형. # 없이 단어만.`,
      ``,
      `JSON: {"titleSearch":"...","titleHook":"...","body":"...(플레인 텍스트, 문단 사이 빈 줄)","tags":["..."]}`,
    ].filter(Boolean).join("\n"),
    LLM.articleMaxTokens,
  );
  if (!draft.body || !draft.titleSearch) throw new Error("본문 생성 실패(필수 필드 누락)");
  draft.tags = (draft.tags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, TAG_COUNT);
  return draft;
}
