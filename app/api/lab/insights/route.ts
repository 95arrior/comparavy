import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { isTopCategory } from "@/lib/categories";
import { fetchRelatedKeywords, hasNaverAdEnv } from "@/lib/naverKeyword";
import { filterAndScore } from "@/lib/goldenKeyword";
import { fetchTrend, hasDatalabEnv, type TrendResult } from "@/lib/naverDatalab";

export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000; // 24h 캐시
const SPOTLIGHT_N = 8;

interface SpotKeyword { keyword: string; mobile: number; compIdx: string; rising?: boolean }

/**
 * 연구소 인사이트 — 카테고리별 공용 캐시(24h). 주목 키워드(검색광고) + 트렌드(데이터랩).
 * 캐시가 신선하면 네이버 호출 0. 오래됐을 때만 갱신 → 한도 안전.
 */
export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  const url = new URL(request.url);
  const category = (url.searchParams.get("category") ?? "").trim();
  const subRaw = (url.searchParams.get("sub") ?? "").trim();
  if (!isTopCategory(category)) return NextResponse.json({ error: "카테고리가 올바르지 않아요." }, { status: 400 });
  const sub = subRaw && subRaw !== "전체" ? subRaw : null;
  const topic = sub ?? category; // 검색어
  const cacheKey = `${category}|${sub ?? "전체"}`;

  const admin = createSupabaseAdminClient();

  // 1) 캐시 확인
  const { data: cached } = await admin.from("category_insights").select("*").eq("cache_key", cacheKey).maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS) {
    return NextResponse.json({ keywords: cached.keywords ?? [], trend: cached.trend ?? null, cached: true });
  }

  // 2) 갱신 — 주목 키워드(검색광고)
  let keywords: SpotKeyword[] = [];
  try {
    if (hasNaverAdEnv()) {
      const related = await fetchRelatedKeywords(topic);
      const scored = filterAndScore(related);
      // 경쟁 낮음 우대 + 검색량 — 상위 N
      scored.sort((a, b) => {
        const t = (x: string) => (x === "낮음" ? 0 : 1);
        return t(a.compIdx) - t(b.compIdx) || b.monthlyMobileQcCnt - a.monthlyMobileQcCnt;
      });
      keywords = scored.slice(0, SPOTLIGHT_N).map((s) => ({ keyword: s.keyword, mobile: s.monthlyMobileQcCnt, compIdx: s.compIdx }));
    }
  } catch {
    // 검색광고 실패 → 직전 캐시라도 있으면 그 키워드 유지
    if (cached?.keywords) keywords = cached.keywords as SpotKeyword[];
  }

  // 3) 트렌드(데이터랩) — 상위 5개
  let trend: TrendResult | null = null;
  try {
    if (hasDatalabEnv() && keywords.length) {
      trend = await fetchTrend(keywords.slice(0, 5).map((k) => k.keyword));
      const rising = new Set(trend.items.filter((i) => i.rising).map((i) => i.keyword));
      keywords = keywords.map((k) => ({ ...k, rising: rising.has(k.keyword) }));
    }
  } catch {
    trend = (cached?.trend as TrendResult) ?? null;
  }

  // 4) 캐시 저장 (실패 무시)
  try {
    await admin.from("category_insights").upsert({
      cache_key: cacheKey, category, sub, keywords, trend, updated_at: new Date().toISOString(),
    }, { onConflict: "cache_key" });
  } catch { /* 무시 */ }

  return NextResponse.json({ keywords, trend, cached: false });
}
