import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

// 키워드 발굴 '마지막 검색 결과' 영속화 (새로고침/재접속에도 유지).
// 추천 라우트(discover)는 그대로 두고, 클라이언트가 완료 결과를 여기에 저장한다.

const MAX_RESULTS = 60;

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data } = await supabase
    .from("keyword_searches")
    .select("topic, results")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({ search: data ?? null });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const topic = (typeof body.topic === "string" ? body.topic : "").trim().slice(0, 60);
  const results = Array.isArray(body.results) ? body.results.slice(0, MAX_RESULTS) : [];
  if (!topic) return NextResponse.json({ error: "topic이 필요해요." }, { status: 400 });

  const { error } = await supabase
    .from("keyword_searches")
    .upsert({ user_id: user.id, topic, results, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
