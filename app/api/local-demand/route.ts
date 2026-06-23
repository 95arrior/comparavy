import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { regionLevel, extractRegions, buildLocalSeeds } from "@/lib/region";
import { collectPoolKeywords } from "@/lib/poolCollect";
import { normalizeKey } from "@/lib/naverKeyword";

// 자영업자 히어로용 — 우리 동네에서 '지역+업종'을 한 달에 몇 회 검색하는지(네이버 실데이터).
// graceful: 비지역 업종이면 {}, 주소 없으면 {needAddress}, 실패/0이면 {keyword, searches:0}.

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({});

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("vertical, sub_category, biz_address")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.vertical) return NextResponse.json({});

  const vertical = profile.vertical as string;
  const sub = (profile.sub_category as string | null) ?? null;
  const level = regionLevel(vertical, sub);
  if (level === "wide") return NextResponse.json({}); // 비지역(온라인·취미 등)
  if (!profile.biz_address) return NextResponse.json({ needAddress: true });

  const regions = extractRegions(profile.biz_address as string, level);
  const seeds = buildLocalSeeds(regions, vertical, sub);
  if (!seeds.length) return NextResponse.json({ needAddress: true });

  const seed = seeds[0];
  try {
    const kws = await collectPoolKeywords(seed);
    if (!kws.length) return NextResponse.json({ keyword: seed, searches: 0 });
    const exact = kws.find((k) => normalizeKey(k.keyword) === normalizeKey(seed));
    const best = exact ?? kws[0];
    return NextResponse.json({ keyword: best.keyword, searches: best.monthlySearches });
  } catch {
    return NextResponse.json({ keyword: seed, searches: 0 });
  }
}
