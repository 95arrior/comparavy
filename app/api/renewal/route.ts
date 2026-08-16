import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";

// ★갱신 큐(2026-07-17) — 개정 시즌에 걸린 오래된 발행 글 목록(선정은 revision-scan 크론이 자동).
//  GET: 내 pending 목록 / PATCH: 무시(dismissed)·완료(done) 처리.
export async function GET() {
  if (!FF.revisionScan) return NextResponse.json({ enabled: false, items: [] });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = createSupabaseAdminClient();

  const { data: items } = await admin.from("renewal_queue")
    .select("id, article_id, keyword, title, channel, season_label, created_at")
    .eq("user_id", user.id).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(20);
  if (!items?.length) return NextResponse.json({ enabled: true, items: [] });

  // 글 보기 링크용 URL(네이버) — 채널별 보조 정보만, 실패해도 목록은 그대로
  const urls = new Map<string, string | null>();
  try {
    const { data: arts } = await admin.from("articles").select("id, naver_url").in("id", items.map((i) => i.article_id));
    for (const a of arts ?? []) urls.set(String(a.id), (a as { naver_url?: string | null }).naver_url ?? null);
  } catch { /* 무해 */ }

  return NextResponse.json({
    enabled: true,
    items: items.map((i) => ({ ...i, naver_url: urls.get(String(i.article_id)) ?? null })),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; action?: string } | null;
  const action = body?.action === "dismiss" ? "dismissed" : body?.action === "done" ? "done" : null;
  if (!body?.id || !action) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("renewal_queue").update({ status: action }).eq("id", body.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
