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
import { fetchKeywordStats } from "@/lib/naverKeyword";
import { RANK_CHECK_DAYS } from "@/lib/scoreWeights";

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

  // ★★1위라고 이기는 게 아니다(2026-08-06 실측이 이 검사를 만들었다).
  //  이긴 글 4편의 월 검색량이 50 · 0 · 40 · 0이었다. 1위를 해도 유입이 0인 말이다.
  //  ★진입률만 보고 "(가) 순위는 든다 → 키워드를 키우자"로 가면 절반만 맞는 진단이다.
  //   실제로는 '이겼는데 상품이 없는' 상태라, 고칠 곳은 글이 아니라 글감을 고르는 자리다.
  const winners = 잰글.filter((id) => (rank의(id) ?? 99) <= 10)
    .map((id) => ({ id, keyword: String(rows.find((r) => String(r.article_id) === id)?.keyword ?? ""), rank: rank의(id) }))
    .filter((w) => w.keyword);
  let 이긴글수요: { 합계: number; 중앙값: number | null; 하루기대: number } | null = null;
  try {
    const st = await fetchKeywordStats(winners.map((w) => w.keyword));
    // ★KeywordStat에는 total이 없다 — pc + mobile이다(2026-08-07 실측 버그).
    //  `.total ?? 0`으로 읽으면 전부 0이 되고, 진단이 늘 "상품 없음"이라고 답한다.
    //  ★없는 필드를 ?? 0으로 받으면 조회 실패와 '수요 0'이 같은 값이 된다 — 제일 위험한 형태다.
    const vols = winners.map((w) => {
      const v = st.get(w.keyword) ?? st.get(w.keyword.replace(/\s+/g, ""));
      return v ? Number(v.pc ?? 0) + Number(v.mobile ?? 0) : null;
    });
    const known = vols.filter((v): v is number => v != null);
    if (known.length) {
      const sorted = [...known].sort((a, b) => a - b);
      const 합계 = known.reduce((a, b) => a + b, 0);
      이긴글수요 = {
        합계,
        중앙값: sorted[Math.floor(sorted.length / 2)] ?? null,
        // 1위 클릭률을 넉넉히 30%로 잡아도 하루에 몇 명인지 — 이 숫자가 곧 천장이다
        하루기대: Math.round((합계 * 0.3) / 30),
      };
    }
    winners.forEach((w, i) => { (w as { vol?: number | null }).vol = vols[i] ?? null; });
  } catch { /* 검색량 조회 실패는 진단을 막지 않는다 */ }

  // ★판정 — 숫자가 충분할 때만 한다. 표본 10편 밑에서는 비율이 아무 뜻이 없다.
  // ★이긴 글의 수요가 바닥이면, 진입률이 아무리 높아도 그건 '이긴 것'이 아니다.
  const 상품없음 = 이긴글수요 != null && 이긴글수요.하루기대 < 20;
  const 판정 = 상품없음
    ? `★진짜 병목은 순위가 아니라 글감이다. 10위 안 ${진입률}%로 순위는 이기고 있는데, 이긴 키워드들의 월 검색량 합이 ${이긴글수요!.합계}회(중앙값 ${이긴글수요!.중앙값}회)뿐이다 — 1위를 다 해도 하루 ${이긴글수요!.하루기대}명이 천장이다. 글을 더 잘 쓰는 걸로는 이 숫자가 안 바뀐다. 검색량 하한을 실제로 거는 게 먼저다(지금은 '못 쟀으면 통과'라 0회짜리가 새어 들어온다).`
    : 잰글.length < 10
    ? `아직 판정 못 한다 — 순위를 잰 글이 ${잰글.length}편뿐이다(10편 이상 필요). 발행 확인을 해두면 D+1부터 자동으로 쌓인다.`
    : (진입률 ?? 0) >= 40
      ? `★(가) 순위는 들고 있다 — 잰 글의 ${진입률}%가 블로그탭 10위 안이다. 글이 문제가 아니라 '키워드가 작다'는 뜻이다. 처방은 같은 실력으로 더 큰 키워드를 잡는 것(밴드 한 칸 위)이지, 글을 더 열심히 쓰는 게 아니다.`
      : (진입률 ?? 0) >= 15
        ? `중간이다 — 10위 안 ${진입률}%. 되는 글과 안 되는 글이 갈린다. 상위 10위 글들이 어떤 소스·밴드에서 왔는지 보고 그쪽으로 배합을 옮길 근거가 된다.`
        : `★(나) 순위에 못 들고 있다 — 10위 안이 ${진입률}%뿐이다. 이 상태에서 키워드를 키우면 더 나빠진다(7/31 사고가 그것: 신생이 헤드로 나가 노출 0/5). 밴드를 낮춰 이길 수 있는 자리부터 먹고 지수를 올리는 게 먼저다.`;

  // ★'아직 안 잼'이 90편이면 그 자체가 제일 큰 결함이다 — 왜인지 답해야 한다.
  //  rank-track은 발행 15일 이내 글만 본다. 그 창을 넘기면 영영 안 재진다.
  const now = Date.now();
  const 미측정사유 = { "창 밖(15일 초과) — 영영 안 잼": 0, "아직 D+1 전": 0, "주소 없음": 0, "잴 차례인데 안 됨": 0 };
  for (const r of rows) {
    const id = String(r.article_id);
    if (measured.has(id)) continue;
    const age = (now - new Date(String(r.published_at)).getTime()) / 86400_000;
    if (!r.keyword) { 미측정사유["주소 없음"] += 1; continue; }
    if (age > 15) 미측정사유["창 밖(15일 초과) — 영영 안 잼"] += 1;
    else if (age < RANK_CHECK_DAYS[0]) 미측정사유["아직 D+1 전"] += 1;
    else 미측정사유["잴 차례인데 안 됨"] += 1;
  }

  return NextResponse.json({
    기간: `${days}일`,
    발행: rows.length,
    순위잰글: 잰글.length,
    분포: { "블로그탭 10위 안": 상위10, "11~30위": 상위30, "순위 밖": 순위밖, "아직 안 잼": 미측정 },
    "10위 진입률": 진입률 == null ? null : `${진입률}%`,
    미측정사유,
    이긴글수요,
    판정,
    // ★이긴 글은 그대로 교본이다 — 무엇을 더 하면 되는지가 여기 있다
    이긴글: winners.map((w) => ({ 키워드: w.keyword, 최고순위: w.rank, 월검색량: (w as { vol?: number | null }).vol ?? null }))
      .sort((a, b) => (a.최고순위 ?? 99) - (b.최고순위 ?? 99)).slice(0, 15),
  });
}
