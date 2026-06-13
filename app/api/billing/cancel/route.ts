import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

/**
 * 구독 해지. 다음 청구를 중단하되, 이미 결제된 기간(current_period_end)까지는 유지.
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

  // 쓰기는 서비스롤로 — 유저 권한(RLS)으로 users update가 막혀 해지가 반영 안 되던 문제 방지
  await createSupabaseAdminClient()
    .from("users")
    .update({ sub_status: "canceled", next_billing_at: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
