// 원천 무결성 전수 점검 — 실행: npx tsx scripts/check-source-integrity.mjs
// ★유저 지시(2026-08-05): "하나씩 하지 말고 완전히 퍼펙트하게 전체 다 잡아요."
//  개별 결함을 그때그때 고치면 같은 부류가 다른 자리에서 또 난다.
//  이 파일은 '부류'를 지킨다: 각 원천의 대표 글감이 관문·수요 게이트를 통과하는가,
//  원천이 죽었을 때 조용히 0이 되지 않는가, 표시값과 측정 대상이 같은가.
import fs from "node:fs";
import { finalGate } from "../lib/cardFinalGate.ts";
import { preemptVerdict } from "../lib/preemptGate.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 관문이 자기 원천의 목적을 막지 않는가:");
{
  // ★실측 사고(2026-08-05): 정부발표가 잡은 '법인세 중간예납'이 제목의 날짜 때문에 dated_topic으로 죽었다.
  //  마감을 잡는 게 존재 이유인 원천을, 마감 때문에 자른 것이다. 원천마다 대표 글감으로 확인한다.
  const cases = [
    ["캘린더", { keyword: "주민세", title: "주민세 납부 대상자, 8월에 확인할 것", seedSource: "calendar" }],
    ["캘린더+마감", { keyword: "근로장려금", title: "근로장려금 지급일, 8월 25일 입금되는 사람", seedSource: "calendar", actionEnd: "2026-08-25" }],
    ["정부발표", { keyword: "법인세 중간예납", title: "법인세 중간예납, 8월 31일까지 해야 하는 것", seedSource: "gov", actionEnd: "2026-08-31" }],
    ["공시", { keyword: "알테오젠 무상증자", title: "알테오젠 무상증자, 내 주식에 생기는 일", seedSource: "dart" }],
    ["커뮤니티", { keyword: "케이뱅크 황금캡슐", title: "케이뱅크 황금캡슐, 지금 확인하면 되는 것", seedSource: "community" }],
    ["청약홈", { keyword: "양평역 한라비발디 무순위", title: "양평역 한라비발디 1세대 무순위, 8월 10일 접수", seedSource: "applyhome", actionEnd: "2026-08-10" }],
    ["아침뉴스", { keyword: "전기차 보조금 신청", title: "전기차 보조금 신청, 승인 후 출고 전 확인할 것", seedSource: "newspsych" }],
    ["실시간", { keyword: "페이코 포인트 출금", title: "페이코 포인트 출금, 계좌마다 다른 이유", seedSource: "rising" }],
    ["보조금24", { keyword: "청년월세 특별지원", title: "청년월세 특별지원, 신청 조건과 기간", seedSource: "gov24" }],
  ];
  for (const [name, card] of cases) {
    const r = finalGate([card]);
    ok(r.pass.length === 1, `[${name}] 대표 글감이 관문을 통과${r.pass.length ? "" : ` — 막힌 이유: ${r.drops[0].reason}`}`);
  }
}

console.log("\n② 수요 게이트 — 살릴 것과 죽일 것:");
{
  const MIN = 100;
  const live = (kw, src, vol, seedVol, bt) => Math.max(vol, seedVol) >= MIN || preemptVerdict(kw, src, bt).eligible;
  // ★살아야 하는 것: 오늘 터진 선점형은 검색량이 0인 게 정상이다(광고 API는 지난 30일 평균이다)
  ok(live("동탄 줍줍", "rising", 0, 0, 120), "★오늘 터진 줍줍 — 검색량 0이어도 산다");
  ok(live("케이뱅크 황금캡슐", "community", 0, 0, 300), "★케이뱅크 황금캡슐 — 행동어가 없어도 고유 이름이면 산다(유저 지목 실물)");
  ok(live("주민세 납부 대상자", "calendar", 50, 10040, 13), "★롱테일이어도 클러스터 수요가 크면 산다");
  ok(live("국민취업지원제도 신청", "newspsych", 230, 0, 0), "수요가 충분하면 그냥 산다");
  // ★죽어야 하는 것
  ok(!live("부동산 공급", "news", 0, 0, 36988), "★기사 말투 + 문서 3만 — 죽는다(유저 화면의 실제 오답)");
  ok(!live("케이뱅크 은행", "news", 0, 0, 500), "★고유명사에 흔한 말만 붙은 건 죽는다");
  ok(!live("지원금 신청", "gov", 0, 0, 100), "★뭉뚱그린 말은 죽는다");
}

console.log("\n③ 원천이 죽으면 조용히 0이 되지 않는가:");
{
  const files = {
    govPress: "GOVPRESS_PARSE_EMPTY",
    communityBuzz: "COMMUNITY_ALL_FEEDS_DOWN",
    newsPsych: "NEWS_SWEEP_ALL_FAILED",
    dartCorpAction: "DART_HTTP_",
  };
  for (const [f, token] of Object.entries(files)) {
    const src = fs.readFileSync(new URL(`../lib/${f}.ts`, import.meta.url), "utf-8");
    ok(src.includes(token), `[${f}] 전부 실패하면 던진다 — '수확 0'과 '원천 사망'을 구분한다`);
  }
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  for (const tag of ["[gov-press]", "[community]", "[news-psych]", "[corp-action]"]) {
    ok(tt.includes(`${tag} 수집 실패`), `${tag} 실패가 로그에 남는다`);
  }
}

console.log("\n④ 근거는 그 카드의 것인가:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  // ★실측: '국민행복카드 바우처' 글감에 보훈부·참전수당 기사가 근거로 실렸다(배치 공통 뭉치).
  ok(/이 키워드를 만든 '그 기사'만 근거로 붙인다/.test(tt), "★배치 뭉치가 아니라 그 카드의 기사만 붙인다");
  ok(/kwToks\.some\(\(w\) => t\.includes\(w\)\)/.test(tt), "키워드의 말이 실제로 들어 있는 기사만 고른다");
  ok(/근거 기사 없음/.test(tt) && /기사를 인용하지 마라/.test(tt), "★못 찾으면 붙이지 않고, 인용도 막는다(가짜 근거는 없는 근거보다 나쁘다)");
}

console.log("\n⑤ 증식이 지어내지 않는가:");
{
  const amp = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  ok(/ADDED_REGION_RE/.test(amp) && /drop\.region\+\+/.test(amp), "★없던 지역명 차단(실측: 씨앗 '아파트 청약 일정' → '청주 …')");
  ok(/SPEECH_TAIL_RE/.test(amp) && /drop\.speech\+\+/.test(amp), "★'알려주세요' 같은 말투 차단(문서 0편이라 선점 최적처럼 보인다)");
  ok(/\(\?<!\[가-힣\]\)/.test(amp), "★말 안에 박힌 조각을 코어로 읽지 않는다('확인하면'의 '인하')");
  ok(/자료에 없는 숫자를 넣지 마라/.test(amp), "★verdict에 지어낸 숫자 금지");
  ok(/분기의 '결과값'도 자료에 있는 것만/.test(amp), "★branchAxis 결과값도 근거 있는 것만");
  ok(/QUOTA/.test(amp) && /희소 원천 우선 배치/.test(amp), "★희소 원천이 수에 밀리지 않게 정원을 뗀다");
  // ★실물(2026-08-05): 씨앗 '현대그린푸드 자기주식취득'(공시) → 카드 '현대그린푸드 채용 사이트'.
  //  회사명만 살아남고 공시 내용이 사라져 근거와 글이 어긋났다. 혈통 검사는 회사명이 겹쳐 통과시킨다.
  ok(/b\.seed\.source === "dart"/.test(amp) && /drop\.lineage\+\+/.test(amp), "★공시 글감은 공시 내용이 남아야 한다");
  ok(/회사명은 소재가 아니다/.test(amp), "왜 혈통 검사로는 부족한지가 코드에 적혀 있다");
}

console.log("\n⑥ 애초에 안 뽑아야 하는 것:");
{
  const gp = fs.readFileSync(new URL("../lib/govPress.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): '건설근로자공제회 사업연보'가 글감이 됐다 — 월 검색 0회.
  //  '무슨 일이 생겼다'가 아니라 '작년 숫자를 정리했다'다. 검색하러 오는 사람이 없다.
  ok(/REPORT_RE/.test(gp) && /연보\|백서/.test(gp), "★통계·보고서 발간물은 보도자료여도 안 뽑는다");
  const REPORT = /(연보|백서|통계(?!청)|실태조사|동향\s*분석|보고서\s*(발간|발표)|자료집|편람|연차보고)/;
  ok(REPORT.test("건설근로자공제회 사업연보 발간"), "실물을 잡는다");
  ok(!REPORT.test("법인세 중간예납 신고·납부 하세요"), "멀쩡한 보도자료는 통과");
  ok(!REPORT.test("통계청 가계동향 조사 결과"), "★'통계청'은 기관명이라 안 걸린다");

  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★선점 면제는 '오늘 터진 것'을 살리려고 만들었는데 그물이 넓어 잔챙이도 들어온다.
  //  터질지 안 터질지는 지금 알 수 없다 — 막는 대신 자리를 제한한다.
  ok(/const PREEMPT_MAX = 2/.test(rt), "★선점 면제는 보드당 2장까지");
  ok(/preemptUsed < PREEMPT_MAX/.test(rt), "상한이 실제로 걸린다");
  ok(/수요가 증명된 카드가 미증명 카드에 밀려나지 않게/.test(rt), "왜 제한하는지가 코드에 적혀 있다");
}

console.log("\n⑦ 서빙이 느려도 화면은 뜨는가:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): maxDuration이 60초인데 서빙 경로에 측정이 계속 얹혀 504가 났다.
  //  문서 수(전 카드)·검색량·씨앗 검색량·홈판 LLM 8회·증식 LLM이 수확 직후 한꺼번에 돈다.
  ok(/export const maxDuration = 300/.test(rt), "★상한을 올려 504를 막는다(안전망)");
  ok(/SOFT_BUDGET_MS/.test(rt) && /overBudget\(\)/.test(rt), "★상한만 올리면 5분을 기다린다 — 늦으면 선택적 보강을 건너뛴다");
  // ★홈판 레인 폐지(2026-08-05 유저 확정) — 자리가 없으면 아예 만들지 않는다.
  //  LLM 8회가 서빙 경로에서 통째로 빠진다(504와 22초 초과의 최대 원인이었다).
  ok(/colShort\.homefeed <= 0 \|\| overBudget\(\)/.test(rt), "★만들 자리가 없으면 홈판을 생성하지 않는다");
  ok(/\[homebet\] 레인 폐지 — 생성 건너뜀/.test(rt), "건너뛴 사실이 로그에 남는다");
  ok(/실시간 카드는 안 재면 거짓 배지가 나가므로 반드시 잰다/.test(rt), "★거짓을 만드는 측정은 안 건너뛴다");
  ok(/숫자가 하나 비는 것보다 화면이 안 뜨는 게 훨씬 나쁘다/.test(rt), "무엇을 우선하는지가 코드에 적혀 있다");
  ok(/diag\.timing = \{ elapsedMs/.test(rt), "★소요 시간·생략 여부를 진단에 남긴다(원인을 추측하지 않게)");
}

console.log("\n⑧ 수요 게이트는 하나인가:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): 씨앗은 dart 4·calendar 1·gov24 1이 다 들어왔는데 카드가 0장이었다.
  //  수요 게이트가 두 개였고, 먼저 도는 쪽이 아직 재지 않은 값(씨앗 클러스터 검색량)과
  //  선점 판정을 모른 채 잘라냈다. 게다가 그 탈락은 진단에 항목으로 안 남아 며칠을 못 찾았다.
  ok(/게이트 중앙화 위반을 바로잡는다/.test(rt), "★컷은 한 곳에서만 한다");
  ok(/void _unusedDemandFilter/.test(rt), "옛 게이트는 컷을 하지 않는다(히스토리만 보존)");
  ok(/const floor = isAnnounce \? 300 : DEMAND_MIN/.test(rt), "★공고는 문턱이 높다(아무도 안 찾는 공고명 차단)");
  ok(/rs\.platformViews >= 10_000 \|\| rs\.bigPool \|\| rs\.poolScore >= 3/.test(rt), "★구제 규칙이 함께 옮겨왔다(귀농 주택구입지원 구멍)");
  ok(/funnel\.demandCut = noDemand/.test(rt), "★세는 곳도 한 곳(컷과 카운트가 어긋나지 않게)");
  // ★느리다고 게이트를 건너뛰면 '느리면 아무거나 나간다'가 된다
  ok(/종전엔 예산 초과 시 이 블록을 통째로 건너뛰어 수요 게이트 자체가 안 돌았다/.test(rt), "★예산 초과여도 컷은 돈다");
  ok(/if \(need\.length \|\| seedNeed\.length\) \{/.test(rt), "측정만 건너뛰고 판정은 유지");
}

console.log("\n⑨ 모르는 걸 근거로 자르지 않는가:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): '주민세 조회 방법'(vol 40)이 잘렸다. 씨앗 '주민세'는 월 10,040회인데
  //  예산 초과로 씨앗 검색량을 못 재서 롱테일 숫자만 보고 죽였다.
  ok(/seedUnknown/.test(rt) && /모르는 걸 근거로 자르면, 느린 날마다 좋은 글감이 사라진다/.test(rt),
    "★씨앗을 못 쟀으면 컷하지 않는다");
  ok(/!measured \|\| seedUnknown \|\| docUnknown \|\| v >= floor \|\| rescued/.test(rt), "판정에 실제로 반영됐다(씨앗)");
  // ★'다음에 하자'가 '영영 안 함'이 되는 자리
  ok(/'다음에 하자'가 '영영 안 함'이 되는 자리였다/.test(rt), "★홈판을 배경에서 만들어 캐시를 데운다");
  ok(/\[homebet\] 배경 생성 완료/.test(rt), "배경 생성이 로그에 남는다");
}

console.log("\n⑩ 희소 원천이 마지막에 다시 밀리지 않는가:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★실측(2026-08-05): pickedBySource는 calendar 1·dart 1이 증식에 들어갔다고 했는데 화면 칸은 0이었다.
  //  후보 12장 중 자리는 7장뿐이고 정렬이 수 많은 뉴스를 앞에 세웠다 —
  //  앞 단계에서 자리를 떼어 준 게 통째로 헛일이 됐다.
  ok(/희소 원천 자리 확보/.test(rt), "★내보낼 때도 희소 원천에 자리를 준다");
  // ★리터럴 순서로 검사하지 않는다 — event 추가(2026-08-07)처럼 목록이 자랄 때마다 깨진다.
  //  지켜야 할 것은 '희소 원천들이 목록에 있다'는 것이지 나열 순서가 아니다.
  for (const src of ["event", "calendar", "gov", "dart", "applyhome", "community"])
    ok(new RegExp('"' + src + '"').test(rt.match(/const RARE = \[[^\]]+\]/)?.[0] ?? ""), `희소 원천 목록에 ${src}`);
  ok(/여기서 밀리면 앞 단계에서 자리를 떼어 준 게 통째로 헛일이 된다/.test(rt), "왜 필요한지가 코드에 적혀 있다");

  // ★모르는 것을 탈락 사유로 쓰지 않는다 — 씨앗 검색량·문서 수 둘 다
  ok(/docUnknown/.test(rt) && /그 무지가 곧 탈락 사유가 됐다/.test(rt), "★문서 수를 못 쟀어도 자르지 않는다");
  ok(/!measured \|\| seedUnknown \|\| docUnknown \|\| v >= floor \|\| rescued/.test(rt), "판정에 실제로 반영됐다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 원천 무결성");
process.exit(fail ? 1 : 0);
