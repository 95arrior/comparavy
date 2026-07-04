// 키워드 풀 적재 코어 — (vertical, sub) 하나를 시드로 수집해 keyword_pool에 적재.
// collectPoolKeywords(원본 연관키워드, AI 없음)를 사용 — 핵심 키워드 보존 + 풍부함.
// 스크립트(scripts/build-keyword-pool)와 관리자 라우트(/api/admin/build-pool)가 공유한다(중복 제거).
import { createSupabaseAdminClient } from "./supabase-server";
import { collectPoolKeywords, type PoolKeyword } from "./poolCollect";
import { VERTICAL_SEEDS } from "./keywordSeeds";
import { expandSeeds } from "./aiSeeds";
import { fetchNaverAutocomplete } from "./naverAutocomplete";

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
  // local은 [sub 라벨 + 추가시드]. online/hobby는 라벨에 "·"가 있어 라벨 시드 제외, 시드맵만 사용.
  const extra = VERTICAL_SEEDS[vertical]?.[sub] ?? [];
  const baseSeeds = vertical === "online" || vertical === "hobby"
    ? (extra.length ? extra : [sub.replace(/·/g, " ").trim()])
    : [sub, ...extra];
  // ★ AI 하위주제 시드로 확장 — 카테고리명 하나만으론 풀이 얕아 변동성·선점 부족 → 하위주제 다수 펼쳐 풀 대폭↑
  const aiSeeds = await expandSeeds(sub, 15);
  // ★ 네이버 자동완성 — 사람들이 실제로 네이버에 치는 검색어를 시드로 추가(네이버 핏 강화). 실패해도 무관.
  const acSeeds = await fetchNaverAutocomplete(sub);
  const seeds = [...new Set([...baseSeeds, ...aiSeeds, ...acSeeds].map((s) => s.trim()).filter(Boolean))];
  const sleepMs = opts?.sleepMs ?? 700; // 시드당 네이버 1회(collectPoolKeywords). 시드 늘어 sub당 ~15~25초

  // (vertical,sub) 내 dedupe. 키는 unique(vertical,sub,keyword)와 동일하게 '원본 키워드'로
  // — 같은 배치에 동일 keyword가 두 번 들어가면 upsert가 충돌하므로 정확 키로 합친다.
  const collected = new Map<string, { k: PoolKeyword; seed: string }>();
  const perSeed: { seed: string; found: number; error?: string }[] = [];
  for (const seed of seeds) {
    try {
      const keywords = await collectPoolKeywords(seed);
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
      keyword: k.keyword, // 원본 키워드(글감형 변환은 추천 단계에서)
      monthly_searches: k.monthlySearches,
      competition: k.compIdx, // 낮음/중간/높음 그대로
      ad_depth: k.adDepth ?? null, // ★단가 프록시(광고 밀도) — 같은 응답 필드라 추가 호출 0 (0052)
      estimated: false, // 네이버 정확 검색량
      seed,
      source: "naver",
      updated_at: new Date().toISOString(),
    }));
    // unique(vertical,sub,keyword) → 중복은 갱신(times_assigned·created_at 보존)
    let { error } = await admin.from("keyword_pool").upsert(rows, { onConflict: "vertical,sub,keyword" });
    if (error && /ad_depth/.test(error.message)) { // 0052 미적용 방어
      const bare = rows.map(({ ad_depth: _d, ...rest }) => rest);
      ({ error } = await admin.from("keyword_pool").upsert(bare, { onConflict: "vertical,sub,keyword" }));
    }
    if (error) throw new Error(`풀 저장 실패: ${error.message}`);
    inserted = rows.length;
  }

  return { vertical, sub, inserted, perSeed, durationMs: Date.now() - t0 };
}
