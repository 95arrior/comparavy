import { finalGate, adsenseUnsafe } from "../lib/cardFinalGate.ts";
const cases = [
  { c: { keyword: "강서구 평생교육이용권", title: "강서구 평생교육이용권 2차 지원 신청 방법과 사용처" }, drop: "region_niche" },
  { c: { keyword: "대구 섬유염색업 버팀이음", title: "대구 섬유염색업 고용안정 버팀이음 프로젝트 신청 대상" }, drop: "region_niche" },
  { c: { keyword: "서울시 출산가구 주거비", title: "서울시 무주택 출산가구 720만원 주거비 지원" }, drop: null },
  { c: { keyword: "동탄 무순위 청약", title: "동탄 레이크파크 무순위 줍줍, 접수 전 확인" }, drop: null },
  { c: { keyword: "유니콘브릿지", title: "2026 유니콘브릿지 최종 선정, 지원금 받기" }, drop: "dead_event" },
  { c: { keyword: "삼성전자 실적", title: "삼성전자 2분기 실적발표 정리" }, drop: "newsy" },
  { c: { keyword: "일시적1가구2주택", title: "스톡옵션 전에 확인하면 좋은 것" }, drop: "title_keyword_mismatch" },
  { c: { keyword: "신혼부부 혼인증여공제", title: "신혼부부 3억원대 혼인증여공제 100% 활용하는 법" }, drop: null },
  { c: { keyword: "식품기업 정부지원금", title: "식품 기업 최대 1360만원 정부지원금…11월까지 신청" }, drop: "b2b_audience" },
  { c: { keyword: "중소기업청년지원금", title: "중소기업청년지원금 받을 수 있는 조건" }, drop: null },
  { c: { keyword: "소상공인 스마트상점", title: "소상공인 스마트상점 기술 지원, 최대 500만원" }, drop: null },
  { c: { keyword: "강제동원 위로금", title: "한일청구권 협정 강제동원 피해자, 위로금과 지원금 대상 확대 전망" }, drop: "sensitive" },
  { c: { keyword: "전기차 구매 보조금", title: "2026년 전기차 구매 보조금, 테슬라·현대차·기아 모델별 지원액 비교" }, drop: null },
  { c: { keyword: "경영혁신 외식서비스 지원 신청", title: "[경북] 2026년 경영혁신 외식서비스 지원 사업 참가 접수, 7월 12일 마감" }, drop: "region_niche" },
  { c: { keyword: "경남은행 파킹통장", title: "경남은행 파킹통장 금리, 최고 조건 정리" }, drop: null },
  { c: { keyword: "경기 침체 대비", title: "경기 침체 대비, 비상금 통장 만드는 법" }, drop: null },
  { c: { keyword: "환경공단 해외진출 지원금", title: "환경공단 순환경제 우수기업 해외진출 지원금 신청" }, drop: "b2b_audience" },
  { c: { keyword: "원산지검증 대응 지원 신청", title: "원산지검증 대응 지원 신청, 7월 18일 마감" }, drop: "b2b_audience" },
  { c: { keyword: "청년 해외취업 지원금", title: "청년 해외취업 K-Move 지원금, 신청 방법" }, drop: null },
  { c: { keyword: "광주 입학지원금", title: "광주 신입생 30만원 입학지원금 신청 자격·일정·서류" }, drop: "region_niche" },
  { c: { keyword: "서울 전세보증금 반환", title: "서울 전세보증금 반환 절차, 집주인이 안 줄 때" }, drop: null },
  { c: { keyword: "인천공항 환전", title: "인천공항 환전 수수료 아끼는 법" }, drop: null },
  // ★2026-07-14 실측 3종 — B2C 신호('소상공인')로도 구제 불가한 행사·행정, 공약 단계 유령 제도
  { c: { keyword: "소상공인 쇼케이스데이", title: "제11회 소상공인 쇼케이스데이 발표 희망기업 접수, 8월 10일 마감" }, drop: "b2b-hard" },
  { c: { keyword: "백년소상공인 모집", title: "백년소상공인 모집(재지정) 공고 접수, 7월 29일 마감" }, drop: "b2b-hard" },
  { c: { keyword: "고창군 기본소득", title: "고창군 기본소득 시범도시 2028년 신청 대상자 예상" }, drop: "speculative" },
  { c: { keyword: "소상공인 정책자금", title: "소상공인 정책자금 신청 조건과 금리, 순서대로 정리" }, drop: null },
  { c: { keyword: "백년가게 혜택", title: "백년가게로 지정되면 받는 혜택 총정리" }, drop: null },
  // ★2026-07-15 SERP 실측 자료 — '계산기'는 공식 위젯 잠식 유형(블로그 비중 36%), 채널 무관 하드컷.
  //  '계산기사용법' 같은 뒤에 글자가 붙는 조어는 도구 검색이 아닐 수 있어 통과(경계 확인).
  { c: { keyword: "4대보험 계산기", title: "4대보험 계산기, 내 월급 실수령액 확인" }, drop: "answer_tool" },
  { c: { keyword: "부동산 양도세 계산기", title: "부동산양도세계산기, 꼭 알아야 할 것들" }, drop: "answer_tool" },
  { c: { keyword: "라미네이트 비용", title: "라미네이트 비용, 병원마다 다른 이유" }, drop: null },
  { c: { keyword: "연말정산 부양가족 등록", title: "연말정산 부양가족 등록, 순서대로 하는 법" }, drop: null },
];
let fail = 0;
for (const { c, drop } of cases) {
  const g = finalGate([c]);
  const got = g.drops[0]?.reason ?? null;
  const ok = got === drop;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "|", c.title.slice(0, 30), "→", got ?? "통과");
}
// ★애드센스 게이트(WP 전용) — 부적합 3 + 통과 3
const ad = [
  ["토토 사이트 환급", true], ["휴대폰 소액결제 현금화 방법", true], ["개인회생 브로커 후기", true],
  ["재산세 카드 납부 혜택", false], ["IRP 계좌 개설", false], ["전세보증금 반환보증", false],
];
for (const [t, bad] of ad) {
  const got = adsenseUnsafe(t) != null;
  const ok = got === bad;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| adsense |", t, "→", got ? "부적합" : "통과");
}
process.exit(fail ? 1 : 0);
