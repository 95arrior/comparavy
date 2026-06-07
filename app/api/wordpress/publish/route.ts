import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { publishPost } from "@/lib/wordpress";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const articleId = body.articleId as string | undefined;
  const status = (body.status as "draft" | "publish" | "future") ?? "publish";
  const date = body.date as string | undefined;

  if (!articleId) {
    return NextResponse.json({ error: "발행할 글을 선택해 주세요." }, { status: 400 });
  }

  // 글 조회 (소유자 확인)
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) {
    return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  // 워드프레스 연결 조회
  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) {
    return NextResponse.json({ error: "먼저 워드프레스 사이트를 연결해 주세요." }, { status: 400 });
  }

  try {
    const result = await publishPost({
      siteUrl: conn.site_url,
      username: conn.username,
      appPassword: conn.app_password,
      title: article.title,
      contentHtml: article.body_html,
      status,
      date,
    });

    await supabase
      .from("articles")
      .update({
        status: status === "publish" ? "published" : status,
        wp_post_id: result.id,
        wp_link: result.link,
      })
      .eq("id", articleId);

    return NextResponse.json({ ok: true, link: result.link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "발행 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
