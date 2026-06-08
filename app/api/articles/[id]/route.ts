import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { countKoreanChars } from "@/lib/humanizer";

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.body_html === "string") {
    update.body_html = body.body_html;
    update.char_count = countKoreanChars(body.body_html);
  }
  if (typeof body.meta_title === "string") update.meta_title = body.meta_title.slice(0, 60);
  if (typeof body.meta_description === "string") {
    update.meta_description = body.meta_description.slice(0, 160);
  }
  if (typeof body.featured_image === "string" || body.featured_image === null) {
    update.featured_image = body.featured_image;
  }

  const { data, error } = await supabase
    .from("articles")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ article: data });
}

export async function DELETE() {
  // 글 삭제는 지원하지 않는다.
  // (무료 한도 카운터는 monotonic이지만, 잠금 티저를 지우고 재생성하는 무한 무료생성 빈틈을 원천 차단)
  return NextResponse.json({ error: "글 삭제는 지원하지 않습니다." }, { status: 403 });
}
