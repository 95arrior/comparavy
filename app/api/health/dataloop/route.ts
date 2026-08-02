import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { hasGscEnv, gscQuery } from "@/lib/gsc";
import { fetchDartIPOSeeds, ipoAdviceLeak } from "@/lib/dartIPO";

// ★데이터 루프 헬스(2026-07-20) — 성과 루프 적재 상태를 '집계 숫자만' 공개(키워드·수치 등 내용 없음).
//  배경: 유저 수동 확인 없이 운영 점검("서치콘솔 들어왔어?")에 즉답하기 위한 관측용. 민감정보 0 원칙.
//  ?probe=gsc — GSC 연결 자체를 시험(행 수·에러 메시지만 반환, 비밀값·데이터 내용 없음).
//  ?probe=dart — 공모주 수확기가 프로덕션에서 실제로 도는지(2026-08-02 키 등록). 회사명은 공시 공개정보라 노출 무해.
//   ★로컬에서 되는 것과 프로덕션에서 되는 것은 다르다 — 환경변수는 배포 시점에 묶인다.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();
  const out: Record<string, unknown> = {};
  out.gscEnvSet = hasGscEnv();
  if (new URL(request.url).searchParams.get("probe") === "gsc" && hasGscEnv()) {
    const day = (o: number) => new Date(Date.now() - o * 86400_000).toISOString().slice(0, 10);
    try {
      const rows = await gscQuery(day(5), day(1));
      out.gscProbe = { ok: true, rows: rows.length };
    } catch (e) {
      out.gscProbe = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
    }
  }
  if (new URL(request.url).searchParams.get("probe") === "dart") {
    out.dartKeySet = Boolean(process.env.DART_API_KEY);
    try {
      const seeds = await fetchDartIPOSeeds();
      out.dartProbe = {
        ok: true,
        seeds: seeds.length,
        priced: seeds.filter((x) => x.priced).length,
        // ★게이트가 프로덕션에서도 도는지 함께 본다 — 여기서 leaked가 0이 아니면 즉시 봐야 한다
        leaked: seeds.filter((x) => ipoAdviceLeak(`${x.keyword} ${x.title}`)).length,
        sample: seeds.slice(0, 5).map((x) => `${x.corpName}${x.priced ? "(확정)" : ""}`),
      };
    } catch (e) {
      out.dartProbe = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
    }
  }
  try {
    const { count } = await db.from("gsc_daily").select("id", { count: "exact", head: true });
    const { data: latest } = await db.from("gsc_daily").select("date").order("date", { ascending: false }).limit(1);
    out.gsc = { rows: count ?? 0, latestDate: latest?.[0]?.date ?? null };
  } catch { out.gsc = { error: "table_missing_or_query_failed" }; }
  try {
    const { count } = await db.from("rank_snapshots").select("article_id", { count: "exact", head: true });
    out.rankSnapshots = count ?? 0;
  } catch { out.rankSnapshots = null; }
  try {
    const { count } = await db.from("renewal_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
    out.renewalPending = count ?? 0;
  } catch { out.renewalPending = null; }
  // ★티어 실측(2026-07-20 — 밴드 초과 글감 진단): 블로그별 사다리 판정을 집계로 노출(채널·티어·승수·표본만)
  try {
    const { data: profs } = await db.from("blog_profiles").select("id, user_id, channel").limit(6);
    const { computeBlogTier } = await import("@/lib/blogTier");
    const tiers: unknown[] = [];
    for (const p of profs ?? []) {
      try {
        const t = await computeBlogTier(db, String(p.user_id), String(p.id));
        if (t) tiers.push({ channel: (p as { channel?: string | null }).channel ?? "naver", tier: t.tier, wins: t.wins, sample: t.sample });
      } catch { /* skip */ }
    }
    out.tiers = tiers;
  } catch { out.tiers = null; }
  // ★밴드 미적용 진단(2026-07-20 실측: SEEDLING인데 8.8만 노출) — 캐시된 티어·FF 상태·트렌드 공급량까지 한 방에
  try {
    const { FF } = await import("@/config/featureFlags");
    out.ff = { tierBands: FF.tierBands, tierMix: FF.tierMix, homefeedBet: FF.homefeedBet };
  } catch { /* ignore */ }
  try {
    const { data: caches } = await db.from("api_cache").select("key, value, expires_at").like("key", "blog_tier:%").limit(6);
    out.tierCache = (caches ?? []).map((c) => ({ tier: (c.value as { tier?: string } | null)?.tier ?? null, wins: (c.value as { wins?: number } | null)?.wins ?? null, expiresAt: c.expires_at }));
  } catch { out.tierCache = null; }
  try {
    const now = new Date().toISOString();
    const { count: trendAll } = await db.from("trend_topics").select("id", { count: "exact", head: true });
    const { count: alive } = await db.from("trend_topics").select("id", { count: "exact", head: true }).gt("expires_at", now);
    out.trendPool = { total: trendAll ?? 0, alive: alive ?? 0 };
    // ★카테고리별 분해(2026-08-02) — '[trend-funnel] 증식 0'을 쫓다 벽에 부딪혔다.
    //  풀에는 56건이 살아 있는데 카드가 0장이었다. 로컬에서 재현하려 했으나
    //  .env.local의 Supabase 값이 비어 있어(프로덕션에서만 주입) 조회 자체가 불가능했다.
    //  ★전체 숫자만으로는 '어느 카테고리의 씨앗인가'를 알 수 없다 — 그게 증식 0의 열쇠다.
    //  actionEnd가 있는 씨앗은 공고형(직접 카드, 최대 3장)이고, 없는 것만 증식 대상이다.
    const { data: rows } = await db.from("trend_topics")
      .select("category, source, action_end").gt("expires_at", now).limit(500);
    const byCat: Record<string, { alive: number; 공고형: number; 증식대상: number; sources: Record<string, number> }> = {};
    for (const r of rows ?? []) {
      const c = String((r as { category?: string }).category ?? "(없음)");
      byCat[c] ??= { alive: 0, 공고형: 0, 증식대상: 0, sources: {} };
      byCat[c].alive += 1;
      if ((r as { action_end?: string | null }).action_end) byCat[c].공고형 += 1; else byCat[c].증식대상 += 1;
      const src = String((r as { source?: string }).source ?? "?");
      byCat[c].sources[src] = (byCat[c].sources[src] ?? 0) + 1;
    }
    out.trendByCategory = byCat;
  } catch { out.trendPool = null; }
  // ★자수 기록 판독(2026-07-20 3차): 불변식 차단 내역 + fetchPool 실제 조건·결과
  try {
    const { data: diags } = await db.from("api_cache").select("key, value, updated_at").in("key", ["diag:band_leak", "diag:fetchpool"]);
    out.diag = Object.fromEntries((diags ?? []).map((d) => [d.key, { ...(d.value as object), _updated: d.updated_at }]));
  } catch { out.diag = null; }
  // ★카드 출처 추적(2026-07-20 2차 — 봉쇄 후에도 6,950~26,180 노출): 화면 키워드의 실제 저장값(검색량·sub·vertical)
  if (new URL(request.url).searchParams.get("probe") === "kw") {
    try {
      const stems = ["중개수수료", "부동산경매사이트", "재테크", "P2P", "물건경매"];
      const found: unknown[] = [];
      for (const st of stems) {
        const { data } = await db.from("keyword_pool").select("keyword, monthly_searches, sub, vertical, competition").ilike("keyword", `%${st}%`).order("monthly_searches", { ascending: false }).limit(3);
        for (const r of data ?? []) found.push(r);
      }
      out.kwProbe = found;
      const { data: profs2 } = await db.from("blog_profiles").select("vertical, sub_category, is_active, channel").limit(6);
      out.profiles = profs2 ?? [];
    } catch { out.kwProbe = null; }
  }
  // ★신생 밴드 공급량(2026-07-20 — 밴드 내 키워드 고갈 여부 실측): 경제·재테크 풀에서 500~3,000 구간이 몇 개인가
  try {
    const { count: banded } = await db.from("keyword_pool").select("keyword", { count: "exact", head: true })
      .eq("vertical", "online").eq("sub", "경제·재테크").gte("monthly_searches", 500).lte("monthly_searches", 3000).neq("competition", "높음");
    const { count: all } = await db.from("keyword_pool").select("keyword", { count: "exact", head: true }).eq("vertical", "online").eq("sub", "경제·재테크");
    out.pool = { economyTotal: all ?? 0, seedlingBand: banded ?? 0 };
  } catch { out.pool = null; }
  return NextResponse.json(out);
}
