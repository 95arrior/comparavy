import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkIndexed } from "@/lib/naverBlogSearch";

export const maxDuration = 30;

// ★색인 체커 — 발행 글들이 네이버 검색에 잡혔는지 일괄 확인(본인 글만).
// 응답: { results: { [articleId]: "indexed" | "pending" | "unknown" } }
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 10) : [];
  const blogId = typeof body.blogId === "string" ? body.blogId.slice(0, 40) : null;
  if (ids.length === 0) return NextResponse.json({ results: {} });

  // 본인 글만(RLS) — 제목 조회
  const { data: rows } = await supabase.from("articles").select("id, title, status").in("id", ids).eq("user_id", user.id);
  const results: Record<string, "indexed" | "pending" | "unknown"> = {};
  for (const row of rows ?? []) {
    if (row.status !== "published") { results[row.id] = "unknown"; continue; }
    const found = await checkIndexed(row.title ?? "", blogId);
    results[row.id] = found === null ? "unknown" : found ? "indexed" : "pending";
  }
  return NextResponse.json({ results });
}
