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
  // ★2026-07-31 실측 보강 — 실제 오류가 난 글 두 편이 여기서 걸러지지 않아 웹 검증 없이 생성됐다.
  //  'irp이전'(퇴직소득 분류과세 오류)·'cma계좌개설'(예금자보호 오해) 둘 다 위 목록에 걸리는 단어가 하나도 없었다.
  //  상품명·제도명은 '금리/한도' 같은 일반어를 안 쓰고도 시점 민감할 수 있다 — 이름 자체를 등재한다.
  "irp", "isa", "cma", "퇴직", "퇴사", "실업급여", "연차", "임의계속",
  "증권", "계좌", "펀드", "채권", "주식", "종목", "우량주",
  "건강보험", "국민연금", "4대보험", "보험",
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
