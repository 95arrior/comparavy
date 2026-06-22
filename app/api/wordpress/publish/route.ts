import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
import { publishPost, insertInternalLinks, WpAuthError } from "@/lib/wordpress";
import { decryptSecret } from "@/lib/crypto";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 플랜 게이트: 워드프레스 자동발행은 프로 전용 (무료는 생성·복사만)
  const planRow = await ensureUserRow(supabase, user.id);
  if (!PLANS[planRow.plan].wordpress) {
    return NextResponse.json(
      { error: "워드프레스 자동발행은 프로 플랜 기능이에요. 프로로 업그레이드하면 원클릭으로 발행할 수 있어요.", upgrade: true },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const articleId = body.articleId as string | undefined;
  const status = (body.status as "draft" | "publish" | "future") ?? "publish";
  const date = body.date as string | undefined;
  const categoryName = typeof body.category === "string" ? body.category.trim() : "";
  const tagsOverride = Array.isArray(body.tags) ? (body.tags as string[]) : null;
  const addToc = body.addToc !== false; // 기본 켜짐
  const addInternalLinks = body.addInternalLinks !== false; // 기본 켜짐

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
    return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });
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

  // 블로그/브랜드 이름 (구조화데이터 author·publisher)
  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("blog_name, biz_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const siteName = (profile?.blog_name || profile?.biz_name || "").trim() || undefined;

  // 내부 링크 자동: 내가 이미 발행한 다른 글들의 키워드를 본문에서 찾아 그 글로 링크
  let contentHtml = article.body_html as string;
  if (addInternalLinks) {
    const { data: others } = await supabase
      .from("articles")
      .select("id, keyword, title, wp_link")
      .eq("user_id", user.id)
      .eq("status", "published")
      .not("wp_link", "is", null)
      .neq("id", articleId)
      .limit(50);
    const pub = (others ?? []).filter((o) => o.wp_link && o.keyword);
    // ① 인라인 내부링크 — 본문에서 다른 글 키워드를 찾아 링크
    const candidates = pub
      .map((o) => ({ phrase: String(o.keyword), url: String(o.wp_link) }))
      .sort((a, b) => b.phrase.length - a.phrase.length);
    if (candidates.length) contentHtml = insertInternalLinks(contentHtml, candidates);
    // ② '함께 보면 좋은 글' 섹션 — 관련 깊은 발행글 top3(키워드 토큰 겹침) → 토픽 클러스터 강화
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const curTokens = new Set(String(article.keyword ?? "").split(/\s+/).filter((t) => t.length >= 2));
    const related = pub
      .map((o) => ({ o, overlap: String(o.keyword).split(/\s+/).filter((t) => t.length >= 2 && curTokens.has(t)).length }))
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .map((x) => x.o);
    if (related.length) {
      const items = related.map((o) => `<li><a href="${o.wp_link}">${esc(String(o.title ?? o.keyword))}</a></li>`).join("");
      contentHtml += `\n<h2>함께 보면 좋은 글</h2>\n<ul>${items}</ul>`;
    }
  }

  try {
    const result = await publishPost({
      siteUrl: conn.site_url,
      username: conn.username,
      appPassword: decryptSecret(conn.app_password),
      title: article.title,
      contentHtml,
      metaDescription: article.meta_description ?? undefined,
      metaTitle: article.meta_title ?? undefined,
      siteName,
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
      addToc,
      status,
      date,
    });

    // 콘텐츠 캘린더용 발행/예약 일시 — 예약은 그 시각, 즉시 발행은 지금, 초안은 비움
    const publishAt =
      status === "future" ? date ?? null : status === "publish" ? new Date().toISOString() : null;
    await supabase
      .from("articles")
      .update({
        status: status === "publish" ? "published" : status,
        wp_post_id: result.id,
        wp_link: result.link,
        publish_at: publishAt,
      })
      .eq("id", articleId);

    return NextResponse.json({ ok: true, link: result.link, postId: result.id });
  } catch (err) {
    // 인증 만료 → 재연결 안내로 분기
    if (err instanceof WpAuthError) {
      return NextResponse.json(
        { error: "워드프레스 연결이 만료됐어요. 워드프레스 탭에서 다시 연결해 주세요.", reconnect: true },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "발행 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
