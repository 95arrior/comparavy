// ★성과 루프(FF_PERF_LOOP) — 발행 성공(검증 통과) 시점 스냅샷 기록.
//  원칙(스펙 §0-6): 이 모듈의 어떤 실패도 검증 파이프라인을 막지 않는다 — 로그만 남기고 조용히 폴백.
import { createSupabaseAdminClient } from "./supabase-server";
import { FF } from "@/config/featureFlags";

/** verified 전환 직후 호출(fire-and-forget). articles.selection_meta(카드 선별 맥락)를 원장으로 옮긴다. */
export async function recordPostPerformance(articleId: string): Promise<void> {
  if (!FF.perfLoop || !articleId) return;
  try {
    const db = createSupabaseAdminClient();
    const { data: a } = await db.from("articles")
      .select("id, user_id, blog_id, keyword, title, naver_url, verified_at, selection_meta")
      .eq("id", articleId).maybeSingle();
    if (!a?.keyword) return;
    const sel = ((a as { selection_meta?: unknown }).selection_meta ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    await db.from("post_performance").upsert({
      article_id: a.id,
      user_id: a.user_id,
      blog_id: (a as { blog_id?: string | null }).blog_id ?? null,
      url: (a as { naver_url?: string | null }).naver_url ?? null,
      keyword: a.keyword,
      title: a.title ?? null,
      published_at: (a as { verified_at?: string | null }).verified_at ?? new Date().toISOString(),
      species: str(sel.species),
      seed_source: str(sel.seedSource),
      hook_type: str(sel.hookKey),
      structure_id: str(sel.structure),
      score_breakdown: sel,
      vol: num(sel.vol),
      blog_total: num(sel.blogTotal),
      stars: num(sel.stars),
    }, { onConflict: "article_id" });
  } catch (e) {
    console.error("[perf] 발행 스냅샷 실패(파이프 무영향):", e instanceof Error ? e.message : e);
  }
}
