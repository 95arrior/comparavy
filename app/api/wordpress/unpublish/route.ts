import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { decryptSecret } from "@/lib/crypto";

/**
 * 글 내리기(발행 취소). 워드프레스 글을 비공개(draft)로 바꾸고, 우리 상태도 '초안'으로.
 * 글 자체는 지우지 않아서 언제든 다시 발행할 수 있다. (프로 전용)
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "글 내리기는 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const articleId = typeof body.articleId === "string" ? body.articleId : "";
  if (!articleId) return NextResponse.json({ error: "내릴 글을 선택해 주세요." }, { status: 400 });

  const { data: article } = await supabase
    .from("articles")
    .select("wp_post_id")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // 워드프레스에 올라가 있으면 그 글을 비공개(draft)로 전환
  if (article.wp_post_id && conn) {
    try {
      const base = conn.site_url.replace(/\/+$/, "");
      const auth = "Basic " + Buffer.from(`${conn.username}:${decryptSecret(conn.app_password)}`).toString("base64");
      const res = await fetch(`${base}/wp-json/wp/v2/posts/${article.wp_post_id}`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok && res.status !== 404) {
        return NextResponse.json({ error: "워드프레스에서 내리지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
      }
    } catch {
      return NextResponse.json({ error: "워드프레스에서 내리지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }
  }

  await supabase.from("articles").update({ status: "draft" }).eq("id", articleId).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
