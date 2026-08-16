// ★되먹임 가중치(FF_PERF_LOOP §1-4) — 관측 먼저, 적용은 표본 이후.
//  전체(공유 풀) 집계로 시작: 유저별 표본 30은 수개월 걸림 — 패턴 학습은 전 유저 데이터가 먼저 차오른다.
//  규칙: 표본 < PERF_MIN_SAMPLE 조합 = 가중치 1(미적용). 적용 시 1±PERF_WEIGHT_CLAMP 클램프.
//  실패 = 빈 가중치(전부 1)로 조용히 폴백 + 로그(스펙 §0-6 fail-closed).
import type { SupabaseClient } from "@supabase/supabase-js";
import { PERF_MIN_SAMPLE, PERF_WEIGHT_CLAMP, RANK_WIN } from "./scoreWeights";

export interface PerfWeights {
  bySource: Record<string, number>;             // seed_source → 가중치
  byHookSpecies: Record<string, number>;        // `${hook_type}|${species}` → 가중치
}
const EMPTY: PerfWeights = { bySource: {}, byHookSpecies: {} };

interface Agg { win: number; total: number }
function weightOf(a: Agg | undefined, overallRate: number): number {
  if (!a || a.total < PERF_MIN_SAMPLE) return 1;
  const adj = a.win / a.total - overallRate;
  return 1 + Math.max(-PERF_WEIGHT_CLAMP, Math.min(PERF_WEIGHT_CLAMP, adj));
}

/** D+7 블로그탭 상위노출을 '승리'로 집계 — api_cache 6시간. */
export async function getPerfWeights(db: SupabaseClient): Promise<PerfWeights> {
  try {
    const cacheKey = "perf_weights:v1";
    const { data: c } = await db.from("api_cache").select("value, expires_at").eq("key", cacheKey).maybeSingle();
    if (c?.value && new Date(String(c.expires_at)).getTime() > Date.now()) return c.value as PerfWeights;

    const { data: snaps } = await db.from("rank_snapshots")
      .select("article_id, rank, status").eq("day_offset", 7).eq("area", "blog_tab").limit(4000);
    if (!snaps?.length) return EMPTY;
    const winByArticle = new Map<string, boolean>();
    for (const s of snaps) {
      if (s.status === "unknown") continue; // 불명은 표본에서 제외(패배로 오인 금지)
      winByArticle.set(String(s.article_id), s.rank != null && s.rank <= RANK_WIN.blogTabTop);
    }
    if (winByArticle.size === 0) return EMPTY;
    const { data: posts } = await db.from("post_performance")
      .select("article_id, species, seed_source, hook_type").in("article_id", [...winByArticle.keys()]).limit(4000);
    const src = new Map<string, Agg>(); const hs = new Map<string, Agg>();
    let win = 0, total = 0;
    for (const p of posts ?? []) {
      const w = winByArticle.get(String(p.article_id));
      if (w === undefined) continue;
      total += 1; if (w) win += 1;
      const bump = (m: Map<string, Agg>, k: string | null) => { if (!k) return; const a = m.get(k) ?? { win: 0, total: 0 }; a.total += 1; if (w) a.win += 1; m.set(k, a); };
      bump(src, (p as { seed_source?: string | null }).seed_source ?? null);
      bump(hs, p.hook_type && p.species ? `${p.hook_type}|${p.species}` : null);
    }
    if (total === 0) return EMPTY;
    const overall = win / total;
    const out: PerfWeights = { bySource: {}, byHookSpecies: {} };
    for (const [k, a] of src) out.bySource[k] = weightOf(a, overall);
    for (const [k, a] of hs) out.byHookSpecies[k] = weightOf(a, overall);
    try { await db.from("api_cache").upsert({ key: cacheKey, value: out, expires_at: new Date(Date.now() + 6 * 3600_000).toISOString(), updated_at: new Date().toISOString() }); } catch { /* ignore */ }
    return out;
  } catch (e) {
    console.error("[perf] 가중치 계산 실패 — 미적용 폴백:", e instanceof Error ? e.message : e);
    return EMPTY;
  }
}
