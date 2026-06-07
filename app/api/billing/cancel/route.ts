import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";

/**
 * 구독 해지. 다음 청구를 중단하되, 이미 결제된 기간(current_period_end)까지는 유지.
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

  await supabase
    .from("users")
    .update({ sub_status: "canceled", next_billing_at: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
