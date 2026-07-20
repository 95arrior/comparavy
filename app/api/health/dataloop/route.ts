import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { hasGscEnv, gscQuery } from "@/lib/gsc";

// ★데이터 루프 헬스(2026-07-20) — 성과 루프 적재 상태를 '집계 숫자만' 공개(키워드·수치 등 내용 없음).
//  배경: 유저 수동 확인 없이 운영 점검("서치콘솔 들어왔어?")에 즉답하기 위한 관측용. 민감정보 0 원칙.
//  ?probe=gsc — GSC 연결 자체를 시험(행 수·에러 메시지만 반환, 비밀값·데이터 내용 없음).
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
  return NextResponse.json(out);
}
