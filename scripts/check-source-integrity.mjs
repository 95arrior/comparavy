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

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 원천 무결성");
process.exit(fail ? 1 : 0);
