import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

// 가벼운 housekeeping. 스케줄러(cron)가 호출.
// 인증: Vercel Cron은 GET + `Authorization: Bearer <CRON_SECRET>`. 수동 호출은 x-cron-secret 헤더도 허용.
// ※ 글(articles)은 절대 삭제하지 않는다 — 사용자의 콘텐츠(초안 포함)는 영구 보관.
//    오래된 rate_limits 카운터 행만 정리한다(어차피 윈도우 만료되면 리셋되는 값).
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const xcron = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || xcron === secret;
}

const SOCIAL_BUCKET = "social-cards";

// 발행 완료된 오래된 카드뉴스 이미지·행 정리 (스토리지 누적 방지). 글(articles)과 무관.
async function cleanupSocial(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<number> {
  try {
    const old = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,media_urls")
      .eq("status", "published")
      .lt("published_at", old)
      .limit(200);
    if (!rows?.length) return 0;

    // public URL → 버킷 내 경로 추출 후 이미지 삭제
    const paths: string[] = [];
    for (const r of rows as { id: string; media_urls: unknown }[]) {
      const urls = Array.isArray(r.media_urls) ? (r.media_urls as string[]) : [];
      for (const u of urls) {
        const i = u.indexOf(`/${SOCIAL_BUCKET}/`);
        if (i !== -1) paths.push(u.slice(i + SOCIAL_BUCKET.length + 2));
      }
    }
    if (paths.length) await supabase.storage.from(SOCIAL_BUCKET).remove(paths);
    const ids = (rows as { id: string }[]).map((r) => r.id);
    await supabase.from("social_posts").delete().in("id", ids);
    return ids.length;
  } catch {
    return 0;
  }
}

async function runCleanup() {
  const supabase = createSupabaseAdminClient();
  // 7일 이상 지난 rate_limit 행 정리 (다음 요청 시 어차피 새 윈도우로 리셋되므로 안전)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("rate_limits")
    .delete({ count: "exact" })
    .lt("window_start", cutoff);

  const social = await cleanupSocial(supabase);

  if (error) {
    // rate_limits 정리 실패해도 무해 — 그냥 ok
    return NextResponse.json({ ok: true, cleaned: 0, social });
  }
  return NextResponse.json({ ok: true, cleaned: count ?? 0, social });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}
