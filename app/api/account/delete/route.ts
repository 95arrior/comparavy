import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

/**
 * 회원 탈퇴 — 사용자의 모든 데이터(글·워드프레스 연결·계정 행)와 인증 계정을 영구 삭제.
 * users 행이 사라지면 정기청구 cron이 대상에서 빠지므로 추가 청구도 발생하지 않음.
 */
export async function POST() {
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

  const admin = createSupabaseAdminClient();
  const uid = user.id;

  // 데이터 삭제 (각 테이블 개별 — 일부가 없어도 진행)
  await admin.from("articles").delete().eq("user_id", uid);
  await admin.from("wordpress_connections").delete().eq("user_id", uid);
  await admin.from("users").delete().eq("id", uid);

  // 인증 계정 삭제
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }

  // 현재 세션 정리
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
