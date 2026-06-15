import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

/**
 * 큐 항목 상태 변경. 첫 글 생성 완료 시 클라이언트가 호출 → status='done' + article_id 링크.
 * (생성 엔진은 안 건드리므로 연결은 여기서)
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.status === "string" && ["queued", "generating", "done", "failed"].includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.article_id === "string") patch.article_id = body.article_id;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "변경할 내용이 없어요." }, { status: 400 });

  const { data, error } = await supabase
    .from("keyword_queue")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, keyword, status, scheduled_for, article_id, position")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
