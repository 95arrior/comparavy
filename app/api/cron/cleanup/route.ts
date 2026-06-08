import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

// 30일이 지난 글을 정리한다. 스케줄러(cron)가 호출.
// 인증: Vercel Cron은 GET + `Authorization: Bearer <CRON_SECRET>`. 수동 호출은 x-cron-secret 헤더도 허용.
// 사용량(articles_used)·teaser_used 플래그는 건드리지 않으므로 한도/티저 제한과 무관.
const RETENTION_DAYS = 30;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const xcron = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || xcron === secret;
}

async function runCleanup() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createSupabaseAdminClient();

  const { error, count } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0, cutoff });
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runCleanup();
}
