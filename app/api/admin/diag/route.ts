import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";

export const dynamic = "force-dynamic";

// 관리자 전용 진단 — 트렌드 파이프라인이 어디서 끊기는지 증거를 한 번에 출력. 읽기 전용.
const BUILD_MARKER = "diag-4688910-143eab8"; // 이 문자열이 응답에 있으면 최신 배포 반영됨

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "관리자만" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const out: Record<string, unknown> = { build: BUILD_MARKER, email: user.email };

  // 5) 내 계정 프로필 값
  const { data: profile } = await admin.from("blog_profiles").select("vertical, sub_category, audience, target").eq("user_id", user.id).single();
  out.profile = profile ?? "(프로필 없음)";
  const sub = profile?.sub_category ?? null;

  // 2) trend_topics 저장 상태 (전체 + 내 카테고리)
  const { count: trendTotal } = await admin.from("trend_topics").select("*", { count: "exact", head: true });
  out.trend_topics_total = trendTotal ?? 0;
  if (sub) {
    const { data: mine } = await admin.from("trend_topics").select("keyword, title, category, created_at, expires_at").eq("category", sub).order("created_at", { ascending: false }).limit(20);
    const now = Date.now();
    out.trend_for_my_category = {
      category_queried: sub,
      count: mine?.length ?? 0,
      alive: (mine ?? []).filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now).length,
      sample: (mine ?? []).slice(0, 5).map((r) => ({ keyword: r.keyword, created_at: r.created_at, expires_at: r.expires_at, expired: r.expires_at ? new Date(r.expires_at).getTime() <= now : false })),
    };
  }
  // 모든 category 값 분포(내 sub와 정확히 일치하는지 확인용)
  const { data: cats } = await admin.from("trend_topics").select("category").limit(500);
  const catCounts: Record<string, number> = {};
  for (const c of cats ?? []) catCounts[c.category] = (catCounts[c.category] ?? 0) + 1;
  out.trend_categories = catCounts;

  // 4) 오늘자 증식 캐시(api_cache) 상태
  const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const { data: caches } = await admin.from("api_cache").select("key, expires_at, updated_at").like("key", `amp:${user.id}:${kstDay}:%`);
  out.amplify_cache_today = (caches ?? []).map((c) => ({ key: c.key, expires_at: c.expires_at, updated_at: c.updated_at }));

  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
