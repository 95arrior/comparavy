// 브랜드 버즈 수확기 검증 — 실행: npx tsx scripts/check-brand-buzz.mjs
// ★출발점(2026-08-05 유저): 유명 블로거가 7/29에 '케이뱅크 황금캡슐 이벤트'를 써서 대박이 났는데
//  우리 보드엔 그런 글감이 한 번도 뜬 적이 없다. 유저가 전에도 물었던 그 자리다.
// ★그 키워드가 못 들어오던 3중 봉쇄:
//  ①씨앗 수확 쿼리가 분야 일반명사뿐 ②급상승 정합 관문이 일반명사 겹침만 봄 ③검색광고 풀에 신조어 없음
import fs from "node:fs";
import { hasBrandAxis } from "../lib/brandBuzz.ts";
import { isUnsafeKeyword, financeBrandAllowed } from "../lib/keywordSafety.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 브랜드 축:");
{
  ok(hasBrandAxis("경제·재테크"), "경제·재테크에는 브랜드 축이 있다");
  ok(!hasBrandAxis("반려동물"), "★정의 안 된 분야는 수확 자체를 건너뛴다(엉뚱한 브랜드 유입 금지)");
}

console.log("\n② 걸러야 하는 것 / 들여야 하는 것(규칙 재현):");
{
  const src = fs.readFileSync(new URL("../lib/brandBuzz.ts", import.meta.url), "utf-8");
  const BUZZ = new RegExp(/(이벤트|캡슐|룰렛|출석|퀴즈|응모|당첨|쿠폰|캐시백|리워드|포인트|적금|특판|파킹|무료|지급|혜택|추첨|선착순|오픈)/);
  const BLOCK = new RegExp(/(대출|한도조회|신용점수|연체|회생|파산)/);
  ok(BUZZ.test("케이뱅크 황금캡슐 이벤트"), "★유저가 든 실물이 신호에 걸린다");
  ok(BUZZ.test("토스 만보기 포인트"), "앱테크형도 걸린다");
  ok(!BUZZ.test("케이뱅크 고객센터 전화번호"), "브랜드 일반 정보는 안 들인다");
  ok(BLOCK.test("케이뱅크 신용대출 한도"), "★대출 유인 계열은 배제(법적 안전 — 여기서도 같은 선)");
  ok(/축당 1개/.test(src), "★축당 1개 — 한 축이 보드를 먹지 않게");
  ok(/budgetMs/.test(src), "★시간 예산이 있다(비공식 엔드포인트가 느려도 수확 전체를 안 붙잡는다)");
}

console.log("\n②-2 돈 축 — 뱅크만 하면 '은행 이벤트 블로그'가 된다(2026-08-05 유저 지적):");
{
  const src = fs.readFileSync(new URL("../lib/brandBuzz.ts", import.meta.url), "utf-8");
  for (const axis of ["청약", "지원금", "환급금", "공모주", "적금", "앱테크", "연말정산", "재산세"]) {
    ok(new RegExp(`seed: "${axis}`).test(src), `돈 축 포함: ${axis}`);
  }
  ok(/MONEY_AXES,\n\s+\.\.\.brands\.map/.test(src), "★돈 축이 브랜드 축보다 먼저 돈다(청약·지원금이 포모가 더 세다)");
  // 축마다 신호어가 다르다 — 브랜드엔 '이벤트', 청약엔 '무순위·특별공급'
  ok(/무순위\|줍줍\|특별공급/.test(src), "★청약 축은 자기 신호어를 쓴다");
  ok(/signal: BUZZ_RE/.test(src), "브랜드 축은 이벤트 신호어를 그대로 쓴다");
  ok(/축당 1개/.test(src), "★축당 1개 — 한 축이 보드를 먹지 않게");
}

console.log("\n③ 자동완성 호출 자체의 안전장치:");
{
  const ac = fs.readFileSync(new URL("../lib/naverAutocomplete.ts", import.meta.url), "utf-8");
  ok(/AbortSignal\.timeout\(/.test(ac), "★타임아웃이 있다 — 한 번 매달리면 수확이 멈춘다");
}

console.log("\n③-2 ★진짜 진범 — 브랜드명이 안전 게이트에 막혀 있었다(2026-08-05):");
{
  // 유저가 두 번 물은 그 자리. 수확기를 만들어도 이 게이트에서 버려지면 아무 일도 안 일어난다.
  ok(isUnsafeKeyword("케이뱅크 황금캡슐"), "종전(분야 무관)엔 차단됐다 — 이게 진범이었다");
  ok(!isUnsafeKeyword("케이뱅크 황금캡슐", { allowFinanceBrand: true }), "★재테크 분야에선 통과한다");
  ok(!isUnsafeKeyword("카카오뱅크 26주적금", { allowFinanceBrand: true }), "★같은 계열 전부 통과");
  // ★푼 것은 '브랜드명'뿐이다 — 나머지 안전선은 그대로여야 한다
  ok(isUnsafeKeyword("케이뱅크 고객센터", { allowFinanceBrand: true }), "★고객센터·전화번호는 여전히 차단");
  ok(isUnsafeKeyword("KODEX 레버리지", { allowFinanceBrand: true }), "★ETF 상품명은 여전히 차단");
  ok(isUnsafeKeyword("오스템 임플란트", { allowFinanceBrand: true }), "★의료·타업종 브랜드는 여전히 차단");
  ok(isUnsafeKeyword("배우 김OO 열애설", { allowFinanceBrand: true }), "★가십은 여전히 차단(법적 지뢰)");
  ok(financeBrandAllowed("경제·재테크") && !financeBrandAllowed("반려동물"), "★허용은 분야로 갈린다");

  const tt2 = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/const brandOk = \{ allowFinanceBrand: financeBrandAllowed\(category\) \}/.test(tt2), "★수확 파이프가 분야로 판정한다");
  ok((tt2.match(/isUnsafeKeyword\([^)]*brandOk\)/g) ?? []).length >= 5, "★합성·급상승·브랜드버즈·롱테일 전 지점에 같은 판정을 건다");
}

console.log("\n③-3 선도 — '지금 열려 있는 창'만(2026-08-05 유저: 일주일 지나 나오면 선점 실패):");
{
  const src = fs.readFileSync(new URL("../lib/brandBuzz.ts", import.meta.url), "utf-8");
  ok(/fetchKeywordMomentum/.test(src), "★데이터랩 일별 추이로 선도를 잰다(월 단위로는 일주일이 한 점에 뭉개진다)");
  ok(/MOMENTUM_MIN = 0\.\d+/.test(src) && /PEAK_MAX_DAYS = \d+/.test(src), "★기준 둘 — 꺾였는가 / 피크가 오래됐는가");
  ok(/판정 불가 = 통과/.test(src), "★재는 도구가 죽어도 수확은 멈추지 않는다");
  ok(/선점 창 닫힘 — 제외/.test(src), "★버린 이유를 모멘텀·피크와 함께 남긴다");
  const dl = fs.readFileSync(new URL("../lib/naverDatalab.ts", import.meta.url), "utf-8");
  ok(/timeUnit: "date"/.test(dl), "★일 단위로 조회한다");
  ok(/AbortSignal\.timeout\(/.test(dl), "타임아웃이 있다");
}

console.log("\n④ 배선 — 씨앗으로 실제로 들어가는가:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/harvestBrandBuzz\(category/.test(tt), "★수확기가 트렌드 갱신에서 호출된다");
  ok(/source: "rising"/.test(tt), "★실시간 종족으로 들어간다(밴드 우회 판정 대상)");
  ok(/isUnsafeKeyword\(kw, brandOk\) \|\| scamLoan\(kw\)/.test(tt), "안전 게이트는 그대로 적용된다(브랜드만 분야로 열림)");
  ok(/확인되지 않은 금액·기간·당첨 조건을 지어내지 마라/.test(tt), "★이벤트 글의 최대 리스크(지어낸 조건)를 지시로 막는다");
  ok(/MONEY_BUZZ/.test(tt), "★급상승 정합 관문도 '돈 되는 이벤트' 신호를 인정하게 넓혔다");
}

console.log("\n⑤ 손으로 당겨 쓸 수 있는가(2026-08-05 유저: 5시 수확을 지금 땡긴다):");
{
  const cr = fs.readFileSync(new URL("../app/api/cron/trend-refresh/route.ts", import.meta.url), "utf-8");
  ok(/isAdminEmail\(user\.email\)/.test(cr), "★관리자 세션이면 브라우저에서 바로 돌릴 수 있다(종전엔 크론 시크릿만)");
  ok(/const force = url\.searchParams\.get\("force"\) === "1"/.test(cr) && /if \(!force && await hasFreshTrends/.test(cr), "★force=1이면 신선도 검사를 건너뛴다 — 안 그러면 '신선함'으로 스킵된다");
  ok(/const onlySub =/.test(cr), "★sub 지정 — 전체 30개를 돌리지 않는다(타임아웃 방지)");
  ok(/실시간 씨앗\(rising\)/.test(cr), "★들어왔는지를 응답에서 바로 보여준다(다시 물어보지 않아도 되게)");
  ok(/dropTop/.test(cr), "★안 들어왔으면 왜인지(탈락 사유)도 같이 준다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 브랜드 버즈 수확");
process.exit(fail ? 1 : 0);
