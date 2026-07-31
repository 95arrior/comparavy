// ★풀 품질 분포 계측(2026-08-01) — "200% 믿을 수 있는 것으로 꽉 채운다"의 문턱을 감이 아니라 숫자로 정하려고 만든다.
//  배경: '쉬운 검색 키워드' 칩이 문서 2~3만 건짜리에도 붙고 있었다. 풀 쿼리가 blog_total 미측정(null)을 통과시키고,
//  나중에 측정된 값이 커도 버리지 않고 별점만 낮추기 때문이다(route.ts의 or(blog_total.is.null,...)).
//  조이는 건 쉬운데, 너무 조이면 보드가 빈다. 그래서 조이기 전에 '조이면 몇 장 남는지'를 먼저 센다.
//  차단·변경은 하지 않는다. 읽기 전용 계측이다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { TIER_BANDS } from "@/lib/scoreWeights";
import { fetchBlogTotal } from "@/lib/naverBlogSearch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "no env" }, { status: 500 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const db = createSupabaseAdminClient();
  const { data: prof } = await supabase.from("blog_profiles").select("vertical, sub_category").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const vertical = url.searchParams.get("vertical") ?? (prof as { vertical?: string } | null)?.vertical ?? "online";
  const sub = url.searchParams.get("sub") ?? (prof as { sub_category?: string } | null)?.sub_category ?? null;
  const band = TIER_BANDS.SEEDLING;

  let q = db.from("keyword_pool").select("keyword, monthly_searches, blog_total, competition").eq("vertical", vertical);
  if (sub) q = q.eq("sub", sub);
  const { data: rows } = await q.limit(5000);
  const all = rows ?? [];

  const inBand = all.filter((r) => {
    const v = Number(r.monthly_searches ?? 0);
    return v >= band.volMin && v <= band.volMax;
  });

  // 문서수(blog_total) 구간별 — 이게 '진짜 쉬운가'를 가르는 축이다.
  const bucket = (rs: typeof all) => ({
    미측정: rs.filter((r) => r.blog_total == null).length,
    "1천 미만": rs.filter((r) => r.blog_total != null && r.blog_total < 1_000).length,
    "1천~3천": rs.filter((r) => r.blog_total != null && r.blog_total >= 1_000 && r.blog_total < 3_000).length,
    "3천~1만": rs.filter((r) => r.blog_total != null && r.blog_total >= 3_000 && r.blog_total < 10_000).length,
    "1만~3만": rs.filter((r) => r.blog_total != null && r.blog_total >= 10_000 && r.blog_total < 30_000).length,
    "3만 이상": rs.filter((r) => r.blog_total != null && r.blog_total >= 30_000).length,
  });

  const compDist = (rs: typeof all) => rs.reduce<Record<string, number>>((m, r) => {
    const k = String(r.competition ?? "(없음)");
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});

  // ★핵심 질문: 문서수 상한을 어디로 잡으면 몇 장이 남는가(하루 4장이 필요하다)
  const survivors = [500, 1_000, 2_000, 3_000, 5_000, 10_000].map((cap) => ({
    문서수상한: cap,
    측정된것만: inBand.filter((r) => r.blog_total != null && r.blog_total < cap).length,
    미측정포함: inBand.filter((r) => r.blog_total == null || r.blog_total < cap).length,
  }));

  // ★근본 원인 진단: 문서수가 97.5% 미측정인 게 '아직 안 쟀다'인지 'API 권한이 없어 못 잰다'인지 가른다.
  //  fetchBlogTotal은 권한 없음·쿼터초과를 전부 null로 삼켜서(폴백 설계) 바깥에선 구분이 안 된다.
  const probeWord = inBand.find((r) => r.blog_total == null)?.keyword ?? "정기예금";
  const probe = await fetchBlogTotal(probeWord);
  const 측정가능 = probe != null;

  return NextResponse.json({
    문서수측정: {
      가능한가: 측정가능,
      시험키워드: probeWord,
      결과: probe,
      해석: 측정가능
        ? "네이버 검색 API가 응답합니다 — 미측정분을 채울 수 있습니다."
        : "네이버 검색 API가 응답하지 않습니다. 개발자센터 앱에 '검색' API가 추가돼 있어야 합니다(자격증명은 DataLab과 동일). 이게 없으면 '쉬운 키워드'라고 말할 근거 자체를 만들 수 없습니다.",
    },
    기준: { vertical, sub, 밴드: `월 ${band.volMin}~${band.volMax} 검색`, 문서수상한_현재: band.blogTotalMax },
    풀크기: { 전체: all.length, 밴드안: inBand.length },
    밴드안_문서수분포: bucket(inBand),
    밴드안_광고경쟁분포: compDist(inBand),
    문서수_상한별_생존: survivors,
    참고: "측정된것만 = blog_total이 실제로 측정된 키워드 중 상한 미만. 미측정포함 = null도 통과시킨 현재 방식.",
  });
}
