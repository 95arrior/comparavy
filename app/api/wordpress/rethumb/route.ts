// ★썸네일만 재생성(2026-07-29 유저 요청 — 문구 다양성 v4 이전에 나간 글들이 전부 '가장 많이 ~' 한 틀).
//  재발행(publish)과 다른 점: 본문·제목·카테고리·태그를 건드리지 않는다. 대표 이미지 하나만 새로 만들어 교체한다
//  → 이미 색인된 운영 글의 내용이 바뀌지 않는다(내부링크 재계산·본문 재업로드 없음).
import { NextResponse } from "next/server";
import { autoFeaturedImage } from "@/lib/wpFeaturedImage";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { uploadMedia, setFeaturedMedia, WpAuthError } from "@/lib/wordpress";
import { decryptSecret } from "@/lib/crypto";

export const maxDuration = 300; // 이미지 생성(AI 배경)+미디어 업로드 — 발행 경로와 같은 상한

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const articleId = body.articleId as string | undefined;
  if (!articleId) return NextResponse.json({ error: "글을 선택해 주세요." }, { status: 400 });

  const { data: article } = await supabase
    .from("articles")
    .select("id, keyword, title, wp_post_id, wp_link, featured_image")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!article) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });
  if (!article.wp_post_id) return NextResponse.json({ error: "아직 워드프레스에 발행되지 않은 글이에요." }, { status: 400 });
  // 직접 고른 대표 이미지가 있으면 자동 생성이 그걸 덮어쓰지 않는다(유저 선택 우선 — 발행 경로와 같은 규칙)
  if (article.featured_image) return NextResponse.json({ error: "직접 고른 대표 이미지가 있는 글이에요. 그 이미지를 지우면 다시 만들 수 있어요." }, { status: 409 });

  const { data: conn } = await supabase.from("wordpress_connections").select("*").eq("user_id", user.id).maybeSingle();
  if (!conn) return NextResponse.json({ error: "먼저 워드프레스 사이트를 연결해 주세요." }, { status: 400 });

  const { data: profile } = await supabase.from("blog_profiles").select("blog_name, biz_name").eq("user_id", user.id).maybeSingle();
  const siteName = String(profile?.blog_name ?? profile?.biz_name ?? "");

  try {
    const dataUrl = await autoFeaturedImage(user.id, String(article.keyword ?? ""), siteName, String(article.id), { title: article.title });
    if (!dataUrl) return NextResponse.json({ error: "썸네일을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });

    const creds = { siteUrl: String(conn.site_url), username: String(conn.username), appPassword: decryptSecret(String(conn.app_password)) };
    const media = await uploadMedia(dataUrl, creds);
    if (!media) return NextResponse.json({ error: "워드프레스에 이미지를 올리지 못했어요." }, { status: 502 });

    const ok = await setFeaturedMedia(Number(article.wp_post_id), media.id, creds);
    if (!ok) return NextResponse.json({ error: "대표 이미지를 바꾸지 못했어요." }, { status: 502 });

    return NextResponse.json({ ok: true, url: media.url, link: article.wp_link });
  } catch (err) {
    if (err instanceof WpAuthError) {
      return NextResponse.json({ error: "워드프레스 연결이 만료됐어요. 워드프레스 탭에서 다시 연결해 주세요.", reconnect: true }, { status: 409 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "썸네일을 바꾸지 못했어요." }, { status: 502 });
  }
}
