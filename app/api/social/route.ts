import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { publishSocialPost, crosspostThreads } from "@/lib/socialPublish";
import { verifyIg, refreshIgToken } from "@/lib/instagram";
import { encryptSecret } from "@/lib/crypto";

export const maxDuration = 300;

/** 관리자 전용 — SNS 대기열 관리: add | settings | publishNow | delete | connectIg */
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
    if (typeof body.postsPerDay === "number" && body.postsPerDay >= 1 && body.postsPerDay <= 5) patch.posts_per_day = Math.round(body.postsPerDay);
    if (typeof body.postingHour === "number" && body.postingHour >= 0 && body.postingHour <= 23) patch.posting_hour = Math.round(body.postingHour);
    if (typeof body.threadsEnabled === "boolean") patch.threads_enabled = body.threadsEnabled;
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
      await crosspostThreads(post); // 스레드 교차발행(켜져 있으면)
      return NextResponse.json({ ok: true });
    }
    await admin.from("social_posts").update({ status: "failed", error: r.error }).eq("id", post.id);
    return NextResponse.json({ error: r.error }, { status: 502 });
  }

  // 인스타 토큰 재연결 — Meta에서 발급받은 장기 토큰을 붙여넣어 검증 후 DB에 암호화 저장한다.
  // (앱 내 OAuth 플로우가 없어, 만료/차단 시 재배포 없이 여기서 토큰만 교체해 복구한다.)
  if (action === "connectIg") {
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ error: "토큰을 입력해 주세요." }, { status: 400 });
    // 계정 ID는 입력값 우선, 없으면 환경변수(IG_USER_ID). 둘 다 없으면 검증 불가.
    const igUserId = (typeof body.igUserId === "string" && body.igUserId.trim()) || process.env.IG_USER_ID || "";
    if (!igUserId) return NextResponse.json({ error: "인스타 계정 ID(IG_USER_ID)가 없어요. 계정 ID를 함께 입력하거나 환경변수를 설정해 주세요." }, { status: 400 });

    // 토큰이 실제로 동작하는지 먼저 확인(계정명 조회).
    const v = await verifyIg({ igUserId, token });
    if (!v.ok) return NextResponse.json({ error: `토큰 검증 실패: ${v.error}` }, { status: 502 });

    // 가능하면 즉시 장기 토큰으로 연장해 실제 만료시각을 확보(인스타 로그인 토큰만 지원).
    // 페이스북 로그인 토큰 등 연장이 안 되는 경우엔 그대로 저장하고 기본 60일로 둔다.
    let finalToken = token;
    let expiresInSec = 60 * 24 * 3600;
    try {
      const r = await refreshIgToken(token);
      finalToken = r.token;
      expiresInSec = r.expiresInSec;
    } catch {
      // 연장 불가 토큰 — 검증은 통과했으므로 그대로 저장.
    }

    const { error } = await admin.from("social_settings").update({
      ig_access_token: encryptSecret(finalToken),
      ig_token_expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
      ig_token_refreshed_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true, username: v.username, expiresInDays: Math.round(expiresInSec / 86400) });
  }

  return NextResponse.json({ error: "알 수 없는 동작" }, { status: 400 });
}
