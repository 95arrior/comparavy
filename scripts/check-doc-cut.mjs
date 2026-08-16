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

console.log("① 순서 + 절대 상한(2026-08-07 재확정):");
{
  // ★연혁: 08-04 '상한 초과 탈락' → 08-05 유저 폐지("홈판 덕에 노출 잘 된다") → 08-07 절대 상한 부활.
  //  폐지의 전제(홈판)가 같은 날 폐지됐고 홈 유입 실측 1.92%. 이긴 글 4편 전부 문서 수백 편 이하였고,
  //  문서 759,554(소상공인지원사업)가 '보충'으로 보드에 섰다 — 발행 슬롯이 하루 3~4편뿐인데
  //  못 이길 자리에 쓰는 게 진짜 비용이다. ★빈 줄이 못 이길 카드보다 낫다.
  const real = [row("패시브인컴", 29407), row("신불자대출", 40867), row("금융공기업 채용", 42140), row("무담보사채", 49280)];
  const cut = applyDocCut(real, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut.kept.length === 0, "★절대 상한(1만) 위는 자리가 남아도 안 선다");
  const soft = [row("a", 4000), row("b", 8000), row("c", 40000)];
  const cut2 = applyDocCut(soft, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut2.kept.length === 2 && cut2.kept[0].blog_total === 4000, "★밴드 초과~절대 상한 사이만 문서 적은 순으로 보충");
  ok(!cut2.kept.some((x) => x.blog_total === 40000), "절대 상한 위는 보충에서도 제외");
  // 유저 실물: 클라우드펀딩 31,470 · 소상공인지원사업 759,554가 보드에 섰던 그 날
  const user실물 = [row("삼성증권IRP계좌개설", 5302), row("클라우드펀딩", 31470), row("소상공인지원사업", 759554)];
  const cut3 = applyDocCut(user실물, docOf, { docMax: SEEDLING, need: 3 });
  ok(cut3.kept.length === 1 && cut3.kept[0].keyword === "삼성증권IRP계좌개설", "★유저 실물 재현: IRP만 남는다");
}

console.log("\n② 좋은 자리가 있으면 그게 먼저다:");
{
  const mixed = [row("big", 40000), row("small", 800), row("mid", 4000), row("none", null)];
  const cut = applyDocCut(mixed, docOf, { docMax: SEEDLING, need: 4 });
  const order = cut.kept.map((x) => x.keyword);
  ok(order[0] === "small" || order[0] === "none", "★상한 미만·미측정이 앞줄");
  ok(order.includes("mid") && !order.includes("big"), "★보충은 절대 상한 아래에서만(4만은 제외)");
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
