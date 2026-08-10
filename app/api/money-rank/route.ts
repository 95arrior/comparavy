import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { financeBrandAllowed } from "@/lib/keywordSafety";
import { normalizeKeyword } from "@/lib/diversity";
import { harvestRankingNews, condenseRanking, judgeMoneyRank } from "@/lib/moneyRank";

export const maxDuration = 60;

/**
 * ★머니 랭킹(2026-08-11) — 네이버 뉴스 랭킹에서 돈 되는 소재를 추려 검색 꼬리와 함께 준다.
 * 결핍 레이더 대체(유저: "랭킹 뉴스 경제 관련 엄청 많은데" — 대중 관심이 실증된 대형 소재를 원함).
 */
export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "서버 설정이 아직이에요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (process.env.PRELAUNCH === "true" && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "아직 오픈 전이에요." }, { status: 403 });
  }
  const rl = await checkRateLimit(supabase, user.id, "money_rank", 4, 300);
  if (!rl.ok) {
    return NextResponse.json({ error: `수확이 너무 잦아요. ${rl.retryAfterSec ?? 60}초 후 다시 시도해 주세요.` }, { status: 429 });
  }

  const { data: profileRow } = await supabase
    .from("blog_profiles").select("vertical,sub_category")
    .eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const allowFinanceBrand = financeBrandAllowed(`${profileRow?.vertical ?? ""} ${profileRow?.sub_category ?? ""}`);

  const { data: usedRows } = await supabase
    .from("article_patterns").select("keyword_norm").eq("user_id", user.id).limit(1000);
  const written = new Set((usedRows ?? []).map((r: { keyword_norm: string }) => r.keyword_norm));

  const titles = await harvestRankingNews();
  if (titles.length === 0) {
    return NextResponse.json({ error: "지금 랭킹을 못 가져왔어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  let cands;
  try {
    cands = await condenseRanking(titles, user.id);
  } catch {
    return NextResponse.json({ error: "소재 정리에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  if (cands.length === 0) return NextResponse.json({ items: [], harvested: titles.length });
  const items = await judgeMoneyRank(cands, { written, normalize: normalizeKeyword, allowFinanceBrand });
  return NextResponse.json({ items, harvested: titles.length });
}
