import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { ensureUserRow, applyPlan } from "@/lib/userPlan";
import { PLANS, PRO_ORDER_NAME } from "@/lib/plans";
import { issueBillingKey, chargeBillingKey, makeOrderId } from "@/lib/toss";

const PERIOD_DAYS = 30;

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

  const body = await request.json().catch(() => ({}));
  const authKey = (body.authKey ?? "").trim();
  const customerKey = (body.customerKey ?? "").trim();
  if (!authKey || !customerKey) {
    return NextResponse.json({ error: "결제 인증 정보가 올바르지 않아요." }, { status: 400 });
  }

  await ensureUserRow(supabase, user.id);

  try {
    // 1) 빌링키 발급
    const { billingKey } = await issueBillingKey({ authKey, customerKey });

    // 2) 첫 구독료 즉시 결제
    await chargeBillingKey({
      billingKey,
      customerKey,
      amount: PLANS.pro.price,
      orderId: makeOrderId(),
      orderName: PRO_ORDER_NAME,
    });

    // 3) 프로 플랜 적용
    const now = new Date();
    const next = new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
    await applyPlan(user.id, "pro", {
      billing_key: billingKey,
      customer_key: customerKey,
      sub_status: "active",
      next_billing_at: next.toISOString(),
      current_period_end: next.toISOString(),
      articles_used: 0,
      period_start: now.toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "결제하지 못했어요. 다시 시도해 주세요.";
    return NextResponse.json({ error: message }, { status: 402 });
  }
}
