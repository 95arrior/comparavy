import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { financeBrandAllowed } from "@/lib/keywordSafety";
import { normalizeKeyword } from "@/lib/diversity";
import { findGapTails, judgeMoneyRank, attachSimilar } from "@/lib/moneyRank";
import { isVerifiedStatus } from "@/lib/course";

export const maxDuration = 60;

/** ★빈틈 찾기 — 붐빔(crowded) 소재의 꼬리를 실측 재료(자동완성+지식iN)에서 발굴해 게이트 통과분만 돌려준다. */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "서버 설정이 아직이에요." }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  const rl = await checkRateLimit(supabase, user.id, "money_rank_gap", 8, 300);
  if (!rl.ok) return NextResponse.json({ error: `요청이 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시.` }, { status: 429 });

  let body: { keyword?: string; newsTitle?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "요청이 올바르지 않아요." }, { status: 400 }); }
  const head = (body.keyword ?? "").trim();
  if (!head) return NextResponse.json({ error: "키워드가 없어요." }, { status: 400 });

  const { data: profileRow } = await supabase
    .from("blog_profiles").select("vertical,sub_category")
    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const allowFinanceBrand = financeBrandAllowed(`${profileRow?.vertical ?? ""} ${profileRow?.sub_category ?? ""}`);
  const { data: usedRows } = await supabase
    .from("article_patterns").select("keyword_norm").eq("user_id", user.id).limit(1000);
  const written = new Set((usedRows ?? []).map((r: { keyword_norm: string }) => r.keyword_norm));

  const tails = await findGapTails(head, user.id);
  if (tails.length === 0) return NextResponse.json({ items: [] });
  const items = await judgeMoneyRank(
    tails.map((t) => ({ issue: t.hint, keyword: t.keyword, cat: "빈틈", newsTitle: body.newsTitle ?? "" })),
    { written, normalize: normalizeKeyword, allowFinanceBrand },
  );
  const { data: recent } = await supabase.from("articles").select("keyword,title,status")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  attachSimilar(items, recent ?? [], isVerifiedStatus);
  return NextResponse.json({ items });
}
