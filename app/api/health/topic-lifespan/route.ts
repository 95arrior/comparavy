// ★글감 수명·천장 측정(2026-07-29 유저 지시: "로그만 먼저 찍어서 몇 % 걸리는지 측정").
//  차단은 하지 않는다 — 새 규칙을 지금 적용하면 글감 풀이 얼마나 얇아지는지 모르고 발행이 멈출 수 있다.
//  두 모집단을 각각 재서 '조이면 무엇이 사라지는지'를 숫자로 보여준다:
//   ①내가 이미 쓴 글(성과와 대조 가능) ②현재 글감 풀(앞으로 배정될 후보)
//  ?min=100 처럼 임계를 바꿔가며 호출해 분포를 보고 임계를 정한다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { scanLifespan, quantiles } from "@/lib/topicLifespan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tally(rows: { keyword: string; title: string; searches: number | null }[], min: number) {
  const counts: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  let flagged = 0;
  for (const r of rows) {
    const { reasons } = scanLifespan(r.keyword, r.title, r.searches, min);
    if (reasons.length === 0) continue;
    flagged++;
    for (const why of reasons) {
      counts[why] = (counts[why] ?? 0) + 1;
      (samples[why] ??= []).length < 5 && samples[why]!.push(r.keyword);
    }
  }
  return {
    전체: rows.length,
    걸림: flagged,
    비율: rows.length ? `${Math.round((flagged / rows.length) * 1000) / 10}%` : "-",
    사유별: counts,
    예시: samples,
  };
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const min = Math.max(0, parseInt(new URL(request.url).searchParams.get("min") || "0", 10) || 0);
  const db = createSupabaseAdminClient();

  // ① 내가 쓴 글 — 실제 성과와 대조할 수 있는 모집단
  const { data: arts } = await supabase
    .from("articles").select("keyword, title, created_at").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(300);
  const mine = (arts ?? []).map((a) => ({ keyword: String(a.keyword ?? ""), title: String(a.title ?? ""), searches: null }));

  // ② 현재 글감 풀 — 앞으로 배정될 후보(조이면 여기서 얼마가 빠지는지가 핵심)
  //  ★표본 편향 수정(2026-07-29 1차 측정 실패): 정렬 없이 limit로 뽑으면 물리적 순서 1000행만 보게 돼
  //   '200회 이상 0개' 같은 거짓 결론이 나온다(실제로 WP 글감 선정은 monthly_searches>=300을 요구하며 매일 돈다).
  //   → 표본 대신 '구간별 정확 카운트'(count only)로 전수 집계한다.
  const { data: prof } = await supabase.from("blog_profiles").select("vertical, sub_category, topic").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const sub = String(prof?.sub_category ?? prof?.topic ?? "");
  const scope = <T>(q: T): T => {
    let qq = q as unknown as { eq: (c: string, v: unknown) => unknown };
    if (prof?.vertical) qq = qq.eq("vertical", prof.vertical) as typeof qq;
    if (sub) qq = qq.eq("sub", sub) as typeof qq;
    return qq as unknown as T;
  };
  const countIn = async (lo: number, hi: number | null): Promise<number> => {
    let q = scope(db.from("keyword_pool").select("id", { count: "exact", head: true })).gte("monthly_searches", lo);
    if (hi !== null) q = q.lt("monthly_searches", hi);
    const { count } = await q;
    return count ?? 0;
  };
  const { count: poolTotal } = await scope(db.from("keyword_pool").select("id", { count: "exact", head: true }));
  const edges: [number, number | null][] = [[0, 50], [50, 100], [100, 200], [200, 300], [300, 500], [500, 1000], [1000, 5000], [5000, null]];
  const buckets: Record<string, number> = {};
  for (const [lo, hi] of edges) buckets[hi === null ? `${lo}회_이상` : `${lo}~${hi - 1}회`] = await countIn(lo, hi);
  const total = poolTotal ?? 0;
  const ceilingCuts: Record<string, string> = {};
  let acc = 0;
  for (const [lo, hi] of edges) {
    if (hi === null) break;
    acc += buckets[`${lo}~${hi - 1}회`] ?? 0;
    ceilingCuts[`${hi}회_미만_제외시`] = `${acc}개 (${total ? Math.round((acc / total) * 1000) / 10 : 0}%) 제외 · ${total - acc}개 남음`;
  }
  // 지역·시효 판정은 표본으로 충분(풀 키워드는 짧은 명사구라 분포가 균질) — 상위 1500개만
  const { data: poolRows } = await scope(db.from("keyword_pool").select("keyword, monthly_searches")).order("monthly_searches", { ascending: false }).limit(1500);
  const pool = (poolRows ?? []).map((p) => ({ keyword: String(p.keyword ?? ""), title: "", searches: typeof p.monthly_searches === "number" ? p.monthly_searches : null }));
  const dist = quantiles(pool.map((p) => p.searches).filter((x): x is number => x !== null));

  // ③ 트렌드 글감(뉴스 증식 경로) — 지역·시효 글감은 keyword_pool이 아니라 여기서 온다(1차 측정에서 확인)
  const { data: trendRows } = await db.from("trend_topics").select("keyword, title").limit(1000);
  const trend = (trendRows ?? []).map((t) => ({ keyword: String(t.keyword ?? ""), title: String(t.title ?? ""), searches: null }));

  return NextResponse.json({
    안내: "측정 전용 — 지금은 아무것도 차단하지 않습니다. ?min=100 처럼 임계를 바꿔 호출하세요.",
    임계_적용값: min || "미적용(검색량 판정 생략)",
    "①내가_쓴_글": tally(mine, 0), // 글엔 검색량이 없어 지역·시효만 판정
    "②현재_글감_풀(상위1500 표본)": tally(pool, min),
    "③트렌드_글감(뉴스경로)": tally(trend, 0),
    "글감_풀_전체개수": total,
    "글감_풀_검색량_구간별_전수": buckets,
    "표본_상위1500_분위수": dist ?? "검색량 데이터 없음",
    "천장_임계별_제외량": ceilingCuts,
  });
}
