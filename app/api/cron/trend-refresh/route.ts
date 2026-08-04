import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase-server";
import { refreshCategoryTrends, hasFreshTrends, getTrendTopics } from "@/lib/trendTopics";
import { isAdminEmail } from "@/lib/adminStats";

export const maxDuration = 300;

// ★트렌드 갱신 크론 — 활성 카테고리(유저가 실제 쓰는 주제)만 신선도 만료 시 갱신.
//  비용은 카테고리 수뿐(유저 수 무관). 4시간마다 실행 → '그날 그시간' 트렌드.
// ★손으로 당겨 쓸 수 있어야 한다(2026-08-05 유저: "5시 수확을 지금 땡긴다고 생각하고").
//  종전엔 크론 시크릿 헤더가 있어야만 열려서 브라우저로는 확인할 방법이 없었다 —
//  수확을 고쳐 놓고도 다음 크론까지 4시간을 기다려야 했다. 관리자 세션이면 지금 돌린다.
//  ?force=1  신선도 검사 건너뛰기(고친 수확기를 지금 태우려면 필수 — 안 그러면 '신선함'으로 스킵된다)
//  ?sub=경제·재테크  이 카테고리만(전체 30개를 돌리면 느리다)
async function authorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const xcron = request.headers.get("x-cron-secret");
    if (auth === `Bearer ${secret}` || xcron === secret) return true;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user && isAdminEmail(user.email);
  } catch { return false; }
}

const MAX_CATEGORIES = 30; // 1회 갱신 상한

export async function GET(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const onlySub = (url.searchParams.get("sub") ?? "").trim();

  // 활성 카테고리 = 온라인 프로필의 sub_category(중복 제거)
  const { data: profs } = await admin.from("blog_profiles").select("sub_category, vertical").limit(5000);
  const cats = new Set<string>();
  for (const p of profs ?? []) {
    const c = (p.sub_category || p.vertical || "").trim();
    if (c) cats.add(c);
  }
  const list = onlySub ? [onlySub] : [...cats].slice(0, MAX_CATEGORIES);

  let refreshed = 0, skipped = 0, total = 0;
  const detail: { category: string; generated: number; dropTop: string[] }[] = [];
  for (const cat of list) {
    if (!force && await hasFreshTrends(cat)) { skipped++; continue; }
    const r = await refreshCategoryTrends(cat);
    if (r.generated > 0) { refreshed++; total += r.generated; }
    // 탈락 사유 상위 — '왜 안 들어왔나'를 응답에서 바로 본다(로그를 뒤지지 않게)
    const dist: Record<string, number> = {};
    for (const d of r.drops) dist[d.reason] = (dist[d.reason] ?? 0) + 1;
    detail.push({ category: cat, generated: r.generated, dropTop: Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`) });
  }

  // ★실시간 씨앗이 실제로 들어왔는지 그 자리에서 보여준다(2026-08-05).
  //  브랜드 버즈·급상승 주입을 고쳐 놓고 "들어왔나요?"를 다시 물어야 하는 상황을 없앤다.
  const rising: { category: string; keywords: string[] }[] = [];
  for (const cat of list) {
    try {
      const seeds = await getTrendTopics(cat);
      const rk = seeds.filter((t) => t.source === "rising").map((t) => t.keyword);
      if (rk.length) rising.push({ category: cat, keywords: rk.slice(0, 10) });
    } catch { /* 조회 실패는 갱신 결과에 영향 없다 */ }
  }

  return NextResponse.json({
    ok: true,
    force,
    categories: list.length,
    refreshed,
    skipped,
    topics: total,
    detail,
    "실시간 씨앗(rising)": rising.length ? rising : "없음 — 브랜드 버즈·급상승이 하나도 안 들어왔다",
  });
}
