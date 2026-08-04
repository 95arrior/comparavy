// 브랜드 버즈 수확기 검증 — 실행: npx tsx scripts/check-brand-buzz.mjs
// ★출발점(2026-08-05 유저): 유명 블로거가 7/29에 '케이뱅크 황금캡슐 이벤트'를 써서 대박이 났는데
//  우리 보드엔 그런 글감이 한 번도 뜬 적이 없다. 유저가 전에도 물었던 그 자리다.
// ★그 키워드가 못 들어오던 3중 봉쇄:
//  ①씨앗 수확 쿼리가 분야 일반명사뿐 ②급상승 정합 관문이 일반명사 겹침만 봄 ③검색광고 풀에 신조어 없음
import fs from "node:fs";
import { hasBrandAxis } from "../lib/brandBuzz.ts";

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
  ok(/브랜드당 1개/.test(src), "★브랜드당 1개 — 한 브랜드가 보드를 먹지 않게");
  ok(/budgetMs/.test(src), "★시간 예산이 있다(비공식 엔드포인트가 느려도 수확 전체를 안 붙잡는다)");
}

console.log("\n③ 자동완성 호출 자체의 안전장치:");
{
  const ac = fs.readFileSync(new URL("../lib/naverAutocomplete.ts", import.meta.url), "utf-8");
  ok(/AbortSignal\.timeout\(/.test(ac), "★타임아웃이 있다 — 한 번 매달리면 수확이 멈춘다");
}

console.log("\n④ 배선 — 씨앗으로 실제로 들어가는가:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/harvestBrandBuzz\(category/.test(tt), "★수확기가 트렌드 갱신에서 호출된다");
  ok(/source: "rising"/.test(tt), "★실시간 종족으로 들어간다(밴드 우회 판정 대상)");
  ok(/isUnsafeKeyword\(kw\) \|\| scamLoan\(kw\)/.test(tt), "안전 게이트는 그대로 적용된다");
  ok(/확인되지 않은 금액·기간·당첨 조건을 지어내지 마라/.test(tt), "★이벤트 글의 최대 리스크(지어낸 조건)를 지시로 막는다");
  ok(/MONEY_BUZZ/.test(tt), "★급상승 정합 관문도 '돈 되는 이벤트' 신호를 인정하게 넓혔다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 브랜드 버즈 수확");
process.exit(fail ? 1 : 0);
