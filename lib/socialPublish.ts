import { publishImage, publishReel, publishCarousel, type IgCreds } from "./instagram";
import { createSupabaseAdminClient } from "./supabase-server";

export interface SocialPostRow {
  id: string;
  type: string;
  media_urls: unknown;
  caption: string;
}

export function igCredsFromEnv(): IgCreds | null {
  const igUserId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !token) return null;
  return { igUserId, token };
}

/**
 * 발행에 쓸 토큰 결정 — DB(social_settings.ig_access_token, cron이 자동 갱신)이 있으면 우선,
 * 없으면 환경변수(IG_ACCESS_TOKEN)로 폴백. IG_USER_ID는 항상 환경변수.
 */
export async function resolveIgCreds(): Promise<IgCreds | null> {
  const igUserId = process.env.IG_USER_ID;
  if (!igUserId) return null;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("social_settings").select("ig_access_token").eq("id", 1).maybeSingle();
    if (data?.ig_access_token) return { igUserId, token: data.ig_access_token };
  } catch {
    // 컬럼 없거나 조회 실패 시 환경변수로 폴백
  }
  const token = process.env.IG_ACCESS_TOKEN;
  return token ? { igUserId, token } : null;
}

/** 대기열 글 1건을 인스타에 발행. */
export async function publishSocialPost(post: SocialPostRow): Promise<{ ok: boolean; mediaId?: string; error?: string }> {
  const creds = await resolveIgCreds();
  if (!creds) return { ok: false, error: "IG 설정(IG_USER_ID/토큰) 미설정" };
  const urls = Array.isArray(post.media_urls) ? (post.media_urls as string[]) : [];
  if (!urls.length) return { ok: false, error: "미디어 URL 없음" };
  try {
    let mediaId: string;
    if (post.type === "reel") mediaId = await publishReel(creds, urls[0], post.caption);
    else if (post.type === "carousel") mediaId = await publishCarousel(creds, urls, post.caption);
    else mediaId = await publishImage(creds, urls[0], post.caption);
    return { ok: true, mediaId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "발행 실패" };
  }
}
