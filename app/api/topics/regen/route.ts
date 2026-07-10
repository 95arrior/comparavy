import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { refreshCategoryTrends } from "@/lib/trendTopics";
import { checkRateLimit } from "@/lib/rateLimit";

export const maxDuration = 300;

// ★글감 새로 받기(2026-07-10 유저 요청: "크론 기다리는 게 애매해") — 크론과 무관하게 지금 즉시:
//  ① 지금 뜨는 = 신선도 검사 없이 강제 재수확  ② 꾸준한 수요 = 하루 고정 시드에 논스를 섞어 세트 갈이
//  ③ least-used 윈도우 한 칸 전진 + 유저 증식·스포크 캐시 무효화. 1시간 2회 제한(수확 비용 보호).
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { data: profile } = await supabase
    .from("blog_profiles")
    .select("id, vertical, sub_category")
    .eq("user_id", user.id).eq("is_active", true)
    .maybeSingle();
  const vertical = profile?.vertical;
  const sub = profile?.sub_category || vertical;
  if (!vertical || !sub) return NextResponse.json({ error: "온보딩을 먼저 완료해 주세요." }, { status: 400 });

  const rl = await checkRateLimit(supabase, user.id, `regen_${sub}`, 2, 3600);
  if (!rl.ok) return NextResponse.json({ error: "새로 받기는 1시간에 2번까지예요. 잠시 뒤에 다시 눌러 주세요." }, { status: 429 });

  const admin = createSupabaseAdminClient();

  // ① 논스 증가 — topics의 에버그린 셔플 시드·증식 캐시 키에 섞인다(그날 세트 강제 교체)
  const nonceKey = `regen:${user.id}`;
  try {
    const { data: cur } = await admin.from("api_cache").select("value").eq("key", nonceKey).maybeSingle();
    const n = Number((cur?.value as { n?: number } | null)?.n ?? 0) + 1;
    await admin.from("api_cache").upsert({ key: nonceKey, value: { n }, expires_at: new Date(Date.now() + 365 * 86400_000).toISOString(), updated_at: new Date().toISOString() });
  } catch { /* 논스 실패해도 수확은 진행 */ }

  // ② 지금 뜨는 — 강제 재수확(뉴스+청약홈+보조금24+기업마당)
  let seeds = 0;
  try { const r = await refreshCategoryTrends(sub); seeds = r.generated; } catch { /* 수확 실패해도 갈이는 유효 */ }

  // ③ 꾸준한 수요 — least-used 윈도우 한 칸 전진(times_assigned는 분산 카운터라 +1은 무해)
  try {
    const { data: rows } = await admin.from("keyword_pool").select("id, times_assigned")
      .eq("vertical", vertical).eq("sub", sub)
      .order("times_assigned", { ascending: true }).order("monthly_searches", { ascending: false }).limit(150);
    const groups = new Map<number, (string | number)[]>();
    for (const r of rows ?? []) {
      const v = Number((r as { times_assigned?: number }).times_assigned ?? 0);
      if (!groups.has(v)) groups.set(v, []);
      groups.get(v)!.push((r as { id: string | number }).id);
    }
    for (const [v, ids] of groups) {
      for (let i = 0; i < ids.length; i += 100) {
        await admin.from("keyword_pool").update({ times_assigned: v + 1 }).in("id", ids.slice(i, i + 100));
      }
    }
  } catch { /* ignore */ }

  // ④ 이 유저의 오늘 캐시 무효화 — 증식 결과·스포크(다음 로드에서 새 씨앗·새 시드로 재조립)
  try { await admin.from("api_cache").delete().like("key", `amp:v5:${user.id}:%`); } catch { /* ignore */ }
  try { await admin.from("api_cache").delete().like("key", `spokes:${user.id}:%`); } catch { /* ignore */ }

  return NextResponse.json({ ok: true, seeds });
}
