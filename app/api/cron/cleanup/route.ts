import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

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

async function runCleanup() {
  const supabase = createSupabaseAdminClient();
  // 7일 이상 지난 rate_limit 행 정리 (다음 요청 시 어차피 새 윈도우로 리셋되므로 안전)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from("rate_limits")
    .delete({ count: "exact" })
    .lt("window_start", cutoff);

  if (error) {
    // rate_limits 정리 실패해도 무해 — 그냥 ok
    return NextResponse.json({ ok: true, cleaned: 0 });
  }
  return NextResponse.json({ ok: true, cleaned: count ?? 0 });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}
