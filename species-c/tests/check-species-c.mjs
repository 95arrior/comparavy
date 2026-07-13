// [species-c] 자체 회귀 — 실패 사례가 나올 때마다 여기 박제(기존 시스템의 회귀 문화 복제).
// 실행: npx tsx species-c/tests/check-species-c.mjs
import { runProductGate } from "../gate.ts";
import { runQualityGate, checkTitleKeyword, checkTitleHook15 } from "../finalGate.ts";
import { countSample } from "../reviews.ts";
import { DISCLOSURE_TEXT, LINK_MARKER } from "../config.ts";

let fail = 0;
const t = (name, ok) => { if (!ok) { fail++; console.log("FAIL", name); } else console.log("ok  ", name); };

const product = { url: "https://smartstore.naver.com/x/1", name: "박카 차량용 탈취제 200ml", price: 15900, rating: 4.6, reviewCount: 2847, category: "차량용품", discountPct: 10, commissionPct: 12, reviewsText: "", myExperience: null, source: "manual" };

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

// ── 품질 게이트
const okBody = [
  "출근길에 에어컨을 트는 순간 훅 올라오는 쉰내, 차 에어컨 냄새 때문에 검색까지 하게 되는 그 마음 압니다.",
  DISCLOSURE_TEXT,
  "전체 리뷰 2,847건 중 최근 30건을 직접 정독했습니다. \"하루 만에 잡혔\" 같은 얘기가 반복됩니다.",
  "[이미지: 리뷰 분석 카드]",
  "이 탈취제는 분사형이라 시공이 없습니다. 구매자들이 말하길 설치 부담이 없다는 점을 가장 많이 꼽습니다.",
  "다만 향이 강하다는 아쉬움도 있습니다. 무향을 찾는 분께는 못 팝니다.",
  "지금 같은 장마철이 냄새가 가장 심해지는 시기입니다.",
  "[이미지: CTA 카드]",
  LINK_MARKER,
  "이런 분께 맞습니다. 차에서 냄새가 나기 시작한 분. 셀프 시공이 부담스러운 분.",
  "[이미지: 체크리스트 카드]",
  "오늘도 쉰내 나는 차로 출근하실 건가요. 판매왕이 깐깐하게 고른 이유가 있습니다.",
  LINK_MARKER,
].join("\n\n");
const okDraft = { titleSearch: "차 에어컨 냄새, 시공 없이 잡는 방법", titleHook: "쉰내 나는 차, 판매왕의 처방", body: okBody, tags: ["차에어컨냄새", "차량탈취제"] };
{
  t("정상 본문 통과", runQualityGate(okDraft, product).pass);
  t("대가성 문구 누락 실격", !runQualityGate({ ...okDraft, body: okBody.replace(DISCLOSURE_TEXT, "") }, product).pass);
  t("금지 표현(무조건) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n무조건 사세요." }, product).pass);
  t("가짜 사용감 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n제가 직접 써보니 좋더라고요." }, product).pass);
  t("실사용 입력 있으면 사용감 허용", runQualityGate({ ...okDraft, body: okBody + "\n\n제가 직접 써보니 향이 이틀 갑니다." }, { ...product, myExperience: "이틀 써봄" }).pass);
  t("이모지 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n좋아요 ✅" }, product).pass);
  t("링크 마커 1개 실격", !runQualityGate({ ...okDraft, body: okBody.replace(LINK_MARKER, "") }, product).pass);
  t("긴 인용(15자 초과) 실격", !runQualityGate({ ...okDraft, body: okBody + '\n\n"이 부분은 정말 길고 긴 리뷰 인용문이라서 실격되어야 한다"' }, product).pass);
  t("풀네임 4회 반복 실격", !runQualityGate({ ...okDraft, body: okBody + `\n\n${product.name} ${product.name} ${product.name} ${product.name}` }, product).pass);
  t("마크다운 유출 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n## 소제목" }, product).pass);
  t("제목-키워드 정합", checkTitleKeyword("차 에어컨 냄새 잡는 법", "차 에어컨 냄새") === null);
  t("제목-키워드 누락 감지", checkTitleKeyword("여름철 차량 관리", "차 에어컨 냄새") !== null);
  t("앞 15자 훅 — 키워드 뒤로 밀리면 실격", checkTitleKeyword("여름 장마철 관리 꿀팁 총정리와 차 에어컨 냄새", "차 에어컨 냄새") !== null);
}

// ── 라운드1 A·B 회귀(실측 사고 박제)
{
  const M = { sampleSize: 30, totalReviews: 2847 };
  t("표본 카운터 — 별점 마커 8건", countSample("★5 좋아요 어쩌고 저쩌고 길게 씁니다 스물다섯자 넘김\n★5 둘째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★4 셋째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★5 넷째 리뷰도 대충 길게 씁니다 스물다섯자 넘김\n★5 다섯째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★3 여섯째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★5 일곱째 리뷰 대충 길게 씁니다 스물다섯자 넘김\n★5 여덟째 리뷰 대충 길게 씁니다 스물다섯자 넘김").sampleSize === 8);
  t("부정 리뷰 감지(★3)", countSample("★3 별로예요 소음이 크고 생각보다 건조가 느립니다").negativeCount === 1);
  t("정상 본문(표준 문구) 통과", runQualityGate(okDraft, product, M).pass);
  t("사고 박제 — 전체 건수로 분석 주장 실격", !runQualityGate({ ...okDraft, body: okBody.replace("전체 리뷰 2,847건 중 최근 30건을 직접 정독했습니다", "실구매자 2,847건의 리뷰를 읽어봤습니다") }, product, M).pass);
  t("사고 박제 — 절대 횟수(6회 언급) 실격", !runQualityGate({ ...okDraft, body: okBody + "\n\n금방 말라요가 6회 언급되었습니다." }, product, M).pass);
  t("실사용 없는데 제목 후기 실격", !runQualityGate({ ...okDraft, titleSearch: "차 에어컨 냄새 탈취제 후기" }, product, M).pass);
  t("실사용 있으면 후기 허용", runQualityGate({ ...okDraft, titleSearch: okDraft.titleSearch }, { ...product, myExperience: "2주 사용" }, M).pass);
  t("실사용 없는데 태그 내돈내산 실격", !runQualityGate({ ...okDraft, tags: [...okDraft.tags, "내돈내산"] }, product, M).pass);
  t("훅15 — 파일럿 사고 제목 실격", checkTitleHook15("신발 냄새 없애는 법 신발 건조기 추천") !== null);
  t("훅15 — 숫자 훅 통과", checkTitleHook15("3만원대 신발 건조기, 살까 말까") === null);
  t("훅15 — 호명 훅 통과", checkTitleHook15("장마철 신발 냄새로 고민이라면") === null);
  t("훅15 — 질문 훅 통과", checkTitleHook15("신발 쉰내, 건조기로 잡힐까?") === null);
}

console.log(fail ? `\n${fail} FAILED` : "\nALL PASS");
process.exit(fail ? 1 : 0);
