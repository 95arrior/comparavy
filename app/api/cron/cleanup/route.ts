import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { costKrw, USD_TO_KRW } from "@/lib/usageLog";
import { sendAdminEmail } from "@/lib/notify";

// 가벼운 housekeeping. 스케줄러(cron)가 호출.
// 인증: Vercel Cron은 GET + `Authorization: Bearer <CRON_SECRET>`. 수동 호출은 x-cron-secret 헤더도 허용.
// ※ 글(articles)은 절대 삭제하지 않는다 — 사용자의 콘텐츠(초안 포함)는 영구 보관.
//    오래된 rate_limits 카운터 행만 정리한다(어차피 윈도우 만료되면 리셋되는 값).
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const xcron = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || xcron === secret;
}

const SOCIAL_BUCKET = "social-cards";

// 발행 완료된 오래된 카드뉴스 이미지·행 정리 (스토리지 누적 방지). 글(articles)과 무관.
async function cleanupSocial(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<number> {
  try {
    const old = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,media_urls")
      .eq("status", "published")
      .lt("published_at", old)
      .limit(200);
    if (!rows?.length) return 0;

    // public URL → 버킷 내 경로 추출 후 이미지 삭제
    const paths: string[] = [];
    for (const r of rows as { id: string; media_urls: unknown }[]) {
      const urls = Array.isArray(r.media_urls) ? (r.media_urls as string[]) : [];
      for (const u of urls) {
        const i = u.indexOf(`/${SOCIAL_BUCKET}/`);
        if (i !== -1) paths.push(u.slice(i + SOCIAL_BUCKET.length + 2));
      }
    }
    if (paths.length) await supabase.storage.from(SOCIAL_BUCKET).remove(paths);
    const ids = (rows as { id: string }[]).map((r) => r.id);
    await supabase.from("social_posts").delete().in("id", ids);
    return ids.length;
  } catch {
    return 0;
  }
}

// 월 예산 80% 도달 시 관리자 이메일 알림 (이메일 설정돼 있을 때만, 달마다 1회).
async function budgetAlert(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<boolean> {
  try {
    const KST = 9 * 3600000;
    const kstNow = new Date(Date.now() + KST);
    const month = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthIso = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - KST).toISOString();
    const budget = (Number(process.env.AI_MONTHLY_BUDGET_USD) || 500) * USD_TO_KRW;
    const { data: usage } = await supabase
      .from("usage_log")
      .select("model,input_tokens,output_tokens")
      .gte("created_at", monthIso)
      .limit(50000);
    let cost = 0;
    for (const u of (usage ?? []) as { model: string; input_tokens: number; output_tokens: number }[]) {
      cost += costKrw(u.model, u.input_tokens || 0, u.output_tokens || 0);
    }
    const pct = budget > 0 ? (cost / budget) * 100 : 0;
    if (pct < 80) return false;

    const { data: h } = await supabase.from("ai_health").select("budget_alert_month").eq("id", 1).maybeSingle();
    if (h?.budget_alert_month === month) return false; // 이번 달 이미 보냄

    const sent = await sendAdminEmail(
      `[ateflo] API 예산 ${Math.round(pct)}% 사용`,
      `이번 달 API 비용이 약 ₩${Math.round(cost).toLocaleString()} (월 한도 ₩${Math.round(budget).toLocaleString()}의 ${Math.round(pct)}%)에 도달했어요.\n\n` +
        `Anthropic 콘솔에서 사용량을 확인하고, 필요하면 월 지출 한도를 올리거나 크레딧을 충전하세요.\n` +
        `https://console.anthropic.com/settings/billing`,
    );
    if (sent) await supabase.from("ai_health").update({ budget_alert_month: month }).eq("id", 1);
    return sent;
  } catch {
    return false;
  }
}

async function runCleanup() {
  const supabase = createSupabaseAdminClient();
  // 7일 이상 지난 rate_limit 행 정리 (다음 요청 시 어차피 새 윈도우로 리셋되므로 안전)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("rate_limits")
    .delete({ count: "exact" })
    .lt("window_start", cutoff);

  const social = await cleanupSocial(supabase);
  const budgetAlerted = await budgetAlert(supabase);

  if (error) {
    // rate_limits 정리 실패해도 무해 — 그냥 ok
    return NextResponse.json({ ok: true, cleaned: 0, social, budgetAlerted });
  }
  return NextResponse.json({ ok: true, cleaned: count ?? 0, social, budgetAlerted });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}
