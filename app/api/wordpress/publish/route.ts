import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
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

  // 플랜 게이트: 워드프레스 자동발행은 프로 전용 (무료는 생성·복사만)
  const planRow = await ensureUserRow(supabase, user.id);
  if (!PLANS[planRow.plan].wordpress) {
    return NextResponse.json(
      { error: "워드프레스 자동발행은 프로 플랜 기능입니다. 프로로 업그레이드하면 원클릭으로 발행할 수 있어요.", upgrade: true },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const articleId = body.articleId as string | undefined;
  const status = (body.status as "draft" | "publish" | "future") ?? "publish";
  const date = body.date as string | undefined;
  const categoryName = typeof body.category === "string" ? body.category.trim() : "";
  const tagsOverride = Array.isArray(body.tags) ? (body.tags as string[]) : null;

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
  // 잠금(미리보기) 글은 발행 불가 — 방어
  if (article.locked) {
    return NextResponse.json(
      { error: "미리보기 글은 발행할 수 없어요. 프로로 업그레이드하면 전체 글을 발행할 수 있어요.", upgrade: true },
      { status: 403 },
    );
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
      metaDescription: article.meta_description ?? undefined,
      faq: Array.isArray(article.faq) ? article.faq : undefined,
      slug: article.keyword
        ? article.keyword.trim().toLowerCase().replace(/\s+/g, "-")
        : undefined,
      featuredImage: article.featured_image ?? undefined,
      // 이미 발행한 글이면 그 워드프레스 글을 수정(재발행) → 중복 글 방지
      postId: article.wp_post_id ?? undefined,
      // 카테고리(미지정 시 미분류) · 태그(없으면 글에 저장된 AI 태그 사용)
      categoryName: categoryName || undefined,
      tags: tagsOverride ?? (Array.isArray(article.tags) ? article.tags : undefined),
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

    return NextResponse.json({ ok: true, link: result.link, postId: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "발행 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
