import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { applyPlan } from "@/lib/userPlan";
import { PLANS, PRO_ORDER_NAME } from "@/lib/plans";
import { chargeBillingKey, makeOrderId } from "@/lib/toss";

const PERIOD_DAYS = 30;

/**
 * 정기 청구 엔드포인트. 스케줄러(cron)가 호출한다.
 * 보호: Authorization: Bearer <BILLING_CRON_SECRET>
 * next_billing_at 이 도래한 active 구독을 청구한다.
 */
export async function POST(request: Request) {
  const secret = process.env.BILLING_CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "서버 설정이 완료되지 않았습니다." }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await supabase
    .from("users")
    .select("*")
    .eq("sub_status", "active")
    .lte("next_billing_at", nowIso);

  const rows = due ?? [];
  let charged = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.billing_key || !row.customer_key) continue;
    try {
      await chargeBillingKey({
        billingKey: row.billing_key,
        customerKey: row.customer_key,
        amount: PLANS.pro.price,
        orderId: makeOrderId(),
        orderName: PRO_ORDER_NAME,
      });
      const now = new Date();
      const next = new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
      await supabase
        .from("users")
        .update({
          next_billing_at: next.toISOString(),
          current_period_end: next.toISOString(),
          articles_used: 0,
          period_start: now.toISOString(),
        })
        .eq("id", row.id);
      charged++;
    } catch {
      // 청구 실패 → 무료로 강등 (구독 비활성화)
      await applyPlan(supabase, row.id, "free", {
        sub_status: "canceled",
        next_billing_at: null,
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, charged, failed, total: rows.length });
}
