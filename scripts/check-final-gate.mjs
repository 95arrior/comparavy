import fs from "node:fs";
import { finalGate, adsenseUnsafe, topicIntent, weekendAdjust, consumeOnlyTopic } from "../lib/cardFinalGate.ts";
import { nearDuplicate } from "../lib/diversity.ts";
import { isStickyFrame, pickDiverseCopy } from "../lib/thumbCopyDiversity.ts";
import { isPushable, pushGain, isZeroClickQuery } from "../lib/serpCtr.ts";
import { pruneDeadTocLinks } from "../lib/wordpress.ts";
import { lacksConditionBranch, duplicateSlotSubjects } from "../lib/editorial.ts";
import { parseQueryText, clusterQueries } from "../lib/hubTopics.ts";
import { scanLifespan } from "../lib/topicLifespan.ts";
const cases = [
  { c: { keyword: "강서구 평생교육이용권", title: "강서구 평생교육이용권 2차 지원 신청 방법과 사용처" }, drop: "region_niche" },
  // ★2026-08-02 유저 화면 실측 — 이게 카드로 떴다. poolScore가 '청년·지원'을 전국민 신호로 보고
  //  +3을 줘서 지역 협소성을 상쇄했다. 그 프로그램은 의정부 청년만 신청한다.
  //  전국민 주제어가 붙었다고 전국 수요가 되지는 않는다.
  { c: { keyword: "의정부시 청년 지원", title: "의정부시 청년 투자환경, 일자리·주거 원스톱 지원 프로그램" }, drop: "region_niche" },
  { c: { keyword: "천안시 청년 지원금", title: "천안시 청년 월세 지원금 신청 조건과 방법" }, drop: "region_niche" },
  // ★광역은 살려야 한다 — 문턱을 일괄로 올렸다가 아래 둘이 죽었고 기존 회귀가 잡아냈다.
  //  광역은 전국 인지도가 있어 타지역 사람도 검색한다. 문제는 기초지자체다.
  { c: { keyword: "경기도 청년 지원", title: "경기도 청년 기본소득 신청 조건과 지급일 정리" }, drop: null },
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
  // ★2026-07-17 AI 브리핑 전략 — 정의형은 AI 요약이 종결(제로클릭) 하드컷, 케이스 분기 신호가 키워드에 있으면 구제.
  //  판정은 keyword만(제목 훅형 질문은 정상). 여부·시점형은 컷 아닌 정렬 감점이라 여기선 통과여야 한다.
  { c: { keyword: "ISA 뜻", title: "ISA 뜻, 3분 정리" }, drop: "ai_one_liner" },
  { c: { keyword: "공매도 뜻", title: "공매도 뜻과 개미가 당하는 구조" }, drop: "ai_one_liner" },
  { c: { keyword: "IRP 약자", title: "IRP 약자부터 계좌 개설까지" }, drop: "ai_one_liner" },
  { c: { keyword: "ISA 세금 계산", title: "ISA 만기 세금 계산, 소득구간별로 다릅니다" }, drop: null }, // 분기 신호 '계산' 구제
  { c: { keyword: "연금저축 IRP 차이", title: "연금저축 IRP 차이, 내 소득이면 어디부터" }, drop: null },
  { c: { keyword: "국민연금 수령 나이", title: "국민연금 수령 나이, 출생연도별 정리" }, drop: null }, // 시점형 — 컷 아닌 감점 영역
  // ★2026-07-20 실측 — 증식 실패 폴백이 뉴스 원제(보고서체)를 노출: 훅 신호 없는 논문 목차형 컷
  { c: { keyword: "부동산 초과이윤 과세", title: "부동산 초과이윤 과세, 정책 변화 현황과 영향받는 주체" }, drop: "report_tone" },
  { c: { keyword: "가족법인 절세", title: "가족법인으로 절세하기, 주의할 함정과 올바른 구조설계" }, drop: "report_tone" },
  { c: { keyword: "재산세 부과 기준", title: "재산세 부과 현황이 궁금하다면? 7월 고지서 확인법" }, drop: null }, // 보고서 단어 있어도 훅(?·7월) 있으면 통과
  // ★2026-07-24 대기업/기관 사칭 대출(삼성재단대출류) 하드컷 — 실존 상품 아님(스팸·불법사금융). 정식 정부·서민금융·지원금은 통과.
  { c: { keyword: "삼성재단대출", title: "삼성재단대출 신청 조건과 한도 정리" }, drop: "scam_loan" },
  { c: { keyword: "현대그룹 대출", title: "현대그룹 대출 서류 없이 당일 승인" }, drop: "scam_loan" },
  { c: { keyword: "무직자 대출", title: "무직자 대출 가능한 곳 총정리" }, drop: "scam_loan" },
  { c: { keyword: "민생지원금 신청", title: "민생지원금 신청 방법과 대상, 언제부터 받나" }, drop: null },
  { c: { keyword: "재난지원금 대상", title: "재난지원금 대상과 신청 기간 확인" }, drop: null },
  { c: { keyword: "디딤돌 대출 조건", title: "디딤돌 대출 조건과 한도, 소득별 정리" }, drop: null },
  { c: { keyword: "햇살론 자격", title: "햇살론 자격과 신청 순서 정리" }, drop: null },
  // ★2026-07-24 스타트업 정책자금(독자=창업자 담당자 소수, B2C 신호 없음) — B2B 컷. 소상공인/청년은 B2C 신호로 통과 유지.
  { c: { keyword: "스타트업 정책자금", title: "스타트업이 놓치기 쉬운 정부지원금·정책자금 신청 체크리스트" }, drop: "b2b_audience" },
  { c: { keyword: "벤처기업 지원사업", title: "벤처기업 지원사업 모집, 신청 전 확인" }, drop: "b2b_audience" },
  { c: { keyword: "청년 창업 지원금", title: "청년 창업 지원금 신청 방법과 대상" }, drop: null },
  // ★2026-07-29 수명 컷 승격(측정 후) — 날짜·회차가 박힌 글감은 그 시점이 지나면 죽는다(루원시티 91→8, 경남 2차 추경 7).
  { c: { keyword: "루원시티 SK 리더스뷰 청약", title: "루원시티 SK 리더스뷰 불법행위 재공급 청약, 7월 13일 마감" }, drop: "dated_topic" },
  { c: { keyword: "고유가 피해지원금", title: "2차 고유가지원금 신청 대상 확인법" }, drop: "round_topic" },
  { c: { keyword: "한화포레나 안산고잔2차 무순위 청약", title: "한화포레나 안산고잔2차 무순위 청약 일정" }, drop: "round_topic" },
  // 오검출 방지 — '3기 신도시'는 수년 지속 고유명사, '전입신고 기간'의 기간·연도 표기는 시효가 아니다
  { c: { keyword: "3기 신도시 청약", title: "3기 신도시 청약, 사전청약과 뭐가 다른가요?" }, drop: null },
  { c: { keyword: "전입신고 기간", title: "전입신고 기간, 늦으면 진짜 불이익이 있나요?" }, drop: null },
  { c: { keyword: "2026년 연말정산", title: "2026년 연말정산, 달라지는 공제 한도" }, drop: null },
];
let fail = 0;
const chk_ = (c, m) => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", m); };
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
// ★근접 중복(2026-07-24 유저 실측: 'CMA 추천' ↔ 'CMA통장 추천'이 통째 통과) — true=같은 글로 잡아야, false=서로 다른 글.
//  코어 명사 환원(수식어 인픽스 '통장'·'추천' 제거)으로 잡되, 다른 금융 상품(정기예금↔정기적금)은 안 잡혀야 한다.
const dupCases = [
  ["CMA 추천", "CMA통장 추천", true],
  ["ETF 추천", "ETF 종류", true],
  ["청년도약계좌 조건", "청년도약계좌 신청 방법", true],
  ["ISA 계좌 개설 방법", "ISA 계좌 개설하는 법", true],
  ["정기예금 금리", "정기적금 금리", false],
  ["전세자금대출 금리", "주택담보대출 금리", false],
  ["국민연금 수령 나이", "건강보험 피부양자 조건", false],
];
for (const [a, b, expect] of dupCases) {
  const got = nearDuplicate(a, b);
  const ok = got === expect;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| dup |", `${a} ~ ${b}`, "→", got);
}
// ★썸네일 문구 다양성(2026-07-29 유저 실측: 발행 4편이 전부 '가장 많이 ~' 한 틀 — 목록이 한 글처럼 보였다).
//  true=어느 글에나 붙는 범용 프레임(실격), false=이 글 고유 각도.
const stickyCases = [
  ["가장 많이 헷갈리는 곳", true],
  ["가장 많이 착각하는 구간", true],
  ["가장 많이 빠지는 함정", true],
  ["여기서 가장 많이 걸립니다", true],
  ["많이들 놓칩니다", true],
  ["흔히 하는 실수", true],
  ["신청 전 5분", false],
  ["작년과 달라졌어요", false],
  ["30만원이 갈립니다", false],
  ["서류부터 챙기세요", false],
];
for (const [c, expect] of stickyCases) {
  const got = isStickyFrame(c);
  const ok = got === expect;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| sticky |", c, "→", got ? "범용(실격)" : "고유");
}
// 역할 로테이션 — ①항상 첫 후보(실수)만 집던 v3 회귀 방지 ②범용 프레임은 1차 배제 ③전부 범용이면 그래도 하나는 낸다
const roleCands = [
  { role: 1, copy: "가장 많이 틀리는 곳" }, // 범용 — 대체 후보가 있으면 절대 채택되면 안 된다
  { role: 2, copy: "서류부터 챙기세요" },
  { role: 3, copy: "30만원이 갈립니다" },
  { role: 4, copy: "조건이 나뉩니다" },
  { role: 5, copy: "신청 전 5분" },
  { role: 6, copy: "기한이 지나면" },
];
const pass = () => true;
const picks = new Set(["a1", "b7", "c3", "d9", "e5", "f2", "g8", "h4"].map((s) => pickDiverseCopy(roleCands, s, pass)));
const noSticky = [...picks].every((p) => p && !isStickyFrame(p));
const rotates = picks.size >= 3; // 시드 8개가 최소 3역할로 흩어져야(v3는 항상 1개)
for (const [name, ok] of [["범용 배제", noSticky], ["역할 분산", rotates]]) {
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| thumb-role |", name, "→", [...picks].join(" / "));
}
const onlySticky = pickDiverseCopy([{ role: 1, copy: "가장 많이 틀리는 곳" }], "seed", pass);
const okFallback = onlySticky === "가장 많이 틀리는 곳"; // 전부 범용이면 2차에서 허용(문구 없음보다 낫다)
if (!okFallback) fail++;
console.log(okFallback ? "OK " : "FAIL", "| thumb-role | 전부 범용이면 허용 →", onlySticky);

// ★승부처 판정(2026-07-29 GSC 실측: 전 키워드 5.8~7.9위·클릭 0 — 1페이지 아래쪽이 진짜 병목).
const pushCases = [
  [7.6, true],   // 저평가 우량주 찾는 법 — 노출 39, 최우선 승부처
  [5.8, true],   // 새마을금고 특판
  [10.4, true],  // 1페이지 끝자락도 승부처
  [3.2, false],  // 이미 상위 3 — 밀 대상 아님
  [10.9, false], // 2페이지 — 아직 이르다
  [24.0, false],
];
for (const [pos, expect] of pushCases) {
  const got = isPushable(pos);
  const ok = got === expect;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| push |", `${pos}위`, "→", got ? "승부처" : "제외");
}
// 순위가 나쁠수록·노출이 클수록 화력 우선순위가 높다(3위 기준 기대 클릭 증가분)
const gainOrder = pushGain(39, 7.6) > pushGain(12, 7.9) && pushGain(39, 7.6) > pushGain(39, 4.0);
if (!gainOrder) fail++;
console.log(gainOrder ? "OK " : "FAIL", "| push | 우선순위 = 노출×순위갭");

// ★제로클릭 검색어(2026-07-29 실측: '국채금리란'·'국채 뜻'이 노출 9·클릭 0) — 성과 집계에서 빼야 승부처가 가려지지 않는다.
const zeroCases = [
  ["국채금리란", true],
  ["국채 뜻", true],
  ["ISA란", true],
  ["앱테크란 무엇인가요", true],
  ["연말정산 뜻과 계산 방법", false], // 케이스 분기 신호 → 구제
  ["전세 대란", false],               // '대란' 오검출 방지
  ["저평가 우량주 찾는 법", false],
  ["새마을금고 특판", false],
];
for (const [q, expect] of zeroCases) {
  const got = isZeroClickQuery(q);
  const ok = got === expect;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "| zero-click |", q, "→", got ? "제외" : "집계");
}

// ★죽은 목차 링크(2026-07-29 유저 실측 "내부 링크가 안 눌려요" — pigtong 라이브: 목차 12개 중 toc-8~12가 대상 없음).
//  FAQ 소제목이 목차 생성 뒤에 제거돼 링크만 남았던 사고. 대상 없는 항목은 발행 전에 빠져야 한다.
{
  const toc = (items) => `<div class="ateflo-toc"><p>목차</p><ul>${items.map((i) => `<li><a href="#${i}">x</a></li>`).join("")}</ul></div>`;
  const body = `<h2 id="toc-1">A</h2><p>a</p><h2 id="toc-2">B</h2><p>b</p><h2 id="toc-3">C</h2>`;
  const withDead = pruneDeadTocLinks(toc(["toc-1", "toc-2", "toc-3", "toc-8", "toc-9"]) + body);
  const deadGone = !withDead.includes("#toc-8") && !withDead.includes("#toc-9");
  const liveKept = withDead.includes("#toc-1") && withDead.includes("#toc-2") && withDead.includes("#toc-3");
  // 살아있는 항목이 1개뿐이면 목차 블록 자체를 없앤다(빈 상자 방지)
  const allDead = pruneDeadTocLinks(toc(["toc-8", "toc-9"]) + body);
  const blockGone = !allDead.includes("ateflo-toc");
  for (const [name, ok] of [["죽은 항목 제거", deadGone], ["정상 항목 보존", liveKept], ["전멸 시 목차 삭제", blockGone]]) {
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| toc |", name);
  }
}

// ★내 조건 분기 게이트(2026-07-29 전략 회의: AI 브리핑 인용 2,900회인데 방문 3,300명 — 인용만 되고 클릭이 안 남는다).
//  true=분기 없음(재생성 대상), false=있음(통과). 실제 발행 글의 표 구조를 케이스로 박는다.
{
  const realTable = `<h2>공제 한도</h2><p>설명</p><table><tr><th>총급여 기준</th><th>공제율</th><th>900만 원 납입 시 환급액</th></tr>`
    + `<tr><td>5,500만 원 이하</td><td>16.5%</td><td>약 148만 5,000원</td></tr>`
    + `<tr><td>5,500만 원 초과</td><td>13.2%</td><td>약 118만 8,000원</td></tr></table>`; // pigtong 실제 발행 글
  const calcOnly = `<p>공제율은 소득에 따라 다릅니다.</p><p>예를 들어 총급여 4,500만 원인 직장인이 900만 원을 납입하면 16.5%를 적용해 약 148만 원을 환급받습니다.</p>`;
  const plainTable = `<table><tr><th>항목</th><th>내용</th></tr><tr><td>신청처</td><td>홈택스</td></tr><tr><td>기간</td><td>연중</td></tr></table>`; // 조건 축 없음
  const emptyCalc = `<p>예를 들어 상황에 따라 달라질 수 있습니다.</p><p>자세한 내용은 기관에 문의하세요.</p>`; // 숫자 없는 빈 '예를 들어'
  const listOnly = `<h2>신청 방법</h2><ul><li>홈택스 접속</li><li>서류 제출</li></ul><p>제도가 개편되었습니다.</p>`;
  const condCases = [
    ["실제 발행 글(조건 분기표)", realTable, false],
    ["계산 예시만 있어도 통과", calcOnly, false],
    ["조건 축 없는 단순 표", plainTable, true],
    ["숫자 없는 빈 '예를 들어'", emptyCalc, true],
    ["나열만 있는 글", listOnly, true],
  ];
  for (const [name, html, expect] of condCases) {
    const got = lacksConditionBranch(html);
    const ok = got === expect;
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| cond-branch |", name, "→", got ? "분기 없음(재생성)" : "통과");
  }
}

// ★허브 글감 클러스터링(2026-07-29 유저 실측 유입 검색어) — 뭉친 주제를 찾아야 허브를 세울 자리가 나온다.
{
  const pasted = [
    "삼성카드 발급 심사 시간 3.13%", "삼성카드 발급취소 1.88%", "삼성카드 배송조회 1.25%",
    "삼성카드 심사 기간 1.25%", "삼성카드 심사중 어디서 1.25%", "삼성카드 발급보류 1.95%",
    "채무탕감제도 2.27%", "정부 채무탕감제도 신청하는법 1.30%", "정부지원 채무탕감 법률무료상담 1.30%",
    "개인채무 탕감제도 방법 0.65%",
    "국산 전기차 추천 순위 2.27%",
  ].join("\n");
  const rows = parseQueryText(pasted);
  const cl = clusterQueries(rows, 3);
  const cores = cl.map((c) => c.core);
  const hasCard = cl.some((c) => c.core.includes("삼성카드") && c.queries.length >= 5);
  const hasDebt = cl.some((c) => c.core.includes("탕감") && c.queries.length >= 3);
  const noSingleton = cl.every((c) => c.queries.length >= 3); // 1~2개짜리는 허브 대상이 아니다
  const shareParsed = rows.some((r) => r.share === 3.13); // '3.13%' 파싱
  const noPct = !rows.some((r) => /%/.test(r.query)); // 검색어에 % 찌꺼기가 남으면 안 된다
  for (const [name, ok] of [["삼성카드 묶음", hasCard], ["채무탕감 묶음", hasDebt], ["3개 미만 제외", noSingleton], ["유입% 파싱", shareParsed], ["% 찌꺼기 제거", noPct]]) {
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| hub |", name, "→", cores.join(", ") || "(없음)");
  }
}

// ★사진 슬롯 소재 중복(2026-07-29 유저 실측: 1번 '소상공인 가게 카운터 통장' / 3번 '노트북 앞에 앉은 소상공인 사업주').
//  슬롯 설명은 유저가 이미지 도구에 그대로 붙여넣는 주문서 — 소재가 겹치면 같은 결의 그림이 두 장 나온다.
{
  const real = `<p>[사진: 소상공인 가게 카운터 통장]</p><p>[사진: 4대보험 가입 서류와 근로계약서]</p><p>[사진: 노트북 앞에 앉은 소상공인 사업주]</p>`;
  const fixed = `<p>[사진: 가게 카운터 통장]</p><p>[사진: 4대보험 가입확인서 도장]</p><p>[사진: 노트북 화면과 머그컵]</p>`;
  const josa = `<p>[사진: 통장과 계산기]</p><p>[사진: 통장을 든 손]</p>`; // 조사만 다른 중복도 잡아야
  const single = `<p>[사진: 원천징수영수증 계산기]</p>`; // 슬롯 1개는 판정 대상 아님
  const slotCases = [
    ["유저 실측(소상공인 중복)", real, true],
    ["소재 분리본", fixed, false],
    ["조사만 다른 중복", josa, true],
    ["슬롯 1개", single, false],
  ];
  for (const [name, html, expect] of slotCases) {
    const got = duplicateSlotSubjects(html);
    const ok = got === expect;
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| slot-dup |", name, "→", got ? "중복(재생성)" : "통과");
  }
}

// ★글감 수명·천장 판정(2026-07-29 — 측정 전용, 아직 차단 안 함). 주간 조회수 실측이 근거다:
//  전국·상시는 살고(은행 금리비교 136·채무탕감 128·삼성카드 87), 지역·시효·회차는 죽는다(경남 추경 7·루원시티 8·대구 10).
{
  const lifeCases = [
    ["은행 금리비교", "은행 금리비교, 내 통장에 맞는 최고 금리 찾는 법", []],
    ["정부지원 채무탕감", "정부지원 채무탕감 신청 방법, 2026년 기준으로 정리했습니다", []],
    ["삼성카드 발급조회", "삼성카드 발급조회, 심사중일 때 이렇게 확인하면 됩니다", []],
    ["경남 2차 추경 고유가 피해지원금", "경남 2차 추경 7098억 고유가 피해지원금 대상 확인법", ["province", "round"]],
    ["루원시티 SK 리더스뷰 청약", "루원시티 SK 리더스뷰 불법행위 재공급 청약, 7월 13일 마감", ["dated"]],
    ["대구 임산부 친환경 꾸러미", "대구 임산부 친환경 꾸러미, 80% 지원받고 신청하는 법", ["metro_city"]],
    ["전입신고 기간", "전입신고 기간, 늦으면 진짜 불이익이 있나요?", []], // '기간'은 시효 아님 — 오검출 방지
    ["2026년 연말정산", "2026년 연말정산, 달라지는 공제 한도", []], // 연도만 있는 건 시효 아님
  ];
  for (const [kw, title, expect] of lifeCases) {
    const got = scanLifespan(kw, title, null, 0).reasons.sort();
    const ok = JSON.stringify(got) === JSON.stringify([...expect].sort());
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| lifespan |", kw.slice(0, 22).padEnd(24), "→", got.join(",") || "전국·상시");
  }
  // 천장 판정 — 임계 미만만 걸린다
  const ceil = scanLifespan("1톤 전기트럭 중고 지원금", "", 40, 100).reasons.includes("low_ceiling")
    && !scanLifespan("은행 금리비교", "", 8800, 100).reasons.includes("low_ceiling")
    && !scanLifespan("검색량 없음", "", null, 100).reasons.includes("low_ceiling"); // 데이터 없으면 판정 보류
  if (!ceil) fail++;
  console.log(ceil ? "OK " : "FAIL", "| lifespan | 천장 임계 판정");
}

// ★글감 유형 신호(2026-07-31 실측 — 차단 아님, 관측용). pigtong.com 발행 26편 × 클릭 8회가 근거다.
//  같은 검색량 구간(340~1,650)에서 행동·판단형 9편 중 4편이 클릭을 받았고, 분류·용어형 8편은 전부 0이었다.
//  ★'저평가우량주'가 핵심 케이스 — 용어형처럼 생겼지만 판단 수식어가 있고 실제로 클릭이 났다. 오분류하면 승자를 버린다.
{
  const intentCases = [
    // 클릭이 실제로 난 글 — 전부 행동판단이어야 한다
    ["cma계좌개설", "행동판단"], ["irp이전", "행동판단"], ["정기예금특판", "행동판단"],
    ["회사채금리", "행동판단"], ["저평가우량주", "행동판단"],
    // 클릭 0 · 같은 검색량 구간의 분류·용어형
    ["금융기관", "용어"], ["코인종류", "용어"], ["온투업", "용어"], ["모의주식", "용어"],
    ["저축은행종류", "용어"], ["보통주", "용어"], ["베트남펀드", "용어"],
    // 행동어가 있으면 길어도 용어가 아니다(오컷 방지)
    ["퇴직연금세액공제", "행동판단"], ["증권수수료", "행동판단"],
  ];
  for (const [kw, expect] of intentCases) {
    const got = topicIntent(kw);
    const ok = got === expect;
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| intent   |", kw.padEnd(16), "→", got, ok ? "" : `(기대 ${expect})`);
  }
}

// ★요일 축(2026-07-31 데이터랩 실측) — 주말엔 영업일 실행형만 감점. 가점은 없다(금융에 주말 상승 주제가 없었다).
//  day: 0=일 1=월 … 5=금 6=토
{
  const dayCases = [
    // 영업일 실행형 — 금·토·일엔 감점
    ["정기예금 특판", 6, -6], ["정기예금 특판", 0, -6], ["정기예금 특판", 5, -6],
    ["IRP 이전", 6, -6], ["CMA 계좌개설", 0, -6],
    // 같은 글감도 평일이면 그대로
    ["정기예금 특판", 1, 0], ["IRP 이전", 3, 0], ["CMA 계좌개설", 4, 0],
    // 따져보는 유형 — 주말에도 감점 없음(실측 75~84%로 완만)
    ["저평가 우량주 찾는 법", 6, 0], ["노후 준비", 0, 0], ["적금 추천", 6, 0], ["연말정산 환급금", 0, 0],
    // ★'이전'의 오검출 방지 — '이전글·이전 연도'류가 아니라 계좌 이전만 잡혀야 한다
    ["이전글 보기", 6, 0],
  ];
  for (const [kw, day, expect] of dayCases) {
    const got = weekendAdjust(kw, day);
    const ok = got === expect;
    if (!ok) fail++;
    console.log(ok ? "OK " : "FAIL", "| weekend  |", `day=${day}`, kw.padEnd(18), "→", String(got).padStart(2), ok ? "" : `(기대 ${expect})`);
  }
}


// ★민간 대출 상품 배제(2026-08-05 유저 확정: "대출추천은 역시 안 돼").
//  실물 둘: '대출 거절되고 나서야 확인한다는 플러스론 조건', '금리 부담 크다는 삼성생명주담대 가입 전 체크사항'.
//  ★금융 브랜드를 열면서 같이 들어왔다 — 브랜드는 열되 '대출 상품 영업'은 열지 않는다.
//   금소법 광고 규제에 가장 가깝고, 상품 조건은 수시로 바뀌어 틀린 글이 되기 쉽다(3원칙: 법적 안전).
//  ★단 공적·정책 금융은 제도 안내라 예외 — 유저 표현으로 '조건부 허용'.
{
  const { privateLoanTopic } = await import("../lib/cardFinalGate.ts");
  const ok = (c, m) => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", m); };
  const cut = ["대출 거절되고 나서야 확인한다는 플러스론 조건", "삼성생명주담대 가입 전 체크사항", "마이너스통장 한도", "신용대출 갈아타기"];
  for (const t of cut) ok(privateLoanTopic(t) !== null, `민간 대출 상품 배제: ${t.slice(0, 18)}`);
  const pass = ["햇살론 유스 신청 조건", "디딤돌 대출 한도", "버팀목 전세자금대출 조건", "보금자리론 금리", "사잇돌 대출 자격"];
  for (const t of pass) ok(privateLoanTopic(t) === null, `★공적 금융은 통과(제도 안내): ${t.slice(0, 16)}`);
  const unrelated = ["주택청약종합저축 소득공제", "전세보증금 반환보증", "연말정산 환급"];
  for (const t of unrelated) ok(privateLoanTopic(t) === null, `무관 소재는 안 걸린다: ${t.slice(0, 14)}`);
}


// ★수명 컷의 예외(2026-08-05 유저 실측: finalGateDrops에 '법인세 중간예납 — dated_topic'이 찍혔다).
//  이 규칙은 '마감이 지나면 죽는 글감'을 막으려고 만들었는데(루원시티 청약 91 → 8),
//  캘린더·정부발표는 '아직 안 온 마감을 미리 잡는 것'이 존재 이유다 —
//  ★막으려던 것과 정반대인 글감을 같은 규칙이 자르고 있었다.
console.log("\n수명 컷 — 마감이 지났는가로만 가른다:");
{
  const one = (o) => { const r = finalGate([o]); return r.pass.length ? "통과" : r.drops[0].reason; };
  const fu = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  const pa = new Date(Date.now() - 20 * 86400_000).toISOString().slice(0, 10);
  const chk = (got, want, msg) => { const good = got === want; if (!good) fail++; console.log(good ? "OK " : "FAIL", "|", msg, "→", got); };
  chk(one({ keyword: "법인세 중간예납", title: `법인세 중간예납, ${Number(fu.slice(5, 7))}월 ${Number(fu.slice(8))}일까지 해야 하는 것`, actionEnd: fu, seedSource: "gov" }), "통과",
    "★아직 안 온 마감은 지금이 전성기다");
  chk(one({ keyword: "근로장려금", title: "근로장려금, 5월 1일까지 신청", actionEnd: pa, seedSource: "gov" }), "dated_topic",
    "★지난 마감은 원천이 gov여도 죽는다");
  chk(one({ keyword: "주민세", title: "주민세, 8월 16일부터 내는 것", seedSource: "calendar" }), "통과",
    "마감 모르는 캘린더 카드는 원천으로 구제");
  chk(one({ keyword: "루원시티 청약", title: "루원시티 청약, 7월 13일 마감", seedSource: "news" }), "dated_topic",
    "★일반 뉴스의 날짜 글감은 그대로 컷");
  // ★차수도 같은 예외를 받아야 한다(2026-08-05 실측: 청약홈 공고 '더 리치먼드 미아(2차) 무순위'가 잘렸다).
  //  무순위·특별공급은 차수가 붙는 게 정상이고, 접수가 안 끝났으면 지금이 전성기다.
  chk(one({ keyword: "더 리치먼드 미아 2차 무순위 청약", title: "더 리치먼드 미아(2차) 무순위 청약, 접수 안내", seedSource: "applyhome", actionEnd: fu }), "통과",
    "★접수 중인 2차 공고는 산다");
  chk(one({ keyword: "더 리치먼드 미아 2차 무순위 청약", title: "더 리치먼드 미아(2차) 무순위 청약, 접수 안내", seedSource: "applyhome", actionEnd: pa }), "round_topic",
    "★접수가 끝난 2차 공고는 죽는다");
}

// ★소비형(퀴즈·정답) 차단 — 2026-08-06 유저 판단으로 '유지' 확정.
//  8/5 인기유입검색어 20개 중 4개(20%)가 은행 앱 퀴즈였는데도 안 연다: 3원칙의 계정지속이 먼저다.
//  ★이 검사의 임무는 '알고 안 한다'는 기록을 지키는 것이다 — 수치가 코드에서 사라지면
//   다음에 누군가 "유입 20%를 왜 버리지?"로 되돌린다.
{
  const gate = fs.readFileSync(new URL("../lib/cardFinalGate.ts", import.meta.url), "utf-8");
  for (const q of ["케이뱅크 황금캡슐 퀴즈", "우리은행 여름간식 퀴즈", "출석체크 이벤트", "룰렛 이벤트"])
    chk_(consumeOnlyTopic(q) !== null, `★소비형 차단: ${q}`);
  chk_(consumeOnlyTopic("근로장려금 지급일") === null, "정상 글감은 통과");
  chk_(/4개\(20%\)가 은행 앱 퀴즈였다/.test(gate), "★치르고 있는 값이 숫자로 적혀 있다");
  chk_(/알고 안 한다/.test(gate), "★'몰라서'가 아니라 '알고 안 한다'가 기록돼 있다");
}

// ★선점 게이트(2026-08-07 실측: '추석 민생지원금'이 자동완성에 지역별로 뜨는데 보드에 없었다).
//  원인 둘: newspsych 레인이 신선 목록에 없었고, 명절이 고유성 판정에 없었다.
{
  const { preemptVerdict } = await import("../lib/preemptGate.ts");
  chk_(preemptVerdict("추석 민생지원금", "newspsych", 872).eligible === true, "★newspsych 레인도 선점 면제를 받는다(자동완성 확정 레인)");
  chk_(preemptVerdict("추석 민생지원금", "news", 872).eligible === true, "★명절은 숫자와 같은 고유성이다");
  chk_(preemptVerdict("추석 부동산", "news", 800).eligible === false, "★명절+흔한 말은 여전히 기사 말투로 막는다");
  chk_(preemptVerdict("부동산 공급", "news", 800).eligible === false, "일반명사 조합은 여전히 막는다");
}

// ★시각(N시) 오탐(2026-08-07 — 사건 카드 다섯 번째 사망 지점).
//  '오늘 오후 2시'의 '2시'가 지명 시로 읽혀 region_niche 컷. 사건·일정 카드는 시각 표기가 기본이라
//  이 오탐 하나가 사건 레인 전체를 죽인다. 숫자 뒤의 시는 시각이지 도시가 아니다.
{
  chk_(finalGate([{ keyword: "부동산 공급대책", title: "그린벨트 풀리나… 오늘 오후 2시, 공급대책 윤곽 나온다는데", seedSource: "event" }]).drops.length === 0,
    "★'오후 2시'가 지역으로 안 읽힌다(사건 카드 실물)");
  chk_(finalGate([{ keyword: "근로장려금 지급일", title: "근로장려금, 오후 6시 마감 전에 확인해야 하는 것" }]).drops.length === 0,
    "시각 표기 일반 카드도 통과");
  chk_(finalGate([{ keyword: "의정부시 청년 프로그램", title: "의정부시 청년 투자환경, 일자리·주거 원스톱 지원 프로그램" }]).drops[0]?.reason === "region_niche",
    "★진짜 지자체 컷은 그대로(오탐 수리가 본탐을 못 풀게)");
}

// ★'론' 오탐(2026-08-07 실서버 로그): '한강 푸르지오 리버프론트 청약'이 loan_product로 죽었다.
//  유저가 원하는 바로 그 서울 로또 청약을 사칭대출 게이트가 지운 것 — 론은 낱말 끝에서만 대출이다.
{
  chk_(finalGate([{ keyword: "한강 푸르지오 리버프론트 청약", title: "한강 푸르지오 리버프론트, 무순위 청약 접수", seedSource: "applyhome" }]).drops.length === 0,
    "★'리버프론트'가 대출로 안 읽힌다(서울 로또 청약 실물)");
  chk_(finalGate([{ keyword: "플러스론", title: "플러스론 한도" }]).drops[0]?.reason === "loan_product",
    "진짜 대출 상품('~론' 끝맺음)은 그대로 컷");
}

// ★특정 직업·신분 한정 차단(2026-08-07 유저: "우리는 전 국민 돈 벌고 싶은 사람들의 결핍을 긁는다").
//  숫자(문서 0·검색 90)만 보면 선점 각이지만 모수가 한 줌이면 1위를 해도 천장이 바닥이다.
//  ★수요 게이트의 구제(풀 스코어)로도 살아나면 안 되는 종류라 최종 관문에 있다(실측: 풀 3으로 구제돼 섰다).
{
  chk_(finalGate([{ keyword: "건설근로자공제회 퇴직공제금 받는법", title: "퇴직금을 또 받는 건 아니고, 건설근로자공제회 공제금이 뭐길래?" }]).drops[0]?.reason === "narrow_audience", "★건설근로자공제회 차단(유저 실물)");
  chk_(finalGate([{ keyword: "국가장학금 II유형 (대학자체노력연계형) 신청", title: "국가장학금 II유형, 8월 11일부터 신청" }]).drops[0]?.reason === "narrow_audience", "★장학금 계열 차단(유저 실물)");
  chk_(finalGate([{ keyword: "근로장려금 지급일", title: "근로장려금 지급일, 놓치기 쉬운 부분" }]).drops.length === 0, "★소득 조건형(전 국민)은 통과 — 직군이 아니라 소득 조건이다");
  chk_(finalGate([{ keyword: "추석 민생지원금", title: "추석 민생지원금, 지역별 신청 방법" }]).drops.length === 0, "전 국민 지원금 통과");
}

// ★지역화폐 이름 = 지역명(2026-08-07 실측: '동백전 교통카드'가 보드에 섰다 — 부산 시민만 가진 카드).
{
  chk_(finalGate([{ keyword: "동백전 교통카드 타지역", title: "사회초년생이 놓치는 동백전, 지역 제한 없이 쓰려면", seedSource: "news" }]).drops[0]?.reason === "region_niche", "★동백전(부산 지역화폐) 차단 — 유저 실물");
  chk_(finalGate([{ keyword: "온누리상품권 환급", title: "온누리상품권 환급, 이번 주말 조건", seedSource: "news" }]).drops.length === 0, "전국 상품권은 통과");
  chk_(finalGate([{ keyword: "K패스 교통카드", title: "K패스 교통카드 환급 조건 정리", seedSource: "news" }]).drops.length === 0, "전국 교통카드는 통과");
  // ★강원 '그리고카드'를 목록에 넣었다가 바로 잡은 지뢰 — 접속사와 같은 글자라 모든 글이 걸린다
  chk_(finalGate([{ keyword: "전세보증금 반환", title: "전세보증금 그리고 이사할 때 확인할 것", seedSource: "news" }]).drops.length === 0, "★접속사 '그리고'는 지역이 아니다(오탐 지뢰 방어)");
}

// ★채용은 유명 대기업·공기업만(2026-08-07 유저: "그 포모랑 결핍이랑 다른 결이에요").
//  대기업 성과급은 전 국민 포모지만, 일반 회사 채용은 그 회사 지원자만 본다(한 줌 모수).
{
  chk_(finalGate([{ keyword: "중견기업 경력직 채용", title: "OO테크 경력직 채용, 지원 조건", seedSource: "news" }]).drops[0]?.reason === "recruit_minor", "★일반 기업 채용 차단");
  chk_(finalGate([{ keyword: "현대그린푸드 채용 사이트", title: "현대그린푸드 사내카페 운영", seedSource: "dart" }]).drops[0]?.reason === "recruit_minor", "★계열사 이름이 비슷해도 성과급 포모 급이 아니면 차단(실물)");
  chk_(finalGate([{ keyword: "하나금융그룹 청라 채용", title: "하나금융그룹이 청라로 옮겼는데", seedSource: "newspsych" }]).drops.length === 0, "★유명 금융그룹 채용은 통과(성과급 포모 실재)");
  chk_(finalGate([{ keyword: "삼성전자 성과급", title: "삼성전자 성과급, 올해 지급 기준", seedSource: "news" }]).drops.length === 0, "성과급 글감 자체는 채용이 아니다 — 통과");
  chk_(finalGate([{ keyword: "국민취업지원제도 신청", title: "국민취업지원제도 신청, 조건 정리", seedSource: "newspsych" }]).drops.length === 0, "★'취업'이 들어가도 지원금 제도는 통과");
}

// ★공시 혈통 최종 검문(2026-08-07 저녁 실물: DART 칩을 단 '현대그린푸드 본사 사내카페'가 섰다).
//  증식 단계 혈통 검사가 있는데도 새어 나왔다 — 어느 경로로 샜든 최종 관문이 결과를 검사한다.
{
  chk_(finalGate([{ keyword: "현대그린푸드 본사 사내카페", title: "현대그린푸드 사내카페 vs 외부 카페, 직원이라도 선택지가 생긴 이유", seedSource: "dart" }]).drops[0]?.reason === "dart_lineage", "★공시 카드가 공시 얘기를 안 하면 실격(사내카페 실물)");
  chk_(finalGate([{ keyword: "뉴로메카 무상증자 받으려면", title: "뉴로메카 무상증자, 기준일 이전에 이미 떨어진 투자자들이 있는 이유", seedSource: "dart" }]).drops.length === 0, "★교본(무상증자)은 통과");
  chk_(finalGate([{ keyword: "알테오젠 권리락", title: "알테오젠 권리락, 오늘 주가가 왜 이렇게 보이나", seedSource: "dart" }]).drops.length === 0, "권리락도 통과");
  chk_(finalGate([{ keyword: "골프존홀딩스 공개매수 신청방법", title: "골프존홀딩스 공개매수, 일반 주주도 참여할 때", seedSource: "newspsych" }]).drops.length === 0, "다른 원천엔 이 검문을 안 건다");
}

// ★낡은 연도 v2(2026-08-17 유저: 자동 재작성 폐기 — 제거 또는 폐기만)
{
  const { stripStaleYear, hasStaleYear, finalGate } = await import("../lib/cardFinalGate.ts");
  const now = new Date("2026-08-17T09:00:00+09:00");
  chk_(stripStaleYear("비거주 1주택자 전세대출 제한 2025", now) === "비거주 1주택자 전세대출 제한", "★과거 연도는 재작성이 아니라 제거");
  chk_(stripStaleYear("2026 출산지원금 타임라인", now) === "2026 출산지원금 타임라인", "올해는 그대로");
  chk_(stripStaleYear("2027년 최저임금 예고", now) === "2027년 최저임금 예고", "미래는 그대로(선행 발행)");
  chk_(hasStaleYear("2025년 청년지원금 총정리", now) === true, "제목의 과거 연도를 감지한다");
  chk_(hasStaleYear("2025년 귀속 연말정산", new Date("2026-01-15T09:00:00+09:00")) === false, "1월의 작년 귀속은 예외");
  const r = finalGate([{ title: "2025년 청년지원금 총정리", keyword: "청년지원금 2025" }]);
  chk_(r.pass.length === 0 && r.drops[0].reason === "stale_year", "★과거 연도 글감은 폐기(재작성 금지)");
}

// ★엔터 소재 컷 + 혈통 범용어(2026-08-14 실측: 보도자료 '창업 프로젝트' → 영화 '프로젝트 헤일메리 ott 언제' 증식)
{
  const { finalGate } = await import("../lib/cardFinalGate.ts");
  const { lineageOverlap } = await import("../lib/editorial.ts");
  const r1 = finalGate([{ title: "프로젝트 헬메리 OTT 구독 vs 구매, 보는 시점이 다르다", keyword: "프로젝트 헤일메리 ott 언제" }]);
  chk_(r1.pass.length === 0, "★실측 실물: 영화 OTT 글감은 컷");
  const r2 = finalGate([{ title: "넷플릭스 구독료 인상, 지금 갈아탈 요금제", keyword: "넷플릭스 요금제 가격" }]);
  chk_(r2.pass.length === 1, "구독료·요금 돈 각도는 통과");
  chk_(lineageOverlap("창업 프로젝트, 달라지는 것 정리", "프로젝트 헤일메리 ott 언제") === 0, "★'프로젝트' 하나로는 혈통이 성립하지 않는다");
}

process.exit(fail ? 1 : 0);
