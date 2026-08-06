// ★사건 밀도 계측 크론(2026-08-07) — 3시간마다 소재별 온도를 기록만 한다.
//  유저 확정: "사건 크기는 며칠 재보고 정하자." 이 기록이 그 '며칠'이다.
//  ★발행 파이프와 완전히 분리 — 여기가 죽어도 글감엔 아무 일도 없다.
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { EVENT_PROBES, measureProbe } from "@/lib/eventDensity";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();

  const rows: object[] = [];
  let failed = 0;
  for (const p of EVENT_PROBES) {
    const r = await measureProbe(p.probe, p.group);
    // ★측정 실패는 기록하지 않는다 — 실패를 0으로 적으면 분포가 '조용한 날'로 거짓말한다.
    if (!r) { failed += 1; continue; }
    rows.push({ probe: r.probe, grp: r.group, cnt_1h: r.cnt1h, cnt_6h: r.cnt6h, outlets_6h: r.outlets6h, uniq_6h: r.uniq6h, top_titles: r.topTitles });
    await new Promise((res) => setTimeout(res, 250)); // API 예의 — 초당 제한을 안 건드린다
  }
  if (rows.length) {
    const { error } = await db.from("event_density").insert(rows);
    if (error) return NextResponse.json({ ok: false, error: error.message, measured: rows.length }, { status: 500 });
  }
  console.log(`[event-density] ${rows.length}/${EVENT_PROBES.length} 기록${failed ? ` · 실패 ${failed}` : ""}`);
  return NextResponse.json({ ok: true, measured: rows.length, failed });
}
