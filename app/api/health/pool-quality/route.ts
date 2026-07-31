// ★풀 품질 분포 계측(2026-08-01) — "200% 믿을 수 있는 것으로 꽉 채운다"의 문턱을 감이 아니라 숫자로 정하려고 만든다.
//  배경: '쉬운 검색 키워드' 칩이 문서 2~3만 건짜리에도 붙고 있었다. 풀 쿼리가 blog_total 미측정(null)을 통과시키고,
//  나중에 측정된 값이 커도 버리지 않고 별점만 낮추기 때문이다(route.ts의 or(blog_total.is.null,...)).
//  조이는 건 쉬운데, 너무 조이면 보드가 빈다. 그래서 조이기 전에 '조이면 몇 장 남는지'를 먼저 센다.
//  차단·변경은 하지 않는다. 읽기 전용 계측이다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient, hasSupabaseEnv } from "@/lib/supabase-server";
import { TIER_BANDS } from "@/lib/scoreWeights";
import { fetchBlogTotal } from "@/lib/naverBlogSearch";
import { fetchSerpOpenness, isOpenBoard } from "@/lib/serpOpenness";

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

  // ★표본 측정(?measure=N) — "재보면 진짜 쉬운 게 몇 개나 있나"를 알아야 문턱을 정한다.
  //  읽기 전용 원칙은 유지한다(DB에 쓰지 않는다). 네이버 쿼터를 아끼려 기본 0, 명시할 때만 잰다.
  const measureN = Math.max(0, Math.min(60, Number(url.searchParams.get("measure") ?? 0)));
  let 표본 = null as null | { 잰수: number; 분포: Record<string, number>; 가장낮은5: { keyword: string; blog_total: number }[] };
  if (measureN > 0) {
    const targets = inBand.filter((r) => r.blog_total == null).slice(0, measureN);
    const got: { keyword: string; blog_total: number }[] = [];
    for (const t of targets) {
      const n = await fetchBlogTotal(String(t.keyword));
      if (n != null) got.push({ keyword: String(t.keyword), blog_total: n });
    }
    표본 = {
      잰수: got.length,
      분포: {
        "1천 미만": got.filter((g) => g.blog_total < 1_000).length,
        "1천~3천": got.filter((g) => g.blog_total >= 1_000 && g.blog_total < 3_000).length,
        "3천~1만": got.filter((g) => g.blog_total >= 3_000 && g.blog_total < 10_000).length,
        "1만~3만": got.filter((g) => g.blog_total >= 10_000 && g.blog_total < 30_000).length,
        "3만 이상": got.filter((g) => g.blog_total >= 30_000).length,
      },
      가장낮은5: got.sort((a, b) => a.blog_total - b.blog_total).slice(0, 5),
    };
  }

  // ★문턱 보정(2026-08-01) — "문서 1,000건 미만"은 근거 없는 숫자였고 표본 40개 중 0개가 통과했다.
  //  진짜 기준은 '우리가 실제로 이긴 난이도'다. ?calibrate=이긴키워드|진키워드 로 양쪽 문서수를 재서
  //  경계를 찾는다. 이 경계는 추측이 아니라 우리 블로그의 실적에서 나온 값이다.
  const calib = url.searchParams.get("calibrate");
  let 보정: Record<string, unknown> | null = null;
  if (calib) {
    const [wonRaw = "", lostRaw = ""] = calib.split("|");
    const meas = async (list: string) => {
      const out: { k: string; t: number | null }[] = [];
      for (const k of list.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20)) out.push({ k, t: await fetchBlogTotal(k) });
      return out;
    };
    const 이김 = await meas(wonRaw);
    const 짐 = await meas(lostRaw);
    // ★SERP 개방도도 같이 잰다 — 문서수로 안 갈린 걸 이게 가르는지 검증한다.
    const openOf = async (list: string) => {
      const out: { k: string; share: number | null; note: string | null; open: boolean }[] = [];
      for (const k of list.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20)) {
        const o = await fetchSerpOpenness(k);
        out.push({ k, share: o ? Math.round(o.share * 100) / 100 : null, note: o ? `상위${o.sample} 공식${o.official}` : null, open: isOpenBoard(o) });
      }
      return out;
    };
    const 개방_이김 = await openOf(wonRaw);
    const 개방_짐 = await openOf(lostRaw);
    const wonOpen = 개방_이김.filter((x) => x.share != null).map((x) => x.share!);
    const lostOpen = 개방_짐.filter((x) => x.share != null).map((x) => x.share!);
    const minWonOpen = wonOpen.length ? Math.min(...wonOpen) : null;
    const maxLostOpen = lostOpen.length ? Math.max(...lostOpen) : null;
    const wonVals = 이김.map((x) => x.t).filter((n): n is number => n != null);
    const lostVals = 짐.map((x) => x.t).filter((n): n is number => n != null);
    // 이긴 것 중 가장 어려웠던 값 = 우리가 감당해 본 상한. 진 것 중 가장 쉬웠던 값보다 낮으면 깨끗이 갈린다.
    const maxWon = wonVals.length ? Math.max(...wonVals) : null;
    const minLost = lostVals.length ? Math.min(...lostVals) : null;
    보정 = {
      SERP개방도: {
        이김: 개방_이김, 짐: 개방_짐,
        판정: minWonOpen == null || maxLostOpen == null ? "표본 부족"
          : minWonOpen > maxLostOpen
          ? `★깨끗이 갈림 — 이긴 판 최저 개방도 ${minWonOpen} > 진 판 최고 ${maxLostOpen}. 이 축이 승패를 가른다.`
          : `겹침 — 이긴 최저 ${minWonOpen} vs 진 최고 ${maxLostOpen}. 이 축만으로도 부족하다.`,
      },
      이김, 짐,
      제안문턱: maxWon,
      근거: maxWon == null ? "이긴 키워드 측정 실패"
        : minLost != null && minLost <= maxWon
        ? `겹침 있음 — 이긴 최대 ${maxWon.toLocaleString()} vs 진 최소 ${minLost.toLocaleString()}. 문서수만으로는 완전히 안 갈린다(다른 축 필요).`
        : `깨끗이 갈림 — 이긴 최대 ${maxWon.toLocaleString()} < 진 최소 ${(minLost ?? 0).toLocaleString()}. 이 사이를 문턱으로 쓸 수 있다.`,
    };
  }

  return NextResponse.json({
    문턱보정: 보정,
    문서수측정: {
      가능한가: 측정가능,
      시험키워드: probeWord,
      결과: probe,
      해석: 측정가능
        ? "네이버 검색 API가 응답합니다 — 미측정분을 채울 수 있습니다."
        : "네이버 검색 API가 응답하지 않습니다. 개발자센터 앱에 '검색' API가 추가돼 있어야 합니다(자격증명은 DataLab과 동일). 이게 없으면 '쉬운 키워드'라고 말할 근거 자체를 만들 수 없습니다.",
    },
    표본측정: 표본,
    기준: { vertical, sub, 밴드: `월 ${band.volMin}~${band.volMax} 검색`, 문서수상한_현재: band.blogTotalMax },
    풀크기: { 전체: all.length, 밴드안: inBand.length },
    밴드안_문서수분포: bucket(inBand),
    밴드안_광고경쟁분포: compDist(inBand),
    문서수_상한별_생존: survivors,
    참고: "측정된것만 = blog_total이 실제로 측정된 키워드 중 상한 미만. 미측정포함 = null도 통과시킨 현재 방식.",
  });
}
