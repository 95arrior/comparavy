import { finalGate } from "../lib/cardFinalGate.ts";
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
];
let fail = 0;
for (const { c, drop } of cases) {
  const g = finalGate([c]);
  const got = g.drops[0]?.reason ?? null;
  const ok = got === drop;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "|", c.title.slice(0, 30), "→", got ?? "통과");
}
process.exit(fail ? 1 : 0);
