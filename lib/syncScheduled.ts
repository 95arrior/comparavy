import { createSupabaseAdminClient } from "./supabase-server";
import { decryptSecret } from "./crypto";

type ArticleRow = { id: string; status: string; wp_post_id: number | null };
type Conn = { site_url: string; username: string; app_password: string } | null | undefined;

/**
 * 예약(future) 글 중 워드프레스에서 이미 발행된 것을 우리 상태도 'published'로 동기화한다.
 * (예약 시간이 지나 WP가 자동 발행했는데 우리 DB는 future로 남아 '예약됨' 칩이 잘못 보이던 문제 해결)
 * articles 배열의 status를 즉시 갱신(mutate)하고 DB도 업데이트한다.
 */
export async function syncScheduledStatuses(articles: ArticleRow[] | null | undefined, conn: Conn): Promise<void> {
  if (!conn || !articles) return;
  const futures = articles.filter((a) => a.status === "future" && a.wp_post_id).slice(0, 15);
  if (!futures.length) return;

  const base = conn.site_url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${conn.username}:${decryptSecret(conn.app_password)}`).toString("base64");
  const admin = createSupabaseAdminClient();

  await Promise.all(
    futures.map(async (a) => {
      try {
        const r = await fetch(`${base}/wp-json/wp/v2/posts/${a.wp_post_id}?context=edit&_fields=status`, {
          headers: { Authorization: auth },
        });
        if (!r.ok) return;
        const p = await r.json();
        // WP가 이미 공개(publish)했으면 우리도 발행됨으로
        if (p?.status === "publish") {
          a.status = "published";
          await admin.from("articles").update({ status: "published" }).eq("id", a.id);
        }
      } catch {
        // 무시 (동기화 실패해도 페이지는 그대로)
      }
    }),
  );
}
