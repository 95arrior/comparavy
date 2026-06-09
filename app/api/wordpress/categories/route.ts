import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { findOrCreateTerm } from "@/lib/wordpress";

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
      .map((c) => ({ id: c.id, name: c.name, count: c.count ?? 0 }));
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

/** 카테고리를 워드프레스에 '지금' 생성한다(또는 같은 이름이 있으면 그걸 반환). 미리 분류를 만들어 두기 위함. (프로 전용) */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "카테고리 생성은 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "카테고리 이름을 입력해 주세요." }, { status: 400 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "먼저 워드프레스를 연결해 주세요." }, { status: 400 });

  const base = conn.site_url.replace(/\/+$/, "");
  const id = await findOrCreateTerm(
    base,
    { siteUrl: conn.site_url, username: conn.username, appPassword: conn.app_password },
    "categories",
    name,
  );
  if (!id) return NextResponse.json({ error: "카테고리를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  return NextResponse.json({ id, name });
}

/**
 * 카테고리를 삭제한다. (프로 전용)
 * reassignToId가 있으면 그 카테고리에 속한 글들을 먼저 그 카테고리로 옮긴 뒤 삭제 → '미분류' 추락·SEO 손해 방지.
 * 없으면 워드프레스 기본대로(해당 글은 미분류로 이동) 삭제.
 */
export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const planRow = await ensureUserRow(supabase, user.id);
  if (planRow.plan !== "pro") {
    return NextResponse.json({ error: "카테고리 삭제는 프로 플랜 기능이에요.", upgrade: true }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const reassignToId = body.reassignToId ? Number(body.reassignToId) : null;
  if (!id) return NextResponse.json({ error: "삭제할 카테고리가 올바르지 않습니다." }, { status: 400 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "먼저 워드프레스를 연결해 주세요." }, { status: 400 });

  const base = conn.site_url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${conn.username}:${conn.app_password}`).toString("base64");

  try {
    // 옮길 카테고리가 지정되면, 그 카테고리에 속한 글들을 먼저 이동시킨다(다른 카테고리는 보존).
    if (reassignToId) {
      for (let page = 1; page <= 20; page++) {
        const pr = await fetch(
          `${base}/wp-json/wp/v2/posts?categories=${id}&per_page=100&page=${page}&_fields=id,categories`,
          { headers: { Authorization: auth } },
        );
        if (!pr.ok) break;
        const posts = (await pr.json()) as { id: number; categories: number[] }[];
        if (!posts.length) break;
        for (const p of posts) {
          const next = Array.from(new Set((p.categories || []).map((c) => (c === id ? reassignToId : c))));
          await fetch(`${base}/wp-json/wp/v2/posts/${p.id}`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ categories: next }),
          });
        }
        if (posts.length < 100) break;
      }
    }

    const dr = await fetch(`${base}/wp-json/wp/v2/categories/${id}?force=true`, {
      method: "DELETE",
      headers: { Authorization: auth },
    });
    if (!dr.ok) {
      return NextResponse.json({ error: "카테고리를 삭제하지 못했어요." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "카테고리 삭제 중 오류가 났어요." }, { status: 502 });
  }
}
