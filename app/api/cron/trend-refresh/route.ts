import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { refreshCategoryTrends, hasFreshTrends } from "@/lib/trendTopics";

export const maxDuration = 300;

// ★트렌드 갱신 크론 — 활성 카테고리(유저가 실제 쓰는 주제)만 신선도 만료 시 갱신.
//  비용은 카테고리 수뿐(유저 수 무관). 6시간마다 실행 권장 → '그날 그시간' 트렌드.
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const xcron = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || xcron === secret;
}

const MAX_CATEGORIES = 30; // 1회 갱신 상한

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();

  // 활성 카테고리 = 온라인 프로필의 sub_category(중복 제거)
  const { data: profs } = await admin.from("blog_profiles").select("sub_category, vertical").limit(5000);
  const cats = new Set<string>();
  for (const p of profs ?? []) {
    const c = (p.sub_category || p.vertical || "").trim();
    if (c) cats.add(c);
  }
  const list = [...cats].slice(0, MAX_CATEGORIES);

  let refreshed = 0, skipped = 0, total = 0;
  for (const cat of list) {
    if (await hasFreshTrends(cat)) { skipped++; continue; }
    const n = await refreshCategoryTrends(cat);
    if (n > 0) { refreshed++; total += n; }
  }
  return NextResponse.json({ ok: true, categories: list.length, refreshed, skipped, topics: total });
}
