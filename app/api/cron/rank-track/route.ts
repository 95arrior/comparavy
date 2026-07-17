import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { RANK_CHECK_DAYS } from "@/lib/scoreWeights";
import { fetchBlogTabRank, fetchIntegratedAreas, sleep } from "@/lib/naverRank";

// ★순위 추적 크론(FF_PERF_LOOP) — D+1/3/7/14에 발행 글의 노출·순위를 스냅샷.
//  fail-soft: 개별 실패=unknown 기록 후 계속, 전체 실패=조용히 종료(글감 파이프 무영향).
//  요청 간 랜덤 지연(과도 호출 방지) + 배치 상한(런당 40건).
export const maxDuration = 300;

const BATCH_LIMIT = 40;

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!FF.perfLoop) return NextResponse.json({ ok: true, skipped: "FF_PERF_LOOP off" });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();

  // ★백필(2026-07-15) — perfLoop OFF였던 기간의 발행분(최근 15일·검증 완료·URL 보유)을 원장에 소급 등재.
  //  ignoreDuplicates: 기존 행(선별 맥락 보유)은 절대 덮지 않는다. 실패=조용히 계속.
  try {
    const sinceBF = new Date(Date.now() - 15 * 86400_000).toISOString();
    const { data: arts } = await db.from("articles")
      .select("id, user_id, blog_id, keyword, title, naver_url, verified_at")
      .gte("verified_at", sinceBF).not("naver_url", "is", null).not("keyword", "is", null).limit(500);
    if (arts?.length) {
      const rows = arts.map((a) => ({
        article_id: a.id, user_id: a.user_id, blog_id: (a as { blog_id?: string | null }).blog_id ?? null,
        url: (a as { naver_url?: string | null }).naver_url ?? null, keyword: a.keyword, title: a.title ?? null,
        published_at: (a as { verified_at?: string | null }).verified_at ?? new Date().toISOString(),
      }));
      await db.from("post_performance").upsert(rows, { onConflict: "article_id", ignoreDuplicates: true });
    }
  } catch (e) { console.error("[rank-track] 백필 실패(계속 진행):", e instanceof Error ? e.message : e); }

  // 최근 15일 발행분 중 due 체크포인트(발행 후 N일 경과 & 해당 스냅샷 없음)
  const since = new Date(Date.now() - 15 * 86400_000).toISOString();
  const { data: posts } = await db.from("post_performance")
    .select("article_id, keyword, url, published_at")
    .gte("published_at", since).not("url", "is", null)
    .order("published_at", { ascending: true }).limit(300);
  if (!posts?.length) return NextResponse.json({ ok: true, due: 0 });

  const ids = posts.map((p) => p.article_id);
  const { data: snaps } = await db.from("rank_snapshots").select("article_id, day_offset, area").in("article_id", ids);
  const have = new Set((snaps ?? []).map((s) => `${s.article_id}:${s.day_offset}:${s.area}`));

  let checked = 0, wins = 0, unknowns = 0;
  for (const p of posts) {
    if (checked >= BATCH_LIMIT) break;
    const ageDays = (Date.now() - new Date(String(p.published_at)).getTime()) / 86400_000;
    // 이 글의 due 오프셋 = 경과한 체크포인트 중 아직 스냅샷 없는 가장 큰 것(밀린 크론도 따라잡음)
    const due = [...RANK_CHECK_DAYS].reverse().find((d) => ageDays >= d && !have.has(`${p.article_id}:${d}:blog_tab`));
    if (!due) continue;
    checked += 1;
    await sleep(400 + Math.floor(Math.random() * 800)); // 요청 간 랜덤 지연(스펙 §1-2)
    const blogTab = await fetchBlogTabRank(String(p.keyword), String(p.url));
    // ★통합검색 1회 요청으로 통합 노출 + AI 브리핑 인용을 함께 측정(2026-07-17 — 어떤 글이 AI 브리핑에 인용되는지 실측 축적)
    const [integrated, aiBrief] = await fetchIntegratedAreas(String(p.keyword), String(p.url));
    if (blogTab.status === "unknown") unknowns += 1;
    if (blogTab.rank != null) wins += 1;
    for (const r of [blogTab, integrated, aiBrief]) {
      try {
        await db.from("rank_snapshots").upsert(
          { article_id: p.article_id, day_offset: due, area: r.area, rank: r.rank, status: r.status, checked_at: new Date().toISOString() },
          { onConflict: "article_id,day_offset,area" },
        );
      } catch (e) { console.error("[rank-track] 기록 실패:", e instanceof Error ? e.message : e); }
    }
  }
  return NextResponse.json({ ok: true, checked, wins, unknowns });
}
