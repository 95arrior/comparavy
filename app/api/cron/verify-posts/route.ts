import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { fetchBlogRss, matchInRss, checkPostDeleted } from "@/lib/naverRss";
import { logUsage } from "@/lib/usageLog";

// ★검증 크론(10분) — pending_verify 재시도(최대 6회, 소진 시 UI가 URL 폴백 안내).
//  유저당 RSS 1회/배치(조회 예의). 새벽 배치 1회는 삭제 스캔(URL 조회 기반 — RSS 부재로 판정 금지).
//  일일 조회량(1만 명): RSS = 발행 유저 × ≤6회 ≤ 6만 GET/일(144배치 분산, 배치당 ≤420) · 삭제 스캔 = 최근 verified 200글/일.
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET; if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const db = createSupabaseAdminClient();

  // ── 재시도: pending_verify & attempts<6 ──
  const { data: pend } = await db.from("articles").select("id, user_id, title, claimed_at, verify_attempts")
    .eq("status", "pending_verify").lt("verify_attempts", 6).order("claimed_at", { ascending: true }).limit(300);
  const byUser = new Map<string, typeof pend>();
  for (const a of pend ?? []) { const arr = byUser.get(a.user_id) ?? []; arr.push(a); byUser.set(a.user_id, arr); }
  let verified = 0, missed = 0;
  for (const [userId, arts] of byUser) {
    const { data: prof } = await db.from("blog_profiles").select("naver_blog_id").eq("user_id", userId).maybeSingle();
    if (!prof?.naver_blog_id) { for (const a of arts!) await db.from("articles").update({ verify_attempts: (a.verify_attempts ?? 0) + 1 }).eq("id", a.id); continue; }
    const items = await fetchBlogRss(prof.naver_blog_id).catch(() => []); // 유저당 1회
    for (const a of arts!) {
      const hit = matchInRss(a.title, items, a.claimed_at ? new Date(a.claimed_at).getTime() : Date.now());
      if (hit) { verified += 1; await db.from("articles").update({ status: "verified", naver_url: hit.link, verified_at: new Date().toISOString() }).eq("id", a.id); }
      else { missed += 1; await db.from("articles").update({ verify_attempts: (a.verify_attempts ?? 0) + 1 }).eq("id", a.id); }
    }
  }
  if (verified + missed > 0) void logUsage({ model: "rss", kind: "verify_cron", inputTokens: verified, outputTokens: missed });

  // ── 삭제 스캔(일 1회, KST 04:0x 배치만) — URL 조회 기반. 불확실(unknown)=유지(보수). ──
  let deleted = 0, scanned = 0;
  const kstHour = new Date(Date.now() + 9 * 3600_000).getUTCHours();
  const kstMin = new Date(Date.now() + 9 * 3600_000).getUTCMinutes();
  if (kstHour === 4 && kstMin < 10) {
    const { data: vers } = await db.from("articles").select("id, naver_url").eq("status", "verified").not("naver_url", "is", null)
      .order("verified_at", { ascending: false }).limit(200);
    for (const v of vers ?? []) {
      scanned += 1;
      const verdict = await checkPostDeleted(v.naver_url as string);
      if (verdict === "deleted") { deleted += 1; await db.from("articles").update({ status: "deleted" }).eq("id", v.id); }
      await new Promise((r) => setTimeout(r, 250)); // 예의 간격
    }
    if (scanned > 0) void logUsage({ model: "rss", kind: "delete_scan", inputTokens: scanned, outputTokens: deleted });
  }
  return NextResponse.json({ ok: true, verified, missed, deleteScan: { scanned, deleted } });
}
