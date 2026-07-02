import type { ArticlePromptInput } from "./articlePrompt";

// ★시점 민감 판별 — 웹 검색을 '필요한 글에만' 붙여 비용·지연·쿼터를 아낀다.
//  금융·정책·부동산·세금처럼 수치가 자주 바뀌는 주제만 실시간 검증(web_search) 대상.
//  여행·레시피·취미 글엔 검색이 불필요 → 원가·속도 유지.

// 시점 민감 키워드(부분일치). 금융·정책·부동산·세제·요금·수치성.
const SENSITIVE_TERMS = [
  // 금융·금리
  "금리", "이자", "예금", "적금", "통장", "파킹", "대출", "주담대", "전세대출", "신용대출",
  "ltv", "dsr", "dti", "한도", "우대", "예금자보호",
  // 정책·지원금
  "지원금", "정책", "보조금", "환급", "공제", "세금", "세율", "연말정산", "종합소득세",
  "청년", "신생아", "디딤돌", "버팀목", "특례", "규제", "개편", "인상", "인하", "동결",
  // 부동산
  "부동산", "청약", "분양", "전세", "월세", "시세", "공시가", "재건축", "재개발",
  // 투자·시황
  "주가", "환율", "코스피", "배당", "연금", "etf", "공모주",
  // 요금·가격·시의성
  "요금", "가격", "인상률", "수수료", "보험료", "실비", "최신", "올해", "이번 달", "이번달",
];

// 시점 민감 업종(전문 금융/부동산 계열이면 대체로 검증 필요)
const SENSITIVE_VERTICALS = new Set(["professional"]);

export function isTimeSensitive(input: Pick<ArticlePromptInput, "keyword" | "angle" | "vertical" | "newsContext">): boolean {
  // 이슈 글감(뉴스 근거 있음)은 정의상 시점 민감 → 항상 검증
  if (input.newsContext && input.newsContext.trim()) return true;
  if (input.vertical && SENSITIVE_VERTICALS.has(input.vertical)) return true;
  const hay = `${input.keyword ?? ""} ${input.angle ?? ""}`.toLowerCase();
  // 연도 표기(2024~2027 등)가 들어간 글도 시점 민감으로 간주
  if (/20(2[3-9]|3[0-9])/.test(hay)) return true;
  return SENSITIVE_TERMS.some((t) => hay.includes(t));
}
