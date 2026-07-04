import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

// ★멀티 블로그 — 목록(GET)·활성 전환(POST). 크레딧은 계정 지갑 공유(문서 확정).
export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const { data } = await supabase.from("blog_profiles").select("id, blog_name, sub_category, is_active, created_at").eq("user_id", user.id).order("created_at", { ascending: true });
  return NextResponse.json({ blogs: data ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.activate === "string" ? body.activate.slice(0, 60) : "";
  if (!id) return NextResponse.json({ error: "bad" }, { status: 400 });
  const { data: target } = await supabase.from("blog_profiles").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "블로그를 찾을 수 없어요." }, { status: 404 });
  // 전환 — 전체 내리고 대상만 활성(부분 유니크가 동시성 보증)
  await supabase.from("blog_profiles").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
  const { error } = await supabase.from("blog_profiles").update({ is_active: true }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "전환하지 못했어요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
