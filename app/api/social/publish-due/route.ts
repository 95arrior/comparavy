import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { publishSocialPost } from "@/lib/socialPublish";

export const maxDuration = 300;

// Vercel Cron(GET + Authorization: Bearer CRON_SECRET) 또는 수동(SOCIAL_CRON_SECRET) 허용
function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  const cron = process.env.CRON_SECRET;
  const social = process.env.SOCIAL_CRON_SECRET;
  return Boolean((cron && auth === `Bearer ${cron}`) || (social && auth === `Bearer ${social}`));
}

async function run() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "서버 설정" }, { status: 500 });
  }
  const admin = createSupabaseAdminClient();
  const { data: settings } = await admin.from("social_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings?.auto_enabled) return NextResponse.json({ ok: true, skipped: "disabled" });

  // 주기 도달 확인 (self-throttle) — cron은 자주 돌아도 interval 안 됐으면 건너뜀
  const intervalMs = (settings.interval_hours ?? 24) * 3600000;
  if (settings.last_published_at && Date.now() - new Date(settings.last_published_at).getTime() < intervalMs) {
    return NextResponse.json({ ok: true, skipped: "not_due" });
  }

  // 가장 오래된 대기 글 1건
  const { data: post } = await admin
    .from("social_posts")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!post) return NextResponse.json({ ok: true, skipped: "empty_queue" });

  const r = await publishSocialPost(post);
  if (r.ok) {
    await admin.from("social_posts").update({ status: "published", ig_media_id: r.mediaId, published_at: new Date().toISOString(), error: null }).eq("id", post.id);
    await admin.from("social_settings").update({ last_published_at: new Date().toISOString() }).eq("id", 1);
    return NextResponse.json({ ok: true, published: post.id });
  }
  await admin.from("social_posts").update({ status: "failed", error: r.error }).eq("id", post.id);
  return NextResponse.json({ ok: false, error: r.error });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
