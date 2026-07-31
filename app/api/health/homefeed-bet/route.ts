// ★홈판 베팅 판정 리드아웃(2026-08-01) — "40%를 걸었으면 틀렸을 때 알아야 한다".
//  판정 로직은 lib/homefeedVerdict(순수 함수)가 갖고, 여기서는 데이터만 모은다.
//  ?days=21 로 관측 창을 바꿔 볼 수 있다(기본 21 — 2주 베팅 + 앞 기준선 1주).
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { judgeHomefeed, type DayPoint } from "@/lib/homefeedVerdict";

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
  for (const p of pp ?? []) {
    if (!p.published_at) continue;
    const d = kstDay(String(p.published_at));
    const isHome = p.species === "homefeed" || (p as { seed_source?: string | null }).seed_source === "homebet";
    (isHome ? homefeedPublishDays : otherPublishDays).push(d);
  }

  const verdict = judgeHomefeed({ days, homefeedPublishDays, otherPublishDays });

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
    verdict,
  });
}
