import { finalGate, adsenseUnsafe } from "../lib/cardFinalGate.ts";
import { nearDuplicate } from "../lib/diversity.ts";
import { isStickyFrame, pickDiverseCopy } from "../lib/thumbCopyDiversity.ts";
import { isPushable, pushGain, isZeroClickQuery } from "../lib/serpCtr.ts";
import { pruneDeadTocLinks } from "../lib/wordpress.ts";
import { lacksConditionBranch } from "../lib/editorial.ts";
import { parseQueryText, clusterQueries } from "../lib/hubTopics.ts";
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

process.exit(fail ? 1 : 0);
