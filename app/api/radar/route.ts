import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminEmail } from "@/lib/adminStats";
import { financeBrandAllowed } from "@/lib/keywordSafety";
import { normalizeKeyword } from "@/lib/diversity";
import { harvestBuzz, condenseBuzz, judgeCandidates, goldRank } from "@/lib/lackRadar";
import { fetchKeywordStats } from "@/lib/naverKeyword";

export const maxDuration = 60;

/**
 * ★결핍 레이더(2026-08-10) — 버튼 하나로 지식iN 질문·카페 버즈를 수확해 '오늘 심을 돈 결핍 소재'를 고른다.
 * 어드바이저 붙여넣기(후행지표) 폐기 후속 — 소스가 서버에 있으니 유저 입력이 아예 없다(뇌빼기 완성형).
 * 기존 글감 파이프(topics)와 분리된 추가 레인.
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
  const rl = await checkRateLimit(supabase, user.id, "lack_radar", 4, 300);
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

  const raw = await harvestBuzz();
  if (raw.length === 0) {
    return NextResponse.json({ error: "지금 수확이 안 돼요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  let cands;
  try {
    cands = await condenseBuzz(raw, user.id);
  } catch {
    return NextResponse.json({ error: "수확물 정리에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  if (cands.length === 0) {
    return NextResponse.json({ items: [], harvested: raw.length });
  }
  const items = await judgeCandidates(cands, { written, normalize: normalizeKeyword, allowFinanceBrand });
  // ★골드 정렬 — 직행 픽의 월 검색량을 재서 수요÷공급으로 세운다(돈 되는 순). 실패해도 판정은 그대로 산다.
  const directKws = items.filter((i) => i.verdict === "direct").map((i) => i.keyword);
  const stats = directKws.length > 0 ? await fetchKeywordStats(directKws, 2).catch(() => new Map()) : new Map();
  goldRank(items, stats);
  return NextResponse.json({ items, harvested: raw.length });
}
