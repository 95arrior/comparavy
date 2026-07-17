import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { activeSeasons, seasonInstanceKey } from "@/lib/revisionCalendar";

// ★갱신 대상 선정 크론(2026-07-17 전략 회의) — 경제 에버그린은 개정 시즌마다 낡는다(자산→부채 전환 방지).
//  현재 열린 개정 시즌에 걸린 '오래된 발행 글'을 renewal_queue에 등재만 한다.
//  재발행은 유저 검토 후 — 순위가 살아 있는 라이브 글을 자동으로 덮어쓰지 않는다(되돌리기 어려운 행동).
export const maxDuration = 120;

const STALE_DAYS = 45; // 발행 후 45일 지난 글부터(그보다 최신 글은 이미 최신 기준일 가능성이 높다)

function authorized(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  return req.headers.get("authorization") === `Bearer ${s}` || req.headers.get("x-cron-secret") === s;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!FF.revisionScan) return NextResponse.json({ ok: true, skipped: "FF_REVISION_SCAN off" });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });

  const kstMonth = new Date(Date.now() + 9 * 3600_000).getUTCMonth() + 1;
  const seasons = activeSeasons(kstMonth);
  if (!seasons.length) return NextResponse.json({ ok: true, month: kstMonth, seasons: 0 });

  const db = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString();
  const { data: arts } = await db.from("articles")
    .select("id, user_id, keyword, title, naver_url, wp_post_id, status, created_at")
    .lt("created_at", cutoff).not("keyword", "is", null)
    .order("created_at", { ascending: false }).limit(1000);

  const rows: Record<string, unknown>[] = [];
  for (const a of arts ?? []) {
    const naverUrl = (a as { naver_url?: string | null }).naver_url;
    const wpPostId = (a as { wp_post_id?: number | null }).wp_post_id;
    const published = Boolean(naverUrl) || (Boolean(wpPostId) && a.status === "published");
    if (!published) continue;
    const text = `${a.keyword ?? ""} ${a.title ?? ""}`;
    const season = seasons.find((s) => s.topicRe.test(text));
    if (!season) continue;
    rows.push({
      article_id: a.id, user_id: a.user_id, keyword: a.keyword, title: a.title ?? null,
      channel: naverUrl ? "naver" : "wp",
      season_key: seasonInstanceKey(season, new Date()), season_label: season.label,
    });
  }

  let queued = 0;
  if (rows.length) {
    // 같은 글·같은 시즌 인스턴스는 재등재하지 않는다(ignoreDuplicates — 유저가 done/dismissed 처리한 상태 존중)
    const { error } = await db.from("renewal_queue").upsert(rows, { onConflict: "article_id,season_key", ignoreDuplicates: true });
    if (!error) queued = rows.length;
    else console.error("[revision-scan] 등재 실패:", error.message);
  }
  return NextResponse.json({ ok: true, month: kstMonth, seasons: seasons.map((s) => s.key), scanned: arts?.length ?? 0, queued });
}
