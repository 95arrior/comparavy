import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminStats";
import { distributeDates } from "@/lib/keywordQueue";

const MAX_PER_ADD = 20;

/** 키워드 예약 큐: GET(목록) / POST(선택 키워드 담기) / DELETE(항목 제거). */
export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data } = await supabase
    .from("keyword_queue")
    .select("id, keyword, status, scheduled_for, article_id, position")
    .eq("user_id", user.id)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  return NextResponse.json({ queue: data ?? [] });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const raw = Array.isArray(body.keywords) ? body.keywords : [];
  // 정제: 문자열·중복 제거·길이 제한
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const k of raw) {
    const s = (typeof k === "string" ? k : "").trim().slice(0, 80);
    if (s && !seen.has(s)) { seen.add(s); keywords.push(s); }
    if (keywords.length >= MAX_PER_ADD) break;
  }
  if (keywords.length === 0) return NextResponse.json({ error: "담을 키워드가 없어요." }, { status: 400 });

  // 이어붙일 시작 position (기존 큐 다음부터)
  const { data: last } = await supabase
    .from("keyword_queue")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const basePos = (last?.position ?? -1) + 1;

  const dates = distributeDates(keywords.length);
  const rows = keywords.map((keyword, i) => ({
    user_id: user.id,
    keyword,
    status: "queued",
    scheduled_for: dates[i],
    position: basePos + i,
  }));

  const { data, error } = await supabase
    .from("keyword_queue")
    .insert(rows)
    .select("id, keyword, status, scheduled_for, article_id, position");
  if (error) return NextResponse.json({ error: `큐 저장 실패: ${error.message}` }, { status: 500 });

  return NextResponse.json({ queued: data ?? [] });
}

export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id가 필요해요." }, { status: 400 });

  await supabase.from("keyword_queue").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
