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
//  ★2026-08-05 실측: force=1 전체는 300초를 넘겨 504로 죽었다. 이제 예산 안에서 할 수 있는
//   만큼만 하고 남은 건 pending으로 돌려준다 — 같은 주소를 다시 부르면 이어서 한다.
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
  // ★이어받기(2026-08-05): force=1이면 신선도 검사를 건너뛰므로, 다시 불러도 앞에서부터 또 돈다.
  //  그러면 예산이 모자랄 때 영원히 앞 카테고리만 돌고 뒤는 손도 못 댄다 —
  //  응답이 주는 nextOffset을 붙여 다시 부르면 그 다음부터 이어서 한다.
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const all = [...cats];
  const list = onlySub ? [onlySub] : all.slice(offset, offset + MAX_CATEGORIES);

  // ★시간 예산(2026-08-05 실측: force=1이 300초를 넘겨 504로 죽었다).
  //  ★한도를 넘겨 죽으면 그때까지 한 일도 응답에 안 남는다 — 유저는 '아무 일도 안 일어났다'고 본다.
  //   그래서 죽기 전에 멈추고, 어디까지 했는지 반드시 돌려준다. 남은 건 다음 호출이 이어서 한다
  //   (신선도 검사가 이미 끝난 카테고리를 건너뛰므로, 그냥 다시 부르면 이어진다).
  const startedAt = Date.now();
  const BUDGET_MS = 230_000; // maxDuration 300초 — 응답 조립·씨앗 조회 몫을 남긴다
  const left = () => BUDGET_MS - (Date.now() - startedAt);

  let refreshed = 0, skipped = 0, total = 0;
  const pending: string[] = [];
  const detail: { category: string; generated: number; dropTop: string[] }[] = [];
  for (const cat of list) {
    // 한 카테고리 수확이 대략 40~60초다 — 그만큼 안 남았으면 시작하지 않는다
    if (left() < 60_000) { pending.push(cat); continue; }
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
    if (pending.includes(cat)) continue; // 안 돌린 건 조회도 의미 없다
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
    // ★시간이 모자라 못 돌린 것 — 그냥 같은 주소를 다시 부르면 이어서 한다
    pending: pending.length,
    pendingCats: pending.slice(0, 10),
    // ★남았으면 이 주소를 그대로 다시 부르면 된다(앞부분을 또 돌지 않는다)
    nextUrl: pending.length && !onlySub
      ? `/api/cron/trend-refresh?force=${force ? 1 : 0}&offset=${offset + (list.length - pending.length)}`
      : null,
    totalCategories: all.length,
    elapsedSec: Math.round((Date.now() - startedAt) / 1000),
    topics: total,
    detail,
    "실시간 씨앗(rising)": rising.length ? rising : "없음 — 브랜드 버즈·급상승이 하나도 안 들어왔다",
  });
}
