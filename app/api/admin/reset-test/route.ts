import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";

// 관리자 전용 셀프 테스트 리셋 — '호출한 본인' 계정의 글·온보딩만 초기화(크레딧·원장 보존).
// 사용: 해당 계정으로 로그인한 브라우저에서 /api/admin/reset-test 접속.
export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "관리자만 쓸 수 있어요." }, { status: 403 });
  }
  const db = createSupabaseAdminClient();
  const { count: articles } = await db.from("articles").delete({ count: "exact" }).eq("user_id", user.id);
  const { count: profiles } = await db.from("blog_profiles").delete({ count: "exact" }).eq("user_id", user.id);
  const { data: row } = await db.from("users").select("credits").eq("id", user.id).single();
  return NextResponse.json({
    ok: true,
    email: user.email,
    deleted: { articles: articles ?? 0, blog_profiles: profiles ?? 0 },
    credits_preserved: row?.credits ?? 0,
    note: "브라우저 캐시 글감은 홈에서 새로 뽑힘(캐시 버전업됨). 온보딩이 다시 시작돼요.",
  });
}
