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

console.log("① 유저 실물 — 신생 보드에 선 고문서수 카드:");
{
  const real = [row("패시브인컴", 29407), row("신불자대출", 40867), row("금융공기업 채용", 42140), row("무담보사채", 49280)];
  const cut = applyDocCut(real, docOf, { docMax: SEEDLING, need: 7 });
  ok(cut.kept.length === 0, "★4장 전부 탈락 — 절대 상한(1만) 위는 보충 대상도 아니다");
  ok(cut.dropped === 4, "탈락 4건으로 계측된다");
  // 종전 코드가 왜 못 걸렀는지 — 이 셋이 전부 '컷'이 아니라 '정렬'이었다
  ok(compFromBlogTotal(49280) === "mid", "★등급으로는 mid — high 폴백 규칙에 안 걸린다(종전 통과 이유)");
  ok(filledStarsFromData(1790, 49280) >= 2, "★별점도 2개는 돼서 정렬로만 뒤로 밀렸다(컷이 아니었다)");
}

console.log("\n② 미측정(null)은 통과 — 모르는 것을 벌하지 않는다:");
{
  const mixed = [row("a", null), row("b", null), row("c", 500), row("d", 30000)];
  const cut = applyDocCut(mixed, docOf, { docMax: SEEDLING, need: 7 });
  ok(cut.kept.length === 3 && cut.kept.every((x) => x.blog_total !== 30000), "미측정 2 + 상한 미만 1만 남는다");
}

console.log("\n③ 자리가 남으면 '문서수 적은 순'으로 보충(보드를 비우지 않는다):");
{
  // ★밴드 값이 바뀌어도 이 검증은 흔들리면 안 된다 — 규칙(정렬·보충·절대상한)을 재는 자리라 상한은 고정값으로 준다.
  const thin = [row("under", 800), row("over-9k", 9000), row("over-2k", 2000), row("over-5k", 5000), row("way-over", 40000)];
  const cut = applyDocCut(thin, docOf, { docMax: 1000, need: 3 });
  ok(cut.kept.map((x) => x.keyword).join(",") === "under,over-2k,over-5k", "★상한 미만 먼저, 그다음 2,000 → 5,000 순으로 채운다");
  ok(!cut.kept.some((x) => (x.blog_total ?? 0) >= DOC_HARD_MAX), "★절대 상한 위는 자리가 비어도 안 넣는다");
  ok(cut.refilled === 2 && cut.dropped === 2, "보충 2 · 탈락 2 계측");
}

console.log("\n④ 자리가 넉넉하면 보충하지 않는다(과교정 방어):");
{
  const rich = [row("a", 100), row("b", 200), row("c", 300), row("d", 4000)];
  const cut = applyDocCut(rich, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut.kept.length === 3 && cut.refilled === 0, "상한 미만이 이미 충분하면 초과분은 안 들어온다");
}

console.log("\n⑤ 성장기 밴드(5,000)도 같은 규칙:");
{
  const g = [row("a", 4900), row("b", 6000), row("c", 12000)];
  const cut = applyDocCut(g, docOf, { docMax: TIER_BANDS.GROWING.blogTotalMax, need: 3 });
  ok(cut.kept.map((x) => x.keyword).join(",") === "a,b", "밴드 미만 + 보충 1(1만 미만) — 1만 이상은 제외");
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
