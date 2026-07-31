import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { activeSeasons, seasonInstanceKey } from "@/lib/revisionCalendar";
import { lacksConditionBranch } from "@/lib/editorial";

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
  const db = createSupabaseAdminClient();
  // ★제로클릭 회수는 개정 시즌과 무관하게 매번 돈다(시즌이 없는 달에도 인용은 계속 쌓인다).
  const zeroClick = await scanZeroClick(db);
  if (!seasons.length) return NextResponse.json({ ok: true, month: kstMonth, seasons: 0, zeroClick });

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
  return NextResponse.json({ ok: true, month: kstMonth, seasons: seasons.map((s) => s.key), scanned: arts?.length ?? 0, queued, zeroClick });
}

/**
 * ★AI 브리핑 제로클릭 회수(2026-08-01) — 되먹임이 비어 있던 자리.
 *  rank_snapshots에 area='ai_brief' 인용 실측을 계속 쌓고 있었는데 **아무도 읽지 않았다**(perfWeights는 blog_tab만 본다).
 *  실측 배경: 돼지통 누적 인용 3.6천인데 편당 조회 150 — 인용은 따냈고 클릭만 안 남는 전형적 제로클릭.
 *  진짜 회수 대상은 '이미 인용되고 있는데 조건 분기가 없는 글'이다. 브리핑이 답을 종결시키고 있다는 뜻이라,
 *  조건 분기표·계산 예시를 넣어 다시 쓰면 같은 인용에서 클릭이 남는다 — 새로 버는 게 아니라 있는 걸 회수한다.
 *  ★등재만 한다. 재발행은 유저 검토 후(이 파일 상단 원칙과 동일 — 라이브 글 자동 덮어쓰기 금지).
 */
async function scanZeroClick(db: ReturnType<typeof createSupabaseAdminClient>): Promise<number> {
  try {
    const { data: snaps } = await db.from("rank_snapshots")
      .select("article_id").eq("area", "ai_brief").eq("rank", 1).limit(2000);
    const ids = [...new Set((snaps ?? []).map((s) => String(s.article_id)))];
    if (!ids.length) return 0;

    const { data: arts } = await db.from("articles")
      .select("id, user_id, keyword, title, body_html, naver_url, wp_post_id, status")
      .in("id", ids).limit(2000);

    const monthKey = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);
    const rows: Record<string, unknown>[] = [];
    for (const a of arts ?? []) {
      const naverUrl = (a as { naver_url?: string | null }).naver_url;
      const wpPostId = (a as { wp_post_id?: number | null }).wp_post_id;
      if (!(naverUrl || (wpPostId && a.status === "published"))) continue;
      const html = String((a as { body_html?: string | null }).body_html ?? "");
      if (!html || !lacksConditionBranch(html)) continue; // 이미 분기가 있으면 회수할 게 없다
      rows.push({
        article_id: a.id, user_id: a.user_id, keyword: a.keyword ?? "", title: a.title ?? null,
        channel: naverUrl ? "naver" : "wp",
        season_key: `zeroclick:${monthKey}`, // 달마다 새 인스턴스 — 안 고치면 다음 달에 다시 올라온다
        season_label: "AI 브리핑 제로클릭 회수",
      });
    }
    if (!rows.length) return 0;
    const { error } = await db.from("renewal_queue").upsert(rows, { onConflict: "article_id,season_key", ignoreDuplicates: true });
    if (error) { console.error("[revision-scan] 제로클릭 등재 실패:", error.message); return 0; }
    return rows.length;
  } catch (e) {
    console.error("[revision-scan] 제로클릭 스캔 실패(파이프 무영향):", e instanceof Error ? e.message : e);
    return 0;
  }
}
