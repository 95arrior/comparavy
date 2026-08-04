// ★홈판 베팅 판정 리드아웃(2026-08-01) — "40%를 걸었으면 틀렸을 때 알아야 한다".
//  판정 로직은 lib/homefeedVerdict(순수 함수)가 갖고, 여기서는 데이터만 모은다.
//  ?days=21 로 관측 창을 바꿔 볼 수 있다(기본 21 — 2주 베팅 + 앞 기준선 1주).
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { judgeHomefeed, RIPE_DAYS, type DayPoint } from "@/lib/homefeedVerdict";
import { TIER_LANE_MIX, type Lane } from "@/lib/scoreWeights";
import { computeBlogTier, coldStartTier } from "@/lib/blogTier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const kstDay = (iso: string): string => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const window = Math.max(7, Math.min(90, Number(url.searchParams.get("days") ?? 21)));
  const since = new Date(Date.now() - window * 86400_000);
  const sinceDay = since.toISOString().slice(0, 10);

  const db = createSupabaseAdminClient();

  // ① 일 단위 방문자 — 우리가 가진 유일한 트래픽 실측(유저 수기 입력)
  const { data: ci } = await db.from("checkins")
    .select("day, visitors").eq("user_id", user.id).gte("day", sinceDay)
    .order("day", { ascending: true }).limit(200);
  const days: DayPoint[] = (ci ?? [])
    .filter((r) => r.visitors != null)
    .map((r) => ({ day: String(r.day), visitors: Number(r.visitors) }));

  // ② 발행 글의 종족 — 홈판 카드는 sel.species='homefeed'로 원장에 남는다(post_performance)
  const { data: pp } = await db.from("post_performance")
    .select("species, seed_source, published_at").eq("user_id", user.id)
    .gte("published_at", since.toISOString()).limit(1000);
  const homefeedPublishDays: string[] = [];
  const otherPublishDays: string[] = [];
  // ★익음 분포(2026-08-04 유저 관찰: "지금 홈판에 노출되는 건 홈판 전략 전 옛 글이고, 지금 글은 아직 노출 전")
  //  홈피드 순환은 즉시가 아니다 — 갓 낸 글을 표본에 넣고 '안 터졌다'고 판정하면 오판이다.
  const ripeness = { "D+0~2": 0, "D+3~6": 0, "D+7~13": 0, "D+14+": 0 };
  let ripeHomefeedPosts = 0;
  for (const p of pp ?? []) {
    if (!p.published_at) continue;
    const d = kstDay(String(p.published_at));
    const isHome = p.species === "homefeed" || (p as { seed_source?: string | null }).seed_source === "homebet";
    (isHome ? homefeedPublishDays : otherPublishDays).push(d);
    if (!isHome) continue;
    const ageDays = Math.floor((Date.now() - Date.parse(String(p.published_at))) / 86400_000);
    if (ageDays >= RIPE_DAYS) ripeHomefeedPosts += 1;
    if (ageDays <= 2) ripeness["D+0~2"] += 1;
    else if (ageDays <= 6) ripeness["D+3~6"] += 1;
    else if (ageDays <= 13) ripeness["D+7~13"] += 1;
    else ripeness["D+14+"] += 1;
  }

  const verdict = judgeHomefeed({ days, homefeedPublishDays, otherPublishDays, ripeHomefeedPosts });

  // ★공급 계측(2026-08-02 — 판정 실행에서 발견한 진짜 문제).
  //  30일 실측: 배합은 homefeed 40%인데 실제 발행 97편 중 홈판은 3편(3.1%)이었다.
  //  즉 홈판은 '안 터진 것'이 아니라 '쏘지 않은 것'이었다 — 그 상태로 판정하면 품질이 아니라 공급을 판정하게 된다.
  //  그래서 판정 옆에 항상 공급을 같이 띄운다: 배합 목표 대비 실제 발행 비중.
  const { data: activeBlog } = await db.from("blog_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const tier = (await computeBlogTier(db, user.id, (activeBlog as { id?: string } | null)?.id ?? null))?.tier ?? coldStartTier().tier;
  const target = TIER_LANE_MIX[tier] ?? TIER_LANE_MIX.SEEDLING;
  const laneOf = (p: { species?: string | null; seed_source?: string | null }): Lane => {
    if (p.species === "homefeed" || p.seed_source === "homebet") return "homefeed";
    if (p.seed_source === "headbet") return "head";
    if (p.species === "trend") return "trend";
    return "golden";
  };
  const counted = { golden: 0, homefeed: 0, trend: 0, head: 0 } as Record<Lane, number>;
  for (const p of pp ?? []) counted[laneOf(p as { species?: string | null; seed_source?: string | null })] += 1;
  const totalPosts = (pp ?? []).length;
  const supply = (["homefeed", "golden", "trend", "head"] as Lane[]).map((lane) => ({
    lane,
    posts: counted[lane],
    actualPct: totalPosts ? Math.round((counted[lane] / totalPosts) * 100) : 0,
    targetPct: target[lane],
    // 목표의 절반에도 못 미치면 '공급 결손' — 품질을 논하기 전에 여기부터 고쳐야 한다.
    short: totalPosts > 0 && (counted[lane] / totalPosts) * 100 < target[lane] / 2,
  }));

  return NextResponse.json({
    window,
    // ★데이터 공백을 결론으로 위장하지 않는다 — 어느 입력이 비었는지 그대로 보여준다.
    inputs: {
      checkinDays: days.length,
      homefeedPosts: homefeedPublishDays.length,
      otherPosts: otherPublishDays.length,
      missing: [
        days.length === 0 ? "checkins(아침 체크인) 입력이 없습니다 — 방문자 판정 불가" : null,
        (pp ?? []).length === 0 ? "post_performance 기록이 없습니다 — FF_PERF_LOOP와 발행 확인(verified) 여부를 보세요" : null,
      ].filter(Boolean),
    },
    // ★공급이 먼저다 — 배합대로 쏘고 있지 않으면 아래 verdict는 품질이 아니라 공급을 판정한 것이다.
    supply: {
      tier,
      totalPosts,
      lanes: supply,
      note: supply.find((s) => s.lane === "homefeed" && s.short)
        ? "홈판이 배합 목표의 절반에도 못 미칩니다 — 판정보다 공급 경로를 먼저 보세요(카드 결품·유저 선택)."
        : "레인 공급은 배합 목표 범위 안입니다.",
    },
    // ★익음 — 홈판 글이 몇 편이나 '판정할 만큼' 익었는가. 이게 낮으면 verdict는 품질이 아니라 시간을 판정한 것이다.
    ripeness: { ripeDays: RIPE_DAYS, ripePosts: ripeHomefeedPosts, 분포: ripeness },
    verdict,
  });
}
