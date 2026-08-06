// ★병목 진단(2026-08-06 유저: "하루 1,000명은커녕 500명도 못 넘기네. 내가 뭐 잘못하고 있는 걸까").
//
//  ★유입이 낮은 이유는 두 가지뿐인데, 처방이 정반대다:
//   (가) 순위에는 드는데 그 키워드 자체가 작다  → 키워드를 더 큰 걸로. 글은 잘 쓰고 있는 것이다.
//   (나) 애초에 순위에 못 든다                 → 키워드를 키우면 더 나빠진다. 지수·품질 문제다.
//  ★둘을 구분 못 한 채 "더 노력"하면 (나)인데 (가)의 처방을 쓰게 되고, 그게 제일 흔한 실패다.
//   (7/31 사고가 정확히 그거였다 — 신생이 헤드 키워드로 나가 노출 0/5.)
//
//  그래서 이 진단은 하나만 답한다: 지금 우리 병목이 (가)인가 (나)인가.
//  rank_snapshots에 D+1/3/7/14 순위가 이미 쌓이고 있으므로 새로 재지 않는다. 읽기 전용이다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const days = Math.min(90, Math.max(7, Number(new URL(request.url).searchParams.get("days") ?? 30)));
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: posts } = await admin.from("post_performance")
    .select("article_id, keyword, published_at")
    .eq("user_id", user.id).gte("published_at", since).limit(1000);
  const rows = posts ?? [];
  if (!rows.length) {
    return NextResponse.json({ 진단: "최근 발행 기록이 없다 — 발행 확인(verify)이 안 됐을 수도 있다.", 기간: `${days}일` });
  }

  const ids = rows.map((r) => r.article_id);
  const { data: snaps } = await admin.from("rank_snapshots")
    .select("article_id, day_offset, area, rank, status").in("article_id", ids).limit(8000);

  // ★글 한 편당 '가장 좋았던 순위'로 본다 — 체크포인트마다 오르내리는데 최저값이 그 글의 실력이다.
  const best = new Map<string, number | null>();
  const measured = new Set<string>();
  for (const s of snaps ?? []) {
    if (String(s.area) !== "blog_tab") continue;
    if (String(s.status) === "unknown") continue; // 측정 실패는 '순위 없음'과 다르다
    measured.add(String(s.article_id));
    const r = s.rank == null ? null : Number(s.rank);
    const prev = best.get(String(s.article_id));
    if (prev === undefined) best.set(String(s.article_id), r);
    else if (r != null && (prev == null || r < prev)) best.set(String(s.article_id), r);
  }

  const 잰글 = [...measured];
  const rank의 = (id: string) => best.get(id) ?? null;
  const 상위10 = 잰글.filter((id) => (rank의(id) ?? 99) <= 10).length;
  const 상위30 = 잰글.filter((id) => { const r = rank의(id); return r != null && r > 10 && r <= 30; }).length;
  const 순위밖 = 잰글.filter((id) => rank의(id) == null).length;
  const 미측정 = rows.length - 잰글.length;

  const 진입률 = 잰글.length ? Math.round((상위10 / 잰글.length) * 100) : null;

  // ★판정 — 숫자가 충분할 때만 한다. 표본 10편 밑에서는 비율이 아무 뜻이 없다.
  const 판정 = 잰글.length < 10
    ? `아직 판정 못 한다 — 순위를 잰 글이 ${잰글.length}편뿐이다(10편 이상 필요). 발행 확인을 해두면 D+1부터 자동으로 쌓인다.`
    : (진입률 ?? 0) >= 40
      ? `★(가) 순위는 들고 있다 — 잰 글의 ${진입률}%가 블로그탭 10위 안이다. 글이 문제가 아니라 '키워드가 작다'는 뜻이다. 처방은 같은 실력으로 더 큰 키워드를 잡는 것(밴드 한 칸 위)이지, 글을 더 열심히 쓰는 게 아니다.`
      : (진입률 ?? 0) >= 15
        ? `중간이다 — 10위 안 ${진입률}%. 되는 글과 안 되는 글이 갈린다. 상위 10위 글들이 어떤 소스·밴드에서 왔는지 보고 그쪽으로 배합을 옮길 근거가 된다.`
        : `★(나) 순위에 못 들고 있다 — 10위 안이 ${진입률}%뿐이다. 이 상태에서 키워드를 키우면 더 나빠진다(7/31 사고가 그것: 신생이 헤드로 나가 노출 0/5). 밴드를 낮춰 이길 수 있는 자리부터 먹고 지수를 올리는 게 먼저다.`;

  return NextResponse.json({
    기간: `${days}일`,
    발행: rows.length,
    순위잰글: 잰글.length,
    분포: { "블로그탭 10위 안": 상위10, "11~30위": 상위30, "순위 밖": 순위밖, "아직 안 잼": 미측정 },
    "10위 진입률": 진입률 == null ? null : `${진입률}%`,
    판정,
    // ★이긴 글은 그대로 교본이다 — 무엇을 더 하면 되는지가 여기 있다
    이긴글: 잰글.filter((id) => (rank의(id) ?? 99) <= 10)
      .map((id) => ({ 키워드: rows.find((r) => String(r.article_id) === id)?.keyword ?? "", 최고순위: rank의(id) }))
      .sort((a, b) => (a.최고순위 ?? 99) - (b.최고순위 ?? 99)).slice(0, 15),
  });
}
