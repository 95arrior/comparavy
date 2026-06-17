// 키워드 풀 적재 코어 — (vertical, sub) 하나를 시드로 발굴해 keyword_pool에 적재.
// 스크립트(scripts/build-keyword-pool)와 관리자 라우트(/api/admin/build-pool)가 공유한다(중복 제거).
import { createSupabaseAdminClient } from "./supabase-server";
import { discoverKeywords } from "./keywordDiscovery";
import { VERTICAL_SEEDS } from "./keywordSeeds";
import type { GoldenKeyword } from "./goldenKeyword";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PoolBuildResult {
  vertical: string;
  sub: string;
  inserted: number; // keyword_pool에 upsert한 행 수((vertical,sub) 내 dedupe 후)
  perSeed: { seed: string; found: number; error?: string }[];
  durationMs: number;
}

/**
 * (vertical, sub) 한 개를 적재한다. 시드 = [sub 라벨 + 추가시드]. 시드별 발굴 후 dedupe → upsert.
 * 발굴 실패는 perSeed에 기록하고 계속(부분 실패 허용). 저장(upsert) 실패만 throw.
 */
export async function buildPoolForSub(vertical: string, sub: string, opts?: { sleepMs?: number }): Promise<PoolBuildResult> {
  const t0 = Date.now();
  const admin = createSupabaseAdminClient();
  const seeds = [sub, ...(VERTICAL_SEEDS[vertical]?.[sub] ?? [])]; // sub 라벨 자동 포함
  const sleepMs = opts?.sleepMs ?? 1500; // 네이버 rate limit 여유

  const collected = new Map<string, { k: GoldenKeyword; seed: string }>(); // (vertical,sub) 내 dedupe
  const perSeed: { seed: string; found: number; error?: string }[] = [];
  for (const seed of seeds) {
    try {
      const { keywords } = await discoverKeywords(seed);
      for (const k of keywords) if (!collected.has(k.keyword)) collected.set(k.keyword, { k, seed });
      perSeed.push({ seed, found: keywords.length });
    } catch (e) {
      perSeed.push({ seed, found: 0, error: e instanceof Error ? e.message : String(e) });
    }
    await sleep(sleepMs);
  }

  let inserted = 0;
  if (collected.size > 0) {
    const rows = [...collected.values()].map(({ k, seed }) => ({
      vertical,
      sub,
      keyword: k.keyword,
      monthly_searches: k.monthlyMobileQcCnt,
      competition: k.compIdx,
      estimated: k.estimated,
      seed,
      source: "naver",
      updated_at: new Date().toISOString(),
    }));
    // unique(vertical,sub,keyword) → 중복은 갱신(times_assigned·created_at 보존)
    const { error } = await admin.from("keyword_pool").upsert(rows, { onConflict: "vertical,sub,keyword" });
    if (error) throw new Error(`풀 저장 실패: ${error.message}`);
    inserted = rows.length;
  }

  return { vertical, sub, inserted, perSeed, durationMs: Date.now() - t0 };
}
