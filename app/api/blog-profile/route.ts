import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { isTone, isType, isPublishMode } from "@/lib/blogProfile";
import { isTopCategory } from "@/lib/categories";

/**
 * 블로그 프로필 — 온보딩 1회 저장(유저당 1행). 이후 모든 글이 이 설정을 따른다.
 * GET: 현재 프로필 조회(없으면 null). POST: 업서트.
 */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data } = await supabase.from("blog_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const topic = (typeof body.topic === "string" ? body.topic : "").trim().slice(0, 60);
  if (!topic) return NextResponse.json({ error: "블로그 주제를 입력해 주세요. (예: 강아지)" }, { status: 400 });

  const tone = isTone(body.tone) ? body.tone : "friendly";
  const article_type = isType(body.article_type) ? body.article_type : "info";
  const publish_mode = isPublishMode(body.publish_mode) ? body.publish_mode : "manual";
  const target = (typeof body.target === "string" ? body.target : "").trim().slice(0, 80) || null;
  // 대분류 (없으면 topic을 대분류로 가정 — 레거시 호환)
  const category = (typeof body.category === "string" && isTopCategory(body.category)) ? body.category : (isTopCategory(topic) ? topic : null);
  // 블로그 이름: 비우면 "{대분류} 블로그" 기본값
  const rawName = (typeof body.blog_name === "string" ? body.blog_name : "").trim().slice(0, 60);
  const blog_name = rawName || `${category ?? topic} 블로그`;

  const { data, error } = await supabase
    .from("blog_profiles")
    .upsert(
      { user_id: user.id, topic, category, blog_name, tone, article_type, target, publish_mode, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: `저장 실패: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
