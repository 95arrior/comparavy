import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { verifyConnection } from "@/lib/wordpress";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const siteUrl = (body.siteUrl ?? "").trim();
  const username = (body.username ?? "").trim();
  const appPassword = (body.appPassword ?? "").trim();

  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: "사이트 주소, 사용자명, 앱 비밀번호를 모두 입력해 주세요." }, { status: 400 });
  }

  const check = await verifyConnection({ siteUrl, username, appPassword });
  if (!check.ok) {
    return NextResponse.json({ error: check.error ?? "연결에 실패했습니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("wordpress_connections")
    .upsert(
      { user_id: user.id, site_url: siteUrl, username, app_password: appPassword },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "연결 정보를 저장하지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, siteUrl });
}

export async function DELETE() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  await supabase.from("wordpress_connections").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
