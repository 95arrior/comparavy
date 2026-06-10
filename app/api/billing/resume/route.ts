import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

/**
 * 구독 해지 취소(되돌리기). 아직 이용 기간이 남아 있으면 자동결제를 다시 켠다.
 * next_billing_at은 남은 기간 종료일(current_period_end)로 복구한다.
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
  const { data: row } = await admin
    .from("users")
    .select("current_period_end, sub_status")
    .eq("id", user.id)
    .maybeSingle();

  // 이미 active면 그대로 둠
  const periodEnd = row?.current_period_end ?? null;
  await admin
    .from("users")
    .update({ sub_status: "active", next_billing_at: periodEnd })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, nextBillingAt: periodEnd });
}
