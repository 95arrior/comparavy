import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { computeBlogTier, coldStartTier, applyDemoteGuard, type TierResult } from "@/lib/blogTier";

// ★주간 단계 판정 크론(2026-08-01) — 밴드 사다리 설계의 마지막 빠진 조각.
//  설계는 "승급·강등 모두 주간 D+7 순위 스캔이 자동 판정(일수 기준 금지)"이었는데, 실제로는 판정이
//  /api/topics 요청 안에서 lazy로만 돌고 24h 캐시에 얹혀 있었다 — 크론도, 단계 이력도, 전이 로그도 없었다.
//  결과: 순위 추적(rank-track)은 하루 3회 도는데 그 데이터로 단계가 올라가는 일은 아무도 보장하지 않았다.
//  ★여기서 하는 일은 '판정 후 캐시 갱신'뿐이다. 밴드 적용은 여전히 /api/topics이 읽어서 한다(단일 경로 유지).
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!FF.tierBands) return NextResponse.json({ ok: true, skipped: "FF_TIER_BANDS off" });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });

  const db = createSupabaseAdminClient();
  // 판정 재료가 있는 유저·블로그 조합만 돈다(전수 스캔 금지 — 발행 이력 없는 계정까지 돌 이유가 없다).
  const { data: rows } = await db.from("post_performance").select("user_id, blog_id").limit(5000);
  const pairs = [...new Map((rows ?? []).map((r) => {
    const uid = String(r.user_id);
    const bid = (r as { blog_id?: string | null }).blog_id ?? null;
    return [`${uid}:${bid ?? ""}`, { uid, bid }] as const;
  })).values()];

  const changes: { user: string; from: string | null; to: string; wins: number; sample: number }[] = [];
  let scanned = 0;

  for (const { uid, bid } of pairs) {
    scanned += 1;
    const key = `blog_tier:${bid ?? uid}`;
    let prev: TierResult | null = null;
    try {
      const { data: c } = await db.from("api_cache").select("value").eq("key", key).maybeSingle();
      if (c?.value) prev = c.value as TierResult;
    } catch { /* 캐시 조회 실패 — 이전 단계 없음으로 취급 */ }

    let next: TierResult | null = null;
    try {
      next = await computeBlogTier(db, uid, bid);
    } catch (e) {
      console.error("[tier-scan] 판정 실패(건너뜀):", uid.slice(0, 8), e instanceof Error ? e.message : e);
      continue;
    }
    // ★판정 불가는 강등이 아니다 — 이전 단계를 유지한다(데이터 공백으로 사다리를 내리지 않는다).
    if (!next) {
      if (!prev) {
        try {
          await db.from("api_cache").upsert({ key, value: coldStartTier(), expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() });
        } catch { /* ignore */ }
      }
      continue;
    }
    // 강등 보수 가드(승급선을 TIER_DEMOTE_MARGIN 이상 밑돌 때만 한 단계) — 기존 판정 로직 그대로 쓴다.
    const guarded = applyDemoteGuard(prev?.tier ?? null, next);
    if (guarded.tier !== prev?.tier) {
      changes.push({ user: uid.slice(0, 8), from: prev?.tier ?? null, to: guarded.tier, wins: guarded.wins, sample: guarded.sample });
      console.log(`[tier-scan] 단계 변경 ${uid.slice(0, 8)}: ${prev?.tier ?? "(없음)"} → ${guarded.tier} (승 ${guarded.wins}/${guarded.sample})`);
    }
    try {
      await db.from("api_cache").upsert({ key, value: guarded, expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(), updated_at: new Date().toISOString() });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, scanned, changed: changes.length, changes: changes.slice(0, 20) });
}
