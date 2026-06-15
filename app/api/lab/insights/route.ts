import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { isTopCategory } from "@/lib/categories";
import { hasNaverAdEnv } from "@/lib/naverKeyword";
import { discoverGolden } from "@/lib/goldenDiscover";
import { fetchTrend, hasDatalabEnv, type TrendResult } from "@/lib/naverDatalab";
import { logUsage } from "@/lib/usageLog";

export const maxDuration = 60;

const TTL_MS = 24 * 60 * 60 * 1000; // 24h 캐시
const SPOTLIGHT_N = 8;

interface SpotKeyword { keyword: string; mobile: number; compIdx: string; estimated?: boolean; rising?: boolean }

// 데이터 기준 시점 (예: 2026-06)
function asOfLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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
  const CACHE_V = "v2"; // 로직 바뀌면 올려서 옛 캐시 자동 폐기
  const cacheKey = `${category}|${sub ?? "전체"}|${CACHE_V}`;

  const admin = createSupabaseAdminClient();

  const asOf = asOfLabel();

  // 1) 캐시 확인
  const { data: cached } = await admin.from("category_insights").select("*").eq("cache_key", cacheKey).maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at).getTime() < TTL_MS) {
    return NextResponse.json({ keywords: cached.keywords ?? [], trend: cached.trend ?? null, asOf: cached.as_of ?? asOf, cached: true });
  }

  // 2) 갱신 — 주목 키워드 (키워드 발굴과 동일 B구조: AI 재구성→정보형 필터→재검증)
  let keywords: SpotKeyword[] = [];
  try {
    if (hasNaverAdEnv()) {
      const r = await discoverGolden(topic, SPOTLIGHT_N);
      if (r.usage) void logUsage({ userId: user.id, model: "claude-haiku-4-5", kind: "lab_insights", inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens });
      keywords = r.keywords.map((k) => {
        // 점검: 대형 검색량인데 '낮음'이면 raw 로깅(데이터 신뢰성 확인용)
        if (k.monthlyMobileQcCnt > 10000 && k.compIdx === "낮음") {
          console.warn(`[lab/insights] 의심 경쟁도: "${k.keyword}" mobile=${k.monthlyMobileQcCnt} compIdx=낮음 estimated=${k.estimated}`);
        }
        return { keyword: k.keyword, mobile: k.monthlyMobileQcCnt, compIdx: k.compIdx, estimated: k.estimated };
      });
    }
  } catch {
    if (cached?.keywords) keywords = cached.keywords as SpotKeyword[]; // 실패 시 직전 캐시 유지
  }

  // 3) 트렌드(데이터랩): 롱테일은 추이가 0으로 잡혀 안 보임 → 짧은 '핵심어'(2단어 머리)로 조회.
  // 주제(대분류/세부) + 주목 키워드의 머리어 중복 제거 상위 5개.
  let trend: TrendResult | null = null;
  const head = (s: string) => s.trim().split(/\s+/).slice(0, 2).join(" ");
  const trendTerms = Array.from(new Set([topic, ...keywords.map((k) => head(k.keyword))])).filter(Boolean).slice(0, 5);
  try {
    if (hasDatalabEnv() && trendTerms.length) {
      trend = await fetchTrend(trendTerms);
      console.log(`[lab/insights] datalab "${cacheKey}" terms=${JSON.stringify(trendTerms)} series=${trend.series.length} items=${trend.items.length}`);
      const rising = new Set(trend.items.filter((i) => i.rising).map((i) => i.keyword));
      keywords = keywords.map((k) => ({ ...k, rising: rising.has(head(k.keyword)) }));
    } else {
      console.log(`[lab/insights] datalab skipped — hasDatalabEnv=${hasDatalabEnv()} terms=${trendTerms.length}`);
    }
  } catch (e) {
    console.warn(`[lab/insights] datalab error: ${e instanceof Error ? e.message : String(e)}`);
    trend = (cached?.trend as TrendResult) ?? null;
  }

  // 4) 캐시 저장 (실패 무시)
  try {
    await admin.from("category_insights").upsert({
      cache_key: cacheKey, category, sub, keywords, trend, as_of: asOf, updated_at: new Date().toISOString(),
    }, { onConflict: "cache_key" });
  } catch { /* 무시 */ }

  return NextResponse.json({ keywords, trend, asOf, cached: false });
}
