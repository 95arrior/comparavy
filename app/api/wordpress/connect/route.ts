import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/userPlan";
import { PLANS } from "@/lib/plans";
import { verifyConnection } from "@/lib/wordpress";
import { encryptSecret } from "@/lib/crypto";

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  // 플랜 게이트: 워드프레스 연결은 프로 전용
  const planRow = await ensureUserRow(supabase, user.id);
  if (!PLANS[planRow.plan].wordpress) {
    return NextResponse.json(
      { error: "워드프레스 연결은 프로 플랜 기능이에요. 프로로 업그레이드해 주세요.", upgrade: true },
      { status: 403 },
    );
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
    return NextResponse.json({ error: check.error ?? "연결하지 못했어요. 다시 시도해 주세요." }, { status: 400 });
  }

  const { error } = await supabase
    .from("wordpress_connections")
    .upsert(
      (await (async () => {
        // ★듀얼 채널 — 연결을 활성 블로그(WP 채널)에 귀속. 0059 미적용이면 blog_id 없이(레거시 동작).
        const { data: ap } = await supabase.from("blog_profiles").select("id, channel").eq("user_id", user.id).eq("is_active", true).maybeSingle();
        const base: Record<string, unknown> = { user_id: user.id, site_url: siteUrl, username, app_password: encryptSecret(appPassword) };
        if (ap?.id && (ap as { channel?: string }).channel === "wordpress") base.blog_id = ap.id;
        return base;
      })()),
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "연결 정보를 저장하지 못했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, siteUrl });
}

export async function DELETE() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  await supabase.from("wordpress_connections").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
