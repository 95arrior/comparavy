import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

// 30일이 지난 글을 정리한다. 배포 환경의 스케줄러(cron)가 시크릿 헤더로 호출.
// 사용량(articles_used)·teaser_used 플래그는 건드리지 않으므로 한도/티저 제한과 무관.
const RETENTION_DAYS = 30;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
