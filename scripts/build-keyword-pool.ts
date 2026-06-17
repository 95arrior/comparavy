/**
 * 키워드 풀 적재 (CLI) — (업종·세부)별 시드로 네이버 발굴 → keyword_pool 적재.
 * 실제 적재 로직은 lib/keywordPool.buildPoolForSub 공유(관리자 라우트와 동일).
 *
 * 실행:
 *   npm run pool:build                  # 전체 (비용 큼 — 권장 X)
 *   npm run pool:build medical          # 업종 하나(전 세부)
 *   npm run pool:build medical 치과      # 업종+세부 하나 (테스트·비용통제 권장)
 *
 * 필요 env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   네이버 SearchAd(ACCESS_LICENSE/SECRET_KEY/CUSTOMER_ID), ANTHROPIC_API_KEY.
 */
import { buildPoolForSub } from "../lib/keywordPool";
import { VERTICAL_SUBS } from "../lib/verticalSubs";

async function run() {
  const [vArg, sArg] = process.argv.slice(2);
  const verticals = vArg ? [vArg] : Object.keys(VERTICAL_SUBS);

  let total = 0;
  for (const vertical of verticals) {
    const subs = sArg ? [sArg] : (VERTICAL_SUBS[vertical] ?? []);
    if (subs.length === 0) {
      console.log(`[${vertical}] 세부 없음 — 건너뜀`);
      continue;
    }
    console.log(`\n=== [${vertical}] 세부 ${subs.length}개 ===`);
    for (const sub of subs) {
      try {
        const r = await buildPoolForSub(vertical, sub);
        total += r.inserted;
        const fails = r.perSeed.filter((p) => p.error).length;
        console.log(`  [${sub}] → ${r.inserted}개 적재 (${(r.durationMs / 1000).toFixed(1)}s${fails ? `, 시드실패 ${fails}` : ""})`);
      } catch (e) {
        console.error(`  [${sub}] 실패: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  console.log(`\n완료. 적재(upsert) ${total}건.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
