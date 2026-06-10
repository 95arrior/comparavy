import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { publishSocialPost } from "@/lib/socialPublish";
import { slotHours, minGapHours } from "@/lib/socialSchedule";

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

  // 하루 발행 수만큼 시작 시각 ~ 저녁 상한 안에서 고르게 분산 (새벽 발행 방지)
  const perDay = Math.max(1, Math.min(5, settings.posts_per_day ?? 2));
  const startHour = settings.posting_hour ?? 9;
  const kstHour = new Date(Date.now() + 9 * 3600000).getUTCHours();
  const slots = slotHours(startHour, perDay);
  if (!slots.includes(kstHour)) return NextResponse.json({ ok: true, skipped: "not_slot" });

  // 같은 슬롯에서 중복 발행 방지 (cron이 시간당 1회 돌지만 안전장치)
  const gap = minGapHours(startHour, perDay);
  if (settings.last_published_at && Date.now() - new Date(settings.last_published_at).getTime() < (gap - 1) * 3600000) {
    return NextResponse.json({ ok: true, skipped: "recently" });
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
  // 실패: 3회까지 다음 슬롯에 자동 재시도(queued 유지), 그 이상이면 failed 확정
  const attempts = (post.attempts ?? 0) + 1;
  const giveUp = attempts >= 3;
  await admin.from("social_posts").update({ status: giveUp ? "failed" : "queued", attempts, error: r.error }).eq("id", post.id);
  return NextResponse.json({ ok: false, retry: !giveUp, attempts, error: r.error });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return run();
}
