import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { applyPlan } from "@/lib/userPlan";
import { PLANS, PRO_ORDER_NAME } from "@/lib/plans";
import { chargeBillingKey, makeOrderId } from "@/lib/toss";

const PERIOD_DAYS = 30;
// 결제 실패 시 즉시 강등하지 않고 유예: 3일 간격으로 최대 3회 재시도(≈9일) 후 강등.
const RETRY_INTERVAL_DAYS = 3;
const MAX_RETRIES = 3;

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

  // active(정상) + past_due(재시도 대기) 둘 다 청구 대상
  const { data: due } = await supabase
    .from("users")
    .select("*")
    .in("sub_status", ["active", "past_due"])
    .lte("next_billing_at", nowIso);

  const rows = due ?? [];
  let charged = 0;
  let pastDue = 0; // 실패했지만 유예 중(재시도 예정)
  let failed = 0; // 유예 끝나 강등됨

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
      // 성공 → 새 결제주기 시작(새 30편), 재시도 카운터 초기화
      const now = new Date();
      const next = new Date(now.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
      await supabase
        .from("users")
        .update({
          sub_status: "active",
          next_billing_at: next.toISOString(),
          current_period_end: next.toISOString(),
          articles_used: 0,
          period_start: now.toISOString(),
          billing_retries: 0,
        })
        .eq("id", row.id);
      charged++;
    } catch {
      const retries = (row.billing_retries ?? 0) + 1;
      if (retries < MAX_RETRIES) {
        // 유예: 접근은 유지하되 '새 글 생성'은 동결(비용 발생 차단), 며칠 뒤 재시도.
        // → 결제 안 하고 무료로 글을 뽑아가는 악용을 막으면서도 갑자기 잘리지 않게 한다.
        const next = new Date(Date.now() + RETRY_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
        await supabase
          .from("users")
          .update({
            sub_status: "past_due",
            next_billing_at: next.toISOString(),
            billing_retries: retries,
            articles_used: PLANS.pro.articles, // 새 생성 동결(남은 생성 0)
          })
          .eq("id", row.id);
        pastDue++;
      } else {
        // 유예 끝까지 실패 → 무료로 강등. 무료 '체험 3편'은 신규 가입자용 →
        // 강등된 전(前) 프로는 신규 생성 0편. (기존 글·워드프레스 연결은 보존 — 재구독 시 복구)
        await applyPlan(row.id, "free", {
          sub_status: "canceled",
          next_billing_at: null,
          billing_retries: 0,
          articles_used: PLANS.free.articles,
        });
        failed++;
      }
    }
  }

  return NextResponse.json({ ok: true, charged, pastDue, failed, total: rows.length });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return runCharge();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  return runCharge();
}
