import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { articleToInstaCards } from "@/lib/instaCards";

export const maxDuration = 60;

/** ★인스타 카드뉴스(2026-08-11) — 완성 글을 카드 문구로 압축(새 사실 금지). 이미지는 유저가 구한다. */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  const rl = await checkRateLimit(supabase, user.id, "insta_cards", 8, 300);
  if (!rl.ok) return NextResponse.json({ error: `요청이 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시.` }, { status: 429 });

  let body: { articleId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "요청이 올바르지 않아요." }, { status: 400 }); }
  if (!body.articleId) return NextResponse.json({ error: "글이 지정되지 않았어요." }, { status: 400 });

  const { data: art } = await supabase.from("articles").select("title,body_html,keyword").eq("id", body.articleId).maybeSingle();
  if (!art?.body_html) return NextResponse.json({ error: "글을 찾지 못했어요." }, { status: 404 });

  const pack = await articleToInstaCards(String(art.title ?? ""), String(art.body_html), String(art.keyword ?? ""), user.id);
  if (!pack) return NextResponse.json({ error: "카드 문구를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  return NextResponse.json({ pack });
}
