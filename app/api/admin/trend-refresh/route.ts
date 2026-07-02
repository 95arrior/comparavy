import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { refreshCategoryTrends, getTrendTopics } from "@/lib/trendTopics";
import { gatherHeadlines } from "@/lib/trendSources";

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

  const heads = await gatherHeadlines(category).catch(() => []);
  const count = await refreshCategoryTrends(category);
  const sample = (await getTrendTopics(category)).slice(0, 20).map((t) => t.title);
  return NextResponse.json({ ok: true, category, headlines: heads.length, headlineSample: heads.slice(0, 5).map((h) => h.title), generated: count, sample });
}

// redeploy: trend-refresh route
// deploy trigger 2026-07-03 06:44:07
