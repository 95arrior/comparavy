// ★WP 대표 이미지 자동 생성(2026-07-12 유저: 테마 카드·구글 썸네일에 대표 이미지 필요) — AI 비용 0.
//  네이버 썸네일 렌더러(색면 포스터·press 조판)를 재사용하되, 구글용이라 자극 문구 대신 '키워드 제목 카드'.
//  실패 = null(대표 이미지 없이 발행 — 발행을 막지 않는다).
import { renderThumbnail } from "./thumbnailRenderer";
import { visualIdentityFor } from "./visualIdentity";
import { breakThumbCopy } from "./thumbCopyBreak";

export async function autoFeaturedImage(userId: string, keyword: string, siteName: string, articleId?: string | null): Promise<string | null> {
  try {
    const copy = breakThumbCopy(String(keyword || "").trim().slice(0, 20));
    if (!copy.trim()) return null;
    const png = await renderThumbnail({
      mainCopy: copy,
      identity: visualIdentityFor(userId),
      press: { brandName: (siteName || "").trim() || "BLOG" },
      articleId: articleId ?? keyword,
    });
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    console.error("[wp] 대표 이미지 자동 생성 실패(발행은 계속):", e instanceof Error ? e.message : e);
    return null;
  }
}
