import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

/** 연결된 워드프레스의 기존 카테고리 목록을 돌려준다 (발행 시 선택용). */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ categories: [] });

  try {
    const base = conn.site_url.replace(/\/+$/, "");
    const token = Buffer.from(`${conn.username}:${conn.app_password}`).toString("base64");
    const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&orderby=count&order=desc`, {
      headers: { Authorization: `Basic ${token}` },
    });
    if (!res.ok) return NextResponse.json({ categories: [] });
    const list = (await res.json()) as { id: number; name: string; count: number }[];
    // '미분류'(Uncategorized)는 선택지에서 숨김
    const categories = list
      .filter((c) => !/^(uncategorized|미분류)$/i.test((c.name || "").trim()))
      .map((c) => ({ id: c.id, name: c.name }));
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
