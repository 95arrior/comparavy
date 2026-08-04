// 밴드 문서수 컷 검증 — 실행: npx tsx scripts/check-doc-cut.mjs
// ★출발점은 유저 실물(2026-08-04): 신생(SEEDLING) 보드에 문서수 29,407·40,867·42,140·49,280 카드가 섰다.
//  밴드 상한은 1,000인데도 통과한 이유 = 상한이 쿼리에만 있었고(미측정 null 통과),
//  서빙 직전 측정된 값은 별점 '정렬'에만 쓰였다. 측정해 놓고 안 거르면 재는 의미가 없다.
import fs from "node:fs";
import { applyDocCut, DOC_HARD_MAX, compFromBlogTotal, filledStarsFromData } from "../lib/topicScore.ts";
import { TIER_BANDS } from "../lib/scoreWeights.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

const row = (keyword, blog_total) => ({ keyword, blog_total });
const docOf = (x) => x.blog_total;
const SEEDLING = TIER_BANDS.SEEDLING.blogTotalMax; // 1,000

console.log("① 문서수는 컷이 아니라 순서다(2026-08-05 유저: 상한 폐지):");
{
  // ★연혁: 08-04엔 '상한 초과 탈락'이었다. 하루 만에 반대 문제(열이 빔·유입 구간 배제)가 드러나 순서로 바꿨다.
  const real = [row("패시브인컴", 29407), row("신불자대출", 40867), row("금융공기업 채용", 42140), row("무담보사채", 49280)];
  const cut = applyDocCut(real, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut.kept.length === 3, "★자리가 있으면 큰 문서수도 선다(막지 않는다)");
  ok(cut.kept[0].blog_total === 29407, "★그래도 문서 적은 순으로 앞에 선다");
  ok(cut.dropped === 1, "정원을 넘는 만큼만 빠진다");
}

console.log("\n② 좋은 자리가 있으면 그게 먼저다:");
{
  const mixed = [row("big", 40000), row("small", 800), row("mid", 4000), row("none", null)];
  const cut = applyDocCut(mixed, docOf, { docMax: SEEDLING, need: 4 });
  const order = cut.kept.map((x) => x.keyword);
  ok(order[0] === "small" || order[0] === "none", "★상한 미만·미측정이 앞줄");
  ok(order.includes("big"), "★큰 자리도 자리가 남으면 들어온다");
}

console.log("\n③ 미측정은 벌하지 않는다:");
{
  const m = [row("a", null), row("b", null), row("c", 500)];
  const cut = applyDocCut(m, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut.kept.length === 3, "미측정 2 + 측정 1 전부 통과");
}

console.log("\n⑤-2 밴드 사다리 상한 — 실측으로 정한 값인가:");
{
  // ★2026-08-04 개정(1,000 → 3,000). 근거: 경제·재테크 측정 분포에서 1,000 미만은 0.5~2.8%뿐이었다.
  //  상한 1,000은 엄격한 기준이 아니라 재고가 없는 기준이었다. 값을 다시 바꾼다면 그때도 근거는 분포다.
  ok(SEEDLING === 3000, `신생 문서수 상한 = 3,000 (현재 ${SEEDLING})`);
  ok(TIER_BANDS.GROWING.blogTotalMax > SEEDLING, "성장기 상한이 신생보다 높다(사다리가 뒤집히지 않는다)");
  ok(SEEDLING < DOC_HARD_MAX, "밴드 상한은 절대 상한보다 낮다");
}

console.log("\n⑤-3 쿼리 상한 — 보충 후보를 미리 자르지 않는가(2026-08-05 실측: 열이 통째로 비었다):");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★신생 밴드 실측: 3,000 미만 3% · 10,000 미만 8% · 3만 이상 81%.
  //  쿼리를 밴드 상한(3,000)으로 막으면 후보의 3%만 남아 '컷은 살고 보충은 죽는' 상태가 된다.
  ok(/Math\.max\(tb\.blogTotalMax, DOC_HARD_MAX\)/.test(rt), "★쿼리는 보충 상한(1만)까지 열고, 판정은 applyDocCut 한 곳에서만 한다");
  ok(/const MEASURE_CAP = \d+/.test(rt) && /MEASURE_MS/.test(rt), "★서빙 중 측정에 개수·시간 상한이 있다(기본 경로 504 방어)");
  ok(/cutShort/.test(rt), "★상한에 걸려 덜 쟀으면 그 사실을 남긴다");
}

console.log("\n⑤-4 무거운 수집은 응답 밖으로(2026-08-05: 열이 통째로 비고 기본 경로가 504):");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★재고가 얇아지면 게으른 풀 수집이 매 요청마다 발동해 60초를 넘긴다 —
  //  정확히 채워야 할 때 응답이 죽는 구조였다. 채우는 일은 백그라운드로 보낸다.
  ok(/after\(async \(\) => \{\s*try \{ await buildPoolForSub/.test(rt), "★게으른 풀 수집이 after()로 빠졌다");
  ok(!/await buildPoolForSub\(vertical, sub, \{ sleepMs: 300 \}\);\s*\} catch \{\s*\/\* 수집 실패해도 빈 결과로 진행/.test(rt), "★응답 안에서 기다리지 않는다");
  ok(/pool-warm:lazy/.test(rt), "★언제 발동했는지 로그로 남긴다");
}

console.log("\n⑥ 배선 — 만들어놓고 안 부르면 아무 일도 안 일어난다:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/applyDocCut\(fitTop/.test(rt), "★topics 경로에 배선됨");
  const measureAt = rt.indexOf("fetchBlogTotalDetailed(r.keyword)");
  const cutAt = rt.indexOf("applyDocCut(fitTop");
  ok(measureAt > 0 && cutAt > measureAt, "★컷이 측정보다 뒤에 있다(순서가 뒤집히면 컷은 다시 무력해진다)");
  ok(/diag\.docCut/.test(rt), "★계측이 debug 응답에 남는다(다음에 또 의심되면 주소 하나로 판별)");
  // ★측정이 실패하면 컷은 걸 대상이 없다 — 화면엔 '경쟁 높음'(광고경쟁 폴백) 카드가 선다(유저 실측)
  ok(!/await Promise\.all\(\s*fitTop\.map/.test(rt), "★서빙 중 측정을 한꺼번에 던지지 않는다(429로 전멸)");
  ok(/const CONC = 3;/.test(rt) && /setTimeout\(res, 120\)/.test(rt), "★동시성 3 + 간격 — 백필에서 배운 값 그대로");
  ok(/diag\.docMeasure = measureDiag/.test(rt), "★측정 성공·실패·사유가 debug에 남는다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 밴드 문서수 컷");
process.exit(fail ? 1 : 0);
