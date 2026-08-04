// 실시간 급상승 레인 검증 — 실행: npx tsx scripts/check-rising-lane.mjs
// ★유저 상시 요구(여러 번 반복됨): "'지금 뜨는'은 실제로 효과 있는 실시간 키워드로 해야 한다.
//  혹은 API로 가져오는 것 중 대형 선점 가능한 것들."
// ★2026-07-24에 '실시간 급상승만 밴드 우회'로 확정했는데, 2026-08-01의 '급상승 우회 봉쇄'가
//  그 예외까지 같이 덮었다. 게다가 급상승 혈통이 합성 단계에서 source:"news"로 뭉개져
//  무엇이 실시간 유래인지 코드가 알 방법조차 없었다 — 그래서 요구를 지킬 수가 없었다.
import fs from "node:fs";
import { risingKeywordOf, RISING_SEED, RISING_TAG } from "../lib/trendSources.ts";
import { DOC_HARD_MAX } from "../lib/topicScore.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 급상승 헤드라인에서 실제 검색어만 뽑는다:");
{
  ok(risingKeywordOf(`[${RISING_TAG} 20,000+ 검색] 민생지원금 신청 — 오늘부터 접수`) === "민생지원금 신청", "검색어만 분리(트래픽·뉴스제목 제거)");
  ok(risingKeywordOf(`[${RISING_TAG} ? 검색] 금리 인하`) === "금리 인하", "트래픽 미상도 처리");
  ok(risingKeywordOf("그냥 뉴스 제목입니다") === "", "급상승 형식이 아니면 빈 값");
  ok(RISING_SEED === "실시간급상승", "씨앗 라벨이 상수로 고정됨");
}

console.log("\n② 혈통 보존 — 합성 결과가 급상승 검색어를 품으면 source='rising':");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/\| "rising"/.test(tt), "SeedSource에 rising이 있다");
  ok(/source: risingHit \? "rising" : "news"/.test(tt), "★합성 행에 실시간 혈통을 태깅한다(종전엔 전부 news로 뭉갰다)");
  ok(/risingKws\.find\(/.test(tt), "원본 급상승 검색어와 대조한다");
  ok(/\[rising\] \$\{category\}/.test(tt), "★수확 대비 생존을 계측한다(안 들어오는지 합성에서 죽는지 구분)");
  // 씨앗을 직접 밀어 넣지 않는 이유가 코드에 남아 있어야 한다(다음 사람이 되돌리지 않게)
  ok(/합성 LLM이 이미 카테고리 정합으로 걸러/.test(tt), "★태깅만 하는 이유가 적혀 있다");
  // ★2026-08-05: 태깅만으로는 diag.rising.seen이 0이었다 — 표식만 있고 실물이 없으면 소용없다
  ok(/급상승 직접 주입/.test(tt), "★급상승 검색어를 씨앗으로 직접 주입한다");
  ok(/injected >= 3/.test(tt), "★하루 상한이 있다(실시간이 보드를 통째로 먹지 않게)");
  ok(/const fits = \[\.\.\.catWords\]\.some/.test(tt), "★카테고리 정합 관문 — 무관한 급상승어(연예·스포츠)는 안 들인다");
  ok(/isUnsafeKeyword\(kw\) \|\| scamLoan\(kw\)/.test(tt), "★안전 게이트는 직접 주입에도 그대로 적용된다");
}

console.log("\n③ 밴드 우회는 '선점 가능'을 숫자로 증명한 것만:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/risingPass\?: boolean \}\)\.risingPass === true\) return true;/.test(rt), "★risingPass 카드는 밴드를 통과한다");
  ok(/const total = await fetchBlogTotal\(c\.keyword\);/.test(rt) && /rising\.unmeasured \+= 1; return;/.test(rt), "★문서수를 재고, 못 쟀으면 우회하지 않는다");
  ok(/if \(total < DOC_HARD_MAX\)/.test(rt), `★상한(${DOC_HARD_MAX.toLocaleString("en-US")}) 미만일 때만 통과 — 포화 키워드는 실시간이어도 못 이긴다`);
  ok(/risingSeed: true/.test(rt) && /상관없는 스위치에 목숨을 걸지 않는다/.test(rt), "★표식이 FF_PERF_LOOP와 무관하게 카드에 실린다");
  ok(/tc = \[\.\.\.tc\.filter\(\(c\) => \(c as \{ risingPass\?: boolean \}\)\.risingPass === true\)/.test(rt), "★통과한 실시간 카드를 앞에 세운다(뒤로 밀면 화면에 안 보인다)");
  ok(/diag\.rising = rising/.test(rt), "★debug 응답에 실린다(수집·측정·통과·포화·미측정)");
  // 우회가 무조건이 되면 8.8만 헤드가 신생 보드에 꽂히던 실패로 돌아간다 — 그 경고가 코드에 남아야 한다
  ok(/무조건 우회는/.test(rt), "★무조건 우회 금지 이유가 적혀 있다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 실시간 급상승 레인");
process.exit(fail ? 1 : 0);
