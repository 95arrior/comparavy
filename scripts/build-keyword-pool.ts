/**
 * 키워드 풀 적재 (Stage 1) — 업종 시드로 네이버 발굴 → keyword_pool 에 업종별 적재.
 *
 * 실행:
 *   npm run pool:build            # VERTICAL_SEEDS 전 업종
 *   npm run pool:build medical    # 특정 업종만
 *
 * 필요 env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   네이버 SearchAd 키(발굴), ANTHROPIC_API_KEY(AI 재구성). 비용 통제를 위해 수동 실행만(cron X).
 */
import { createSupabaseAdminClient } from "../lib/supabase-server";
import { discoverKeywords } from "../lib/keywordDiscovery";
import { VERTICAL_SEEDS } from "../lib/keywordSeeds";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const arg = process.argv[2];
  const verticals = arg ? [arg] : Object.keys(VERTICAL_SEEDS);
  const admin = createSupabaseAdminClient();

  let totalInserted = 0;
  for (const vertical of verticals) {
    const seeds = VERTICAL_SEEDS[vertical] ?? [];
    if (seeds.length === 0) {
      console.log(`[${vertical}] 시드 없음 — 건너뜀 (lib/keywordSeeds.ts 채우기)`);
      continue;
    }
    console.log(`\n=== [${vertical}] 시드 ${seeds.length}개 ===`);
    for (const seed of seeds) {
      try {
        const { keywords } = await discoverKeywords(seed);
        if (keywords.length === 0) {
          console.log(`  '${seed}' → 0개`);
          continue;
        }
        const rows = keywords.map((k) => ({
          vertical,
          keyword: k.keyword,
          monthly_searches: k.monthlyMobileQcCnt,
          competition: k.compIdx,
          estimated: k.estimated,
          seed,
          source: "naver",
          updated_at: new Date().toISOString(),
        }));
        // unique(vertical,keyword) → 중복은 갱신(times_assigned·created_at은 payload에 없어 보존)
        const { error } = await admin.from("keyword_pool").upsert(rows, { onConflict: "vertical,keyword" });
        if (error) console.log(`  '${seed}' → ${keywords.length}개 (저장 실패: ${error.message})`);
        else {
          totalInserted += rows.length;
          console.log(`  '${seed}' → ${keywords.length}개 적재`);
        }
        await sleep(1500); // 네이버 rate limit 여유
      } catch (e) {
        console.error(`  '${seed}' 실패: ${e instanceof Error ? e.message : String(e)}`);
        await sleep(1500);
      }
    }
  }
  console.log(`\n완료. 적재(upsert) 시도 ${totalInserted}건.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
