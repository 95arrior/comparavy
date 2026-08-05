// 행동 창(청약·접수·마감) 신선도 — 실행: npx tsx scripts/check-action-window.mjs
// ★유저 실측(2026-08-05): "'더샵 분당센트로' 줍줍 5가구 떴다 — 분당인데 줍줍, 이런 게 동탄 줍줍이여. 왜 빠트려."
//  세 겹이 겹쳐서 놓쳤다:
//   ① 청약홈 API를 60건만 가져와 최신 공고가 잘렸다
//   ② 신선도를 '공고일'로 재서, 공고가 며칠 전이면 접수가 진행 중이어도 버렸다
//   ③ 뉴스 창이 1시간이라 17시간 전 기사를 못 봤다 — 접수는 8/5~8/11로 아직 열려 있는데
import fs from "node:fs";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };
const ah = fs.readFileSync(new URL("../lib/applyhome.ts", import.meta.url), "utf-8");
const ts = fs.readFileSync(new URL("../lib/trendSources.ts", import.meta.url), "utf-8");

console.log("① 청약홈 — 충분히 가져오는가:");
{
  ok(/perPage=300/.test(ah), "★60 → 300건(60건으로는 최신 공고가 잘렸다)");
  ok(/RCRIT_PBLANC_DE.*localeCompare|localeCompare\(String\(a\.RCRIT_PBLANC_DE/.test(ah), "★공고일 내림차순으로 코드가 정렬한다(API 순서에 기대지 않는다)");
  ok(/우리가 못 본 게 아니라 애초에 안 가져왔다/.test(ah), "원인이 코드에 적혀 있다");
}

console.log("\n② 신선도를 '접수 창'으로 재는가:");
{
  // ★공고는 미리 나고 접수는 나중이다 — 공고일로 재면 선점하기 가장 좋은 시점을 막는다
  ok(!/공고일 48h 게이트/.test(ah), "★공고일 48시간 게이트가 제거됨");
  ok(/const SOON = 14 \* 86400_000/.test(ah), "접수 시작 2주 이내만(너무 먼 공고는 이르다)");
  ok(/endTs < now\) continue/.test(ah), "이미 마감된 건 제외");
  ok(/선점하기 가장 좋은 시점을 게이트가 막고 있었다/.test(ah), "왜 바꿨는지가 적혀 있다");
  ok(/daysToStart\(a\) - daysToStart\(b\)/.test(ah), "★접수 임박순 정렬(선점 창이 짧은 것부터)");
}

console.log("\n③ 뉴스 창 — 행동 창이 있으면 넓힌다:");
{
  const ACTION = /(줍줍|무순위|임의공급|잔여세대|취소분|특별공급|사전청약|본청약|청약|접수|모집\s?기간|모집\s?공고|(접수|신청)\s?마감|마감\s?임박|마감일|신청\s?기간|공고)/;
  ok(ACTION.test("'더샵 분당센트로' 줍줍 5가구 떴다...분양가와 청약 조건 확인"), "★유저가 지목한 실물 기사를 잡는다");
  ok(ACTION.test("e편한세상 동탄 파크아너스 무순위 줍줍"), "동탄 줍줍도 잡는다");
  ok(!ACTION.test("코스피 3% 상승 마감세"), "★'마감세'(장 마감)는 안 걸린다 — 실측 오탐");
  ok(ACTION.test("근로장려금 신청 마감 D-3"), "진짜 접수 마감은 잡는다");
  ok(/ACTION_WINDOW_MS = 24 \* 3600_000/.test(ts), "행동 창은 24시간");
  ok(/const FRESH_WINDOW_MS = 1 \* 3600_000/.test(ts), "일반 뉴스는 1시간 유지");
  ok(/'기사가 몇 시간 전인가'와 '아직 신청할 수 있는가'는 다른 문제다/.test(ts), "★왜 갈랐는지가 적혀 있다");
  ok(/freshForTitle\(it\.pubDate, now/.test(ts) && /freshForTitle\(pub, now/.test(ts), "★두 뉴스 경로(네이버·구글) 모두에 배선됨");
}

console.log("\n④ 청약홈 API가 늦다는 사실이 기록됐는가:");
{
  // ★8월 임의공급 4차가 API에는 없고 2월 공고만 있었다 — 이럴 땐 뉴스가 더 빠르다
  ok(/청약홈 오픈API는 이런 신규 회차가 늦게 올라온다/.test(ts), "★API가 늦는 자리라는 실측이 남아 있다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 행동 창 신선도");
process.exit(fail ? 1 : 0);
