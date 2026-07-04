import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { refreshCategoryTrends, getTrendTopics } from "@/lib/trendTopics";
import { gatherHeadlinesWithStats } from "@/lib/trendSources";

export const maxDuration = 120;

// 관리자 전용 — 내 카테고리(또는 ?category=) 트렌드를 지금 즉시 채운다(테스트·검증용).
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만" }, { status: 403 });

  const url = new URL(request.url);
  let category = url.searchParams.get("category")?.trim() || "";
  if (!category) {
    const { data: p } = await supabase.from("blog_profiles").select("sub_category, vertical").eq("user_id", user.id).single();
    category = (p?.sub_category || p?.vertical || "").trim();
  }
  if (!category) return NextResponse.json({ error: "카테고리 없음(온보딩 먼저)" }, { status: 400 });

  const { stats } = await gatherHeadlinesWithStats(category).catch(() => ({ headlines: [], stats: null }));
  const { generated: count, drops } = await refreshCategoryTrends(category);
  // ★검증용 — 게이트 통과 씨앗 20개의 keyword(검색형) + 롱테일 유무. 뉴스 문구가 0개인지 육안 확인.
  const topics = (await getTrendTopics(category)).slice(0, 20);
  const seeds = topics.map((t) => ({ keyword: t.keyword, source: t.source ?? "?", longtails: (t.longtails ?? []).slice(0, 3).map((l) => l.kw) }));
  const dropDist: Record<string, number> = {};
  for (const d of drops) dropDist[d.reason] = (dropDist[d.reason] ?? 0) + 1;
  return NextResponse.json({
    ok: true, category, generated: count,
    freshness: stats, // {raw, fresh, unverified, stale(탈락), kept, perSeed} — 신선도 게이트 분포
    dropDist,         // 게이트별 탈락 분포 {unsafe_brand, stale_year, no_utility, gap}
    drops,            // ★탈락 목록 전체 — 오탈락(아까운 것) 감사용
    seeds, // [{keyword, source, longtails[]}] × 20
  });
}

// redeploy: trend-refresh route
// deploy trigger 2026-07-03 06:44:07
