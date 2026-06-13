import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { emailHash } from "@/lib/userPlan";

/**
 * 회원 탈퇴 — 사용자의 모든 데이터(글·워드프레스 연결·계정 행)와 인증 계정을 영구 삭제.
 * users 행이 사라지면 정기청구 cron이 대상에서 빠지므로 추가 청구도 발생하지 않음.
 */
export async function POST() {
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

  const admin = createSupabaseAdminClient();
  const uid = user.id;

  // 무료 어뷰징 방지 — 탈퇴 이메일을 단방향 해시로 기록(평문 미저장). 재가입해도 무료 미제공(평생 1회).
  if (user.email) {
    try {
      await admin.from("deleted_accounts").upsert(
        { email_hash: emailHash(user.email), deleted_at: new Date().toISOString() },
        { onConflict: "email_hash" },
      );
    } catch {
      // 테이블 없거나 실패해도 탈퇴 자체는 진행
    }
  }

  // 데이터 삭제 (각 테이블 개별 — 일부가 없어도 진행)
  await admin.from("articles").delete().eq("user_id", uid);
  await admin.from("wordpress_connections").delete().eq("user_id", uid);
  await admin.from("usage_log").delete().eq("user_id", uid);
  await admin.from("rate_limits").delete().eq("user_id", uid);
  await admin.from("article_patterns").delete().eq("user_id", uid);
  await admin.from("users").delete().eq("id", uid);

  // 업로드한 이미지(스토리지)도 삭제 — 잊힐 권리(완전 삭제)
  try {
    const { data: files } = await admin.storage.from("article-images").list(uid, { limit: 1000 });
    if (files && files.length) {
      await admin.storage.from("article-images").remove(files.map((f) => `${uid}/${f.name}`));
    }
  } catch {
    // 무시 (버킷/파일 없어도 탈퇴 진행)
  }

  // 인증 계정 삭제
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    return NextResponse.json({ error: "계정을 삭제하지 못했어요. 다시 시도해 주세요." }, { status: 500 });
  }

  // 현재 세션 정리
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
