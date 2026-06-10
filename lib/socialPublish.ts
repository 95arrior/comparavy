import { publishImage, publishReel, publishCarousel, type IgCreds } from "./instagram";

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

/** 대기열 글 1건을 인스타에 발행. */
export async function publishSocialPost(post: SocialPostRow): Promise<{ ok: boolean; mediaId?: string; error?: string }> {
  const creds = igCredsFromEnv();
  if (!creds) return { ok: false, error: "IG 환경변수(IG_USER_ID/IG_ACCESS_TOKEN) 미설정" };
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
