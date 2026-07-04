import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { decryptSecret } from "@/lib/crypto";
import { publishPage, WpAuthError, type WordPressCredentials } from "@/lib/wordpress";
import { buildAdsensePages } from "@/lib/adsensePages";

// 애드센스 신뢰 페이지 4종(소개·운영자·문의·개인정보처리방침)을 AI로 만들어 워드프레스에 '페이지'로 발행.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "먼저 워드프레스 사이트를 연결해 주세요." }, { status: 400 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("blog_name, biz_name, vertical, sub_category")
    .eq("user_id", user.id).eq("is_active", true)
    .maybeSingle();

  const siteName = (profile?.blog_name || profile?.biz_name || "내 블로그").trim();
  const field = (profile?.sub_category || profile?.vertical || "다양한 주제").trim();
  const email = user.email || "";
  if (!email) return NextResponse.json({ error: "연락 이메일을 확인할 수 없어요. 내정보에서 이메일을 확인해 주세요." }, { status: 400 });

  const creds: WordPressCredentials = {
    siteUrl: conn.site_url,
    username: conn.username,
    appPassword: decryptSecret(conn.app_password),
  };

  try {
    const pages = await buildAdsensePages({ siteName, email, domain: conn.site_url, field });
    const published: { title: string; link: string }[] = [];
    for (const p of pages) {
      const r = await publishPage(creds, { title: p.title, content: p.content, slug: p.slug });
      published.push({ title: r.title, link: r.link });
    }
    return NextResponse.json({ pages: published });
  } catch (e) {
    if (e instanceof WpAuthError) {
      return NextResponse.json({ error: "워드프레스 인증이 만료됐어요. 사이트를 다시 연결해 주세요.", reconnect: true }, { status: 401 });
    }
    return NextResponse.json({ error: "페이지를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
