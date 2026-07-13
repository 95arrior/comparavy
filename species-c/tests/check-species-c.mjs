// [species-c] 자체 회귀 — 실패 사례가 나올 때마다 여기 박제(기존 시스템의 회귀 문화 복제).
// 실행: npx tsx species-c/tests/check-species-c.mjs
import { runProductGate } from "../gate.ts";
import { runQualityGate, checkTitleKeyword, checkTitleHook15, checkTitleSingleNeedle } from "../finalGate.ts";
import { judgeGolden } from "../keywords.ts";
import { countSample } from "../reviews.ts";
import { DISCLOSURE_TEXT, MARKER_LINK_1, MARKER_LINK_2, MARKER_PRODUCT_IMG, MARKER_REVIEW_CARD } from "../config.ts";

let fail = 0;
const t = (name, ok) => { if (!ok) { fail++; console.log("FAIL", name); } else console.log("ok  ", name); };

const product = { url: "https://smartstore.naver.com/x/1", name: "박카 차량용 탈취제 200ml", price: 15900, rating: 4.6, reviewCount: 2847, category: "차량용품", discountPct: 10, commissionPct: 12, reviewsText: "", myExperience: null, source: "manual" };
const M = { sampleSize: 30, totalReviews: 2847 };

// ── 상품 게이트
{
  const g = runProductGate(product, new Date("2026-07-15"));
  t("정상 상품 통과", g.pass);
  t("7월 시즌(차량 냄새) 가산", g.seasonScore > 0);
  t("리뷰 미달 실격", !runProductGate({ ...product, reviewCount: 120 }, new Date("2026-07-15")).pass);
  t("평점 미달 실격", !runProductGate({ ...product, rating: 4.1 }, new Date("2026-07-15")).pass);
  t("수수료 금액 미달 실격(1만원 x 5% = 500원)", !runProductGate({ ...product, price: 10000, commissionPct: 5 }, new Date("2026-07-15")).pass);
  t("가격 상한 초과 실격", !runProductGate({ ...product, price: 89000 }, new Date("2026-07-15")).pass);
}

// ── 품질 게이트 — 문체 v2 규격 픽스처(도입 대사·이모지 8·하이라이트 2·문단 2문장)
const okBody = [
  DISCLOSURE_TEXT,
  '"이 냄새 뭐야, 또 시작이네" 😩',
  "출근길에 에어컨을 트는 순간 쉰내가 훅 올라옵니다. 차 에어컨 냄새 때문에 여기까지 검색하셨을 겁니다.",
  "문제는 냄새가 아니라 반복입니다.",
  MARKER_PRODUCT_IMG,
  '전체 리뷰 2,847건 중 최근 30건을 직접 정독했습니다. "하루 만에 잡혔" 같은 얘기가 반복됩니다.',
  MARKER_REVIEW_CARD,
  "정말 뿌리기만 하면 될까요? 🤔",
  "이 탈취제는 분사형이라 시공이 없습니다. ==구매자들이 가장 많이 꼽은 장점도 설치 부담이 없다는 점입니다.==",
  "다만 향이 강하다는 아쉬움도 있습니다. 무향을 찾는 분께는 못 팝니다.",
  "왜 장마철에 사야 할까요? ☔",
  "지금 같은 장마철이 냄새가 가장 심해지는 시기입니다. ==냄새는 습기가 마르기 전에 잡는 게 빠릅니다.==",
  "매일 아침이 상쾌해지는 상상, 해보셨나요 ✨",
  MARKER_LINK_1,
  "이런 분께 맞습니다 🙌",
  "차에서 냄새가 나기 시작한 분. 셀프 시공이 부담스러운 분.",
  "오늘도 그 냄새 참고 타실 건가요 😢",
  "판매왕이 깐깐하게 고른 이유가 있습니다 😊",
  "속 시원하게 해결하고 뽀송한 아침 맞으세요 💧",
  MARKER_LINK_2,
].join("\n\n");
const okDraft = { titleSearch: "차 에어컨 냄새, 3분이면 잡히는 이유", titleHook: "쉰내 나는 차, 판매왕의 처방", body: okBody, tags: ["차에어컨냄새", "차량탈취제"] };
{
  t("v2 정상 본문 통과", runQualityGate(okDraft, product, M).pass);
  t("대가성 문구 누락 실격", !runQualityGate({ ...okDraft, body: okBody.replace(DISCLOSURE_TEXT, "") }, product, M).pass);
  t("금지 표현(무조건) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n무조건 사세요." }, product, M).pass);
  t("가짜 사용감 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n제가 직접 써보니 좋더라고요." }, product, M).pass);
  t("실사용 입력 있으면 사용감 허용", runQualityGate({ ...okDraft, body: okBody + "\n\n제가 직접 써보니 향이 이틀 갑니다." }, { ...product, myExperience: "이틀 써봄" }, M).pass);
  t("링크 마커 누락 실격", !runQualityGate({ ...okDraft, body: okBody.replace(MARKER_LINK_2, "") }, product, M).pass);
  t("긴 리뷰 인용(15자 초과) 실격", !runQualityGate({ ...okDraft, body: okBody + '\n\n"이 부분은 정말 길고 긴 리뷰 인용문이라서 실격되어야 한다"' }, product, M).pass);
  t("풀네임 4회 반복 실격", !runQualityGate({ ...okDraft, body: okBody + `\n\n${product.name} ${product.name} ${product.name} ${product.name}` }, product, M).pass);
  t("마크다운 유출 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n## 소제목" }, product, M).pass);
  t("제목-키워드 정합", checkTitleKeyword("차 에어컨 냄새 잡는 법", "차 에어컨 냄새") === null);
  t("제목-키워드 누락 감지", checkTitleKeyword("여름철 차량 관리", "차 에어컨 냄새") !== null);
  t("앞 15자 훅 — 키워드 뒤로 밀리면 실격", checkTitleKeyword("여름 장마철 관리 꿀팁 총정리와 차 에어컨 냄새", "차 에어컨 냄새") !== null);
}

// ── 라운드1 A·B 회귀(실측 사고 박제)
{
  t("표본 카운터 — 별점 마커 8건", countSample("★5 좋아요 어쩌고 저쩌고 길게 씁니다 스물다섯자 넘김\n★5 둘째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★4 셋째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★5 넷째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★5 다섯째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★3 여섯째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★5 일곱째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★5 여덟째 리뷰 대충 길게 씁니다 스물다섯자 넘김").sampleSize === 8);
  t("부정 리뷰 감지(★3)", countSample("★3 별로예요 소음이 크고 생각보다 건조가 느립니다").negativeCount === 1);
  t("사고 박제 — 전체 건수로 분석 주장 실격", !runQualityGate({ ...okDraft, body: okBody.replace("전체 리뷰 2,847건 중 최근 30건을 직접 정독했습니다", "실구매자 2,847건의 리뷰를 읽어봤습니다") }, product, M).pass);
  t("사고 박제 — 절대 횟수(6회 언급) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n금방 말라요가 6회 언급되었습니다." }, product, M).pass);
  t("실사용 없는데 제목 후기 실격", !runQualityGate({ ...okDraft, titleSearch: "차 에어컨 냄새 3일 탈취제 후기" }, product, M).pass);
  t("내돈내산 — 실사용 없어도 실격", !runQualityGate({ ...okDraft, tags: [...okDraft.tags, "내돈내산"] }, product, M).pass);
  t("내돈내산 — ★실사용 있어도 실격(규정: 대가성 글)", !runQualityGate({ ...okDraft, tags: [...okDraft.tags, "내돈내산"] }, { ...product, myExperience: "2주 사용" }, M).pass);
  t("규정 — 대가성 문구가 첫 줄 아니면 실격", !runQualityGate({ ...okDraft, body: okBody.replace(DISCLOSURE_TEXT + "\n\n", "") + "\n\n" + DISCLOSURE_TEXT }, product, M).pass);
  t("규정 — 공식 문구 정확 일치(변형 실격)", !runQualityGate({ ...okDraft, body: okBody.replace(DISCLOSURE_TEXT, "이 포스팅은 쇼핑 커넥트 활동으로 수수료를 받을 수 있습니다.") }, product, M).pass);
  t("규정 — 구 마커 잔존 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n[이미지: CTA 카드]" }, product, M).pass);
  t("훅15 — 파일럿 사고 제목 실격", checkTitleHook15("신발 냄새 없애는 법 신발 건조기 추천") !== null);
  t("훅15 — 숫자 훅 통과", checkTitleHook15("3만원대 신발 건조기, 살까 말까") === null);
  t("훅15 — 호명 훅 통과", checkTitleHook15("장마철 신발 냄새로 고민이라면") === null);
  t("훅15 — 질문 훅 통과", checkTitleHook15("신발 쉰내, 건조기로 잡힐까?") === null);
}

// ── 문체 v2 회귀(표면 리듬)
{
  t("v2 — 문단 과밀(3문장) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n첫 문장입니다. 둘째 문장입니다. 셋째 문장까지 이어지면 벽돌입니다." }, product, M).pass);
  t("v2 — 이모지 0개(리듬 미적용) 실격", !runQualityGate({ ...okDraft, body: okBody.replace(/[😩🤔☔✨🙌😢😊💧]/gu, "") }, product, M).pass);
  t("v2 — 이모지 13개(과다) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n좋아요 😊😊😊😊😊" }, product, M).pass);
  t("v2 — 수치 문장 이모지 실격", !runQualityGate({ ...okDraft, body: okBody.replace("판매왕이 깐깐하게 고른 이유가 있습니다 😊", "가격은 15,900원이라 부담이 없어요 😊") }, product, M).pass);
  t("v2 — 대가성 문단 이모지 실격", !runQualityGate({ ...okDraft, body: okBody.replace(DISCLOSURE_TEXT, DISCLOSURE_TEXT + " 😊").replace("판매왕이 깐깐하게 고른 이유가 있습니다 😊", "판매왕이 깐깐하게 고른 이유가 있습니다") }, product, M).pass);
  t("v2 — 단점 문장 이모지 실격", !runQualityGate({ ...okDraft, body: okBody.replace("다만 향이 강하다는 아쉬움도 있습니다.", "다만 향이 강하다는 아쉬움도 있어요 😅.").replace("판매왕이 깐깐하게 고른 이유가 있습니다 😊", "판매왕이 깐깐하게 고른 이유가 있습니다") }, product, M).pass);
  t("v2 — 하이라이트 0곳 실격", !runQualityGate({ ...okDraft, body: okBody.replace(/==/g, "") }, product, M).pass);
  t("v2 — 제목 이모지 실격", !runQualityGate({ ...okDraft, titleSearch: okDraft.titleSearch + " 😊" }, product, M).pass);
  t("v2 — 특수 심볼(화살표) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n순서를 지키세요 → 중요합니다" }, product, M).pass);
  t("v2 — 도입 대사 31자 초과 실격", !runQualityGate({ ...okDraft, body: okBody.replace('"이 냄새 뭐야, 또 시작이네"', '"이 냄새 뭐야 도대체 왜 매일 아침마다 이렇게 지독하게 올라오는 거야"') }, product, M).pass);
}

// ── 키워드 확장 라운드(황금 판정·1글 1바늘)
{
  t("황금 — 3조건 충족", judgeGolden(800, 400, 2).golden === true);
  t("황금 — 검색량 미달(99) 탈락", judgeGolden(99, 400, 2).golden === false);
  t("황금 — 검색량 초과(2001) 탈락", judgeGolden(2001, 400, 2).golden === false);
  t("황금 — 경쟁 초과(500) 탈락", judgeGolden(800, 500, 2).golden === false);
  t("황금 — 여정 미만점 탈락", judgeGolden(800, 400, 1).golden === false);
  t("골드 뱃지 — blog_total<300", judgeGolden(800, 299, 1).goldBadge === true);
  t("1바늘 — 서브 문구가 제목에 오면 실격", checkTitleSingleNeedle("차 에어컨 냄새와 차량용 탈취제 추천", ["차량용 탈취제 추천"]) !== null);
  t("1바늘 — 메인만 있으면 통과", checkTitleSingleNeedle("차 에어컨 냄새, 3분이면 잡히는 이유", ["차량용 탈취제 추천"]) === null);
}

console.log(fail ? `\n${fail} FAILED` : "\nALL PASS");
process.exit(fail ? 1 : 0);
