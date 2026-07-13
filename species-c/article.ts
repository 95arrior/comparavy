// [species-c] §7 본문 생성 — 뼈대 9단 고정, 심리 임무는 브리프에서 주입, 문체는 style-guide.md에서 주입.
import fs from "node:fs";
import path from "node:path";
import { ARTICLE_LENGTH, DISCLOSURE_TEXT, FAKE_REVIEW_WORDS, LLM, MARKER_LINK_1, MARKER_LINK_2, MARKER_PRODUCT_IMG, SAMPLE_MIN_FOR_NUMBERS, samplePhrase, TAG_COUNT } from "./config";
import { askJson } from "./llm";
import type { ArticleDraft, ArticleType, KeywordResult, Product, PsychBrief, ReviewMining } from "./types";

const STYLE_GUIDE = fs.readFileSync(path.join(__dirname, "style-guide.md"), "utf8");

const TYPE_NOTE: Record<ArticleType, string> = {
  "problem-solve": "유형=문제해결형(기본 뼈대 그대로).",
  compare: "유형=비교형: 섹션 4를 두 상품 비교 구조로, [이미지: 비교표 카드] 마커를 섹션 4에 추가.",
  "how-to-choose": "유형=고르는법형: 섹션 4 앞부분에 '고르는 기준 3가지'를 먼저 제시한 뒤 이 상품이 그 기준에 어떻게 맞는지로 전개.",
  "season-preempt": "유형=시즌선점형: 도입을 다가오는 시즌 이벤트 프레임(지금 준비해야 하는 이유)으로.",
};

const ANGLE_VARIANTS = [
  "리뷰 분석 중심(기본) — 리뷰 집계가 글의 중심 증거",
  "문제 해설 중심 — '왜 이 문제가 생기는지' 원리 설명을 도입~섹션3에 강화(리뷰는 보조 증거로)",
  "사용 팁 중심 — 올바른 사용법·주의점(환기·대기 시간 등)을 중심 섹션으로(리뷰의 사용 노하우 발췌)",
  "구매 가이드 중심 — 이 카테고리를 고를 때 체크 포인트 3~5개를 먼저 세우고, 이 제품이 각 항목에 어디까지 해당하는지로 전개",
];

export async function writeArticle(p: Product, kw: KeywordResult, brief: PsychBrief, reviews: ReviewMining, angleIdx = 0): Promise<ArticleDraft> {
  const angle = ANGLE_VARIANTS[angleIdx % ANGLE_VARIANTS.length]!;
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
      `[글 변주 축(다양화 — 매 글 같은 리뷰분석형 반복 금지)] ${angle}. 뼈대 순서는 유지하되 이 축이 글의 무게중심이다.`,
      `[뼈대 — 순서 고정, 번호는 출력하지 않는다]`,
      `0. ★본문 맨 첫 줄(다른 어떤 것보다 먼저, 단독 문단): 정확히 이 문구 그대로 — "${DISCLOSURE_TEXT}"`,
      `1. 문제 공감 도입(리듬 v2 3단 고정): ①독자 속마음 따옴표 대사 1줄(브리프의 장면에서, 30자 이내 — 이 따옴표는 리뷰 인용과 별개로 허용) ②상황 짧은 서술 1~2문장 ③문제 선언 1문장 ④★이득 한 줄(교본 흡수): 이 글에서 얻는 것을 구체로 — 할인 정보가 있으면 그것(${p.discountPct ? `현재 ${p.discountPct}% 할인 중` : "할인 정보 없음 — 지어내지 마"}), 없으면 해결 약속 한 줄. 메인 키워드 자연 포함. 도입 끝에 단독 줄로: ${MARKER_PRODUCT_IMG}`,
      `★이미지·링크 지그재그 배치(유저 확정 — 링크가 하단에 몰리면 이탈): 순서는 [이미지(도입)] → 본문 → [링크 1(리뷰 직후)] → 본문 → [이미지] → 본문 → [이미지] → 본문 → [링크 2(마무리)]. ${MARKER_PRODUCT_IMG}는 3~5곳(글마다 달리 — 도입 1곳 고정, 나머지는 스펙·시나리오·단점·체크리스트 사이), ★어떤 마커도 연속 배치 금지 — 마커 사이에 본문 문단 2개 이상.`,
      `2. 리뷰 집계: 위 신뢰 회계 표준 문장으로 열고 + 만족 TOP3. 인용은 나열형이 자연스럽다: "'보송보송' '냄새가 줄었다' 같은 의견이 반복되었습니다"(구체 표현 2~3개 나열, 각 15자 이내). ★리뷰→해석 의무: 각 만족 포인트 뒤에 '왜 이 후기가 나오는지, 어떤 사용 상황과 연결되는지' 해석 한 문장을 붙인다(예: 젤 제형이라 안 흘러내린다는 후기 → "세로면 실리콘에 쓸 때 이 특징이 실제 편의와 연결되는 부분이에요"). 단순 요약 나열로 끝내면 실격감이다. ★이 섹션 끝에 단독 줄로: ${MARKER_LINK_1} (리뷰 신뢰가 쌓인 직후가 첫 링크 자리 — 앞 문장이 "지금까지 리뷰가 궁금하게 했다면 아래에서 실물을 확인할 수 있어요" 류로 링크 카드를 받는다).`,
      `3. 핵심 스펙·사용 맥락: 스펙 나열이 아니라 '사게 만드는 확인'에 답하는 순서로. ★'나한테 맞나' 실전 질문 3~5개에 답한다(구매를 좌우하는 정보): 적용 범위(어디에 쓸 수 있는지)·오래된/심한 경우에도 되는지·냄새와 자극 정도·사용 후 대기 시간·환기 필요 여부 등 — ★근거는 리뷰·입력 정보에 실제로 있는 것만, 근거 없으면 "이 부분은 상세페이지에서 확인하세요"로 정직하게. 이 섹션에 '사용 시나리오' 한 장면을 가정형으로 넣는다("비 오는 날 퇴근하고 꽂아두면, 다음 날 아침엔 ~" — ★"제가 해봤다"가 아니라 "~하면 ~됩니다" 프레임). ${TYPE_NOTE[kw.articleType]}`,
      `4. 단점 인정: 불만 TOP2 중 1~2개 정직하게 + 누구에게는 문제고 누구에게는 아닌지 구분. 화법은 "~에 민감한 분이라면 구매 전 이 부분은 꼭 고려해 보세요"(★"못 팝니다"류 거절 화법 금지 — 브랜드 비친화).`,
      `5. CTA: 구매 제안 2~3문장 — ★행동 지침형: 무엇을 어떻게 확인·적용하는지 순서로(확인 안 된 쿠폰·세일 단정 금지). 끝에 단독 줄로 세 번째 ${MARKER_PRODUCT_IMG}.`,
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
