import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

/** 연결된 워드프레스의 기존 태그 목록(많이 쓰인 순)을 돌려준다 — 재사용 유도(SEO). */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ tags: [] });

  try {
    const base = conn.site_url.replace(/\/+$/, "");
    const token = Buffer.from(`${conn.username}:${conn.app_password}`).toString("base64");
    // 많이 쓰인 태그 우선 → 재사용 가치가 높은 것부터 추천
    const res = await fetch(`${base}/wp-json/wp/v2/tags?per_page=30&orderby=count&order=desc`, {
      headers: { Authorization: `Basic ${token}` },
    });
    if (!res.ok) return NextResponse.json({ tags: [] });
    const list = (await res.json()) as { name: string; count: number }[];
    const tags = list.map((t) => t.name).filter(Boolean);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
