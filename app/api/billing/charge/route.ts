import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { applyPlan } from "@/lib/userPlan";
import { PLANS, PRO_ORDER_NAME } from "@/lib/plans";
import { chargeBillingKey, makeOrderId } from "@/lib/toss";

const PERIOD_DAYS = 30;

/**
 * 정기 청구. 스케줄러(cron)가 매일 호출한다.
 * 인증: Vercel Cron은 GET + `Authorization: Bearer <CRON_SECRET>`. 수동 호출은 BILLING_CRON_SECRET 도 허용.
 * next_billing_at 이 도래한 active 구독을 청구한다.
 */
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cron = process.env.CRON_SECRET;
  const billing = process.env.BILLING_CRON_SECRET;
  return Boolean((cron && auth === `Bearer ${cron}`) || (billing && auth === `Bearer ${billing}`));
}

async function runCharge() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
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
      // 무료 '체험 3편'은 신규 가입자용 → 강등된 전(前) 프로에게는 신규 생성 0편으로 맞춘다.
      // (기존에 만든 글·워드프레스 연결은 그대로 보존 — 재구독하면 다시 발행 가능)
      await applyPlan(row.id, "free", {
        sub_status: "canceled",
        next_billing_at: null,
        articles_used: PLANS.free.articles,
      });
      failed++;
    }
  }

  return NextResponse.json({ ok: true, charged, failed, total: rows.length });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return runCharge();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return runCharge();
}
