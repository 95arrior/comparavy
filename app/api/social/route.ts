import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { publishSocialPost } from "@/lib/socialPublish";

export const maxDuration = 300;

/** 관리자 전용 — SNS 대기열 관리: add | settings | publishNow | delete */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "add") {
    const type = ["image", "reel", "carousel"].includes(body.type) ? body.type : "image";
    const mediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls.filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0).map((u: string) => u.trim())
      : [];
    const caption = typeof body.caption === "string" ? body.caption.slice(0, 2200) : "";
    if (!mediaUrls.length) return NextResponse.json({ error: "미디어 URL을 입력해 주세요." }, { status: 400 });
    const { error } = await admin.from("social_posts").insert({ type, media_urls: mediaUrls, caption });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (action === "settings") {
    const patch: Record<string, unknown> = {};
    if (typeof body.autoEnabled === "boolean") patch.auto_enabled = body.autoEnabled;
    if (typeof body.intervalHours === "number" && body.intervalHours > 0) patch.interval_hours = Math.min(720, Math.round(body.intervalHours));
    if (Object.keys(patch).length) await admin.from("social_settings").update(patch).eq("id", 1);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await admin.from("social_posts").delete().eq("id", body.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "publishNow") {
    const { data: post } = await admin.from("social_posts").select("*").eq("id", body.id).maybeSingle();
    if (!post) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });
    const r = await publishSocialPost(post);
    if (r.ok) {
      await admin.from("social_posts").update({ status: "published", ig_media_id: r.mediaId, published_at: new Date().toISOString(), error: null }).eq("id", post.id);
      await admin.from("social_settings").update({ last_published_at: new Date().toISOString() }).eq("id", 1);
      return NextResponse.json({ ok: true });
    }
    await admin.from("social_posts").update({ status: "failed", error: r.error }).eq("id", post.id);
    return NextResponse.json({ error: r.error }, { status: 502 });
  }

  return NextResponse.json({ error: "알 수 없는 동작" }, { status: 400 });
}
