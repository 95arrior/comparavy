import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { hasGscEnv, gscQuery, gscPageSlug } from "@/lib/gsc";

// ★서치콘솔 동기화 크론(2026-07-19 유저 승인) — 최근 5일 실적(날짜×페이지×쿼리)을 gsc_daily에 upsert.
//  GSC 데이터는 2~3일 후행이라 매일 5일 창으로 덮어쓴다(후행 보정). env 없으면 조용히 스킵(fail-soft).
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

const day = (offset: number): string => new Date(Date.now() - offset * 86400_000).toISOString().slice(0, 10);

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasGscEnv()) return NextResponse.json({ ok: true, skipped: "GSC env 미설정" });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();

  let rows;
  try {
    rows = await gscQuery(day(5), day(1));
  } catch (e) {
    console.error("[gsc-sync] 조회 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "gsc_query_failed" }, { status: 502 });
  }
  if (!rows.length) return NextResponse.json({ ok: true, rows: 0 });

  // 슬러그 ↔ 글 매칭(베스트에포트) — WP 퍼머링크 슬러그 = 키워드(공백 제거)와 일치하는 경우가 대부분
  const bySlug = new Map<string, string>();
  try {
    const { data: arts } = await db.from("articles").select("id, keyword").not("wp_post_id", "is", null).limit(2000);
    for (const a of arts ?? []) {
      const k = String(a.keyword ?? "").replace(/\s+/g, "").toLowerCase();
      if (k) bySlug.set(k, String(a.id));
    }
  } catch { /* 매칭 실패 무해 */ }

  const payload = rows.map((r) => ({
    date: r.date, page: r.page, query: r.query,
    clicks: r.clicks, impressions: r.impressions, position: r.position,
    article_id: bySlug.get(gscPageSlug(r.page)) ?? null,
  }));
  const { error } = await db.from("gsc_daily").upsert(payload, { onConflict: "date,page,query" });
  if (error) {
    console.error("[gsc-sync] 적재 실패:", error.message);
    return NextResponse.json({ ok: false, error: "upsert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows: payload.length, matched: payload.filter((p) => p.article_id).length });
}
