import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { verifyConnection } from "@/lib/wordpress";
import { decryptSecret } from "@/lib/crypto";

/**
 * 워드프레스 연결 상태를 가볍게 점검한다.
 * - connected: 연결 정보가 저장돼 있는가
 * - valid: 자격증명이 지금도 유효한가 (앱 비밀번호 만료·삭제·사이트 다운 시 false)
 * 대시보드가 켜질 때 호출해 '연결 만료' 배너를 띄우는 데 쓴다.
 */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ connected: false, valid: false });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: conn } = await supabase
    .from("wordpress_connections")
    .select("site_url, username, app_password")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ connected: false, valid: false });

  const check = await verifyConnection({
    siteUrl: conn.site_url,
    username: conn.username,
    appPassword: decryptSecret(conn.app_password),
  });
  return NextResponse.json({ connected: true, valid: check.ok, siteUrl: conn.site_url });
}
