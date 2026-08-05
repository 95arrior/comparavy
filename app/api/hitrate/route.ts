// ★글감 적중률(2026-08-05 유저 요청) — "우리가 낸 글감이 실제 유입 검색어에 있었나".
//  GET: 최근 N일 성적표(원천별 적중률 + 놓친 유입어).
//  유입 검색어는 /api/perf-import(붙여넣기)로 이미 들어와 있는 inflow_keywords를 쓴다 —
//  ★입력 창구를 새로 만들지 않는다. 유저가 두 곳에 같은 걸 붙여넣게 하면 안 쓰게 된다.
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase-server";
import { computeHits, sourceStats, keywordMatch, type ServedRow, type InflowRow } from "@/lib/topicHitrate";

export const dynamic = "force-dynamic";

const kstDay = (offsetDays = 0) =>
  new Date(Date.now() + 9 * 3600_000 - offsetDays * 86400_000).toISOString().slice(0, 10);

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const days = Math.min(30, Math.max(3, Number(new URL(req.url).searchParams.get("days") ?? 7)));
  const since = kstDay(days);
  const admin = createSupabaseAdminClient();

  const [{ data: sv, error: svErr }, { data: inf }] = await Promise.all([
    admin.from("served_topics").select("date, keyword, norm, seed_source, lane, vol, blog_total, preempt")
      .eq("user_id", user.id).gte("date", since).order("date", { ascending: false }).limit(2000),
    admin.from("inflow_keywords").select("date, keyword, inflow")
      .eq("user_id", user.id).gte("date", since).order("date", { ascending: false }).limit(2000),
  ]);

  const served = (sv ?? []) as ServedRow[];
  const inflow = (inf ?? []) as InflowRow[];

  // ★테이블이 없으면 '기록이 없다'가 아니라 '아직 설치 안 됐다'라고 말한다.
  //  둘을 같은 화면으로 뭉개면, 마이그레이션을 안 돌린 채로 며칠을 기다리게 된다.
  if (svErr && /relation .* does not exist|schema cache/i.test(svErr.message ?? "")) {
    return NextResponse.json({
      ready: false,
      reason: "적중률 저장소가 아직 없어요",
      howto: "supabase/migrations/0066_topic_hitrate.sql을 Supabase SQL 편집기에서 한 번 실행하면 그날부터 기록돼요.",
      days,
    });
  }

  // ★재료가 없으면 숫자를 만들지 않는다 — 0%와 '아직 못 잼'은 다른 말이다.
  if (!inflow.length) {
    return NextResponse.json({
      ready: false,
      reason: "유입 검색어가 아직 없어요",
      howto: "성과 기록에서 네이버 크리에이터 어드바이저의 '유입 검색어'를 붙여넣으면 그날부터 적중률이 계산돼요.",
      servedCount: served.length, days,
    });
  }
  if (!served.length) {
    return NextResponse.json({
      ready: false,
      reason: "기록된 글감이 아직 없어요",
      howto: "글감 보드를 한 번 열면 그날 글감이 기록돼요. 다음 날 유입 검색어를 넣으면 맞대볼 수 있어요.",
      inflowCount: inflow.length, days,
    });
  }

  const hits = computeHits(served, inflow);
  const stats = sourceStats(served, hits);

  // ★놓친 것이 더 중요하다 — 유입은 있었는데 우리가 못 낸 검색어.
  //  적중률만 보면 '조금 내고 다 맞히는' 상태가 좋아 보인다. 실제로 필요한 건 커버리지다.
  const missed = inflow
    .filter((i) => !served.some((s) => keywordMatch(s.keyword, i.keyword)))
    .sort((a, b) => b.inflow - a.inflow)
    .slice(0, 30)
    .map((i) => ({ date: i.date, keyword: i.keyword, inflow: i.inflow }));

  const uniqInflow = new Set(inflow.map((i) => `${i.date}|${i.keyword}`)).size;
  const coverage = uniqInflow ? Math.round(((uniqInflow - missed.length) / uniqInflow) * 1000) / 10 : 0;

  // 원장에 남긴다(같은 날 재계산 시 덮어쓰기)
  if (hits.length) {
    await admin.from("topic_hits").upsert(
      hits.map((h) => ({ user_id: user.id, ...h })),
      { onConflict: "user_id,inflow_date,keyword,inflow_keyword" },
    );
  }

  return NextResponse.json({
    ready: true, days,
    servedCount: served.length,
    inflowCount: uniqInflow,
    hitCount: hits.length,
    // ★커버리지 = 실제 유입 검색어 중 우리가 미리 낸 비율. 이게 북극성이다.
    coverage,
    sources: stats,
    hits: hits.slice(0, 40),
    missed,
  });
}
