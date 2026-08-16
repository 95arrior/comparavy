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
import { fetchKeywordStats } from "@/lib/naverKeyword";

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

  // ★계측이 거짓말을 하고 있었다(2026-08-03 유저 실측에서 검거).
  //  종전엔 `.limit(5000)`으로 행을 통째로 끌어와 메모리에서 세었다. 그런데 PostgREST는 db.max_rows(기본 1,000)에서
  //  잘라 준다 — 응답의 `전체: 1000`이 그 상한의 지문이다. 게다가 `.order()`가 없어 어떤 1,000행이 올지도 정해지지 않는다.
  //  그래서 "밴드안 0"이 나왔다. 풀에 밴드 키워드가 없어서가 아니라, 잘린 조각에 안 들어 있었을 뿐이다.
  //  ★숫자를 세는 일은 DB에 시킨다 — count 쿼리는 상한이 없다. 행을 끌어오는 건 '예시가 필요할 때'로만 남긴다.
  const baseCount = () => {
    let q = db.from("keyword_pool").select("keyword", { count: "exact", head: true }).eq("vertical", vertical);
    if (sub) q = q.eq("sub", sub);
    return q;
  };
  type CountQ = ReturnType<typeof baseCount>;
  const countOf = async (narrow?: (q: CountQ) => CountQ): Promise<number> => {
    const q = narrow ? narrow(baseCount()) : baseCount();
    const { count, error } = await q;
    return error ? -1 : (count ?? 0); // -1 = 쿼리 실패(0과 구분한다 — 0은 사실이고 -1은 모른다는 뜻)
  };
  const inBandQ = (q: CountQ) => q.gte("monthly_searches", band.volMin).lte("monthly_searches", band.volMax);

  const [n버티컬전체, n서브전체, n밴드안] = await Promise.all([
    (async () => { const { count } = await db.from("keyword_pool").select("keyword", { count: "exact", head: true }).eq("vertical", vertical); return count ?? 0; })(),
    countOf(),
    countOf(inBandQ),
  ]);

  // 예시·표본용 행(계측용 아님) — 정렬을 박아 매번 같은 조각이 오게 한다(종전엔 무정렬이라 재현이 안 됐다).
  let sq = db.from("keyword_pool").select("keyword, monthly_searches, blog_total, competition").eq("vertical", vertical)
    .gte("monthly_searches", band.volMin).lte("monthly_searches", band.volMax);
  if (sub) sq = sq.eq("sub", sub);
  const { data: sampleRows } = await sq.order("monthly_searches", { ascending: false }).limit(1000);
  const inBand = sampleRows ?? [];

  // 문서수(blog_total) 구간별 — 이게 '진짜 쉬운가'를 가르는 축이다. 전부 count 쿼리(행 상한 무관).
  const 문서수분포 = Object.fromEntries(await Promise.all(([
    ["미측정", (q: CountQ) => inBandQ(q).is("blog_total", null)],
    ["1천 미만", (q: CountQ) => inBandQ(q).not("blog_total", "is", null).lt("blog_total", 1_000)],
    ["1천~3천", (q: CountQ) => inBandQ(q).gte("blog_total", 1_000).lt("blog_total", 3_000)],
    ["3천~1만", (q: CountQ) => inBandQ(q).gte("blog_total", 3_000).lt("blog_total", 10_000)],
    ["1만~3만", (q: CountQ) => inBandQ(q).gte("blog_total", 10_000).lt("blog_total", 30_000)],
    ["3만 이상", (q: CountQ) => inBandQ(q).gte("blog_total", 30_000)],
  ] as [string, (q: CountQ) => CountQ][]).map(async ([k, f]) => [k, await countOf(f)] as const)));

  const 광고경쟁분포 = Object.fromEntries(await Promise.all(
    ["low", "mid", "high"].map(async (c) => [c, await countOf((q) => inBandQ(q).eq("competition", c))] as const)
      .concat([(async () => ["(없음)", await countOf((q) => inBandQ(q).is("competition", null))] as const)()]),
  ));

  // ★핵심 질문: 문서수 상한을 어디로 잡으면 몇 장이 남는가(하루 4장이 필요하다)
  const survivors = await Promise.all([500, 1_000, 2_000, 3_000, 5_000, 10_000].map(async (cap) => ({
    문서수상한: cap,
    측정된것만: await countOf((q) => inBandQ(q).not("blog_total", "is", null).lt("blog_total", cap)),
    미측정포함: await countOf((q) => inBandQ(q).or(`blog_total.is.null,blog_total.lt.${cap}`)),
  })));

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

  // ★수요 실측(?demand=키워드,키워드) — 유저 우선순위(2026-08-01): "홈판이랑 뜨는 것만 진짜 수요가 높으면 된다".
  //  지금 '지금 뜨는' 열은 vol:0으로 나가고 있어 수요가 검증된 카드가 하나도 없다. 실제로 얼마인지 먼저 잰다.
  const demandQ = url.searchParams.get("demand");
  let 수요 = null as null | { keyword: string; monthly: number | null }[];
  if (demandQ) {
    const words = demandQ.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
    const stats = await fetchKeywordStats(words);
    수요 = words.map((w) => {
      const st = stats.get(w.replace(/\s+/g, "").toLowerCase()) ?? stats.get(w);
      return { keyword: w, monthly: st ? st.mobile + st.pc : null };
    });
  }

  // ★밴드 누수 실측(2026-08-03 유저 화면에서 검거) — 신생 보드에 문서수 29,407·40,867·42,140·49,280짜리가 섰다.
  //  topics의 fetchPool은 `or(blog_total.is.null,blog_total.lt.1000)`으로 그것들을 막게 돼 있다. 둘 다 참일 수 없다.
  //  그래서 그 쿼리를 글자 그대로 재현해 돌리고, 돌아온 행 중 상한을 넘긴 게 있는지 센다.
  //  ★위반행 > 0 이면 필터가 코드의 가정대로 동작하지 않는 것이고, 0이면 그 카드들은 이 경로로 온 게 아니다.
  //   어느 쪽이든 다음에 팔 곳이 하나로 정해진다 — 추측이 끝난다.
  const cap = band.blogTotalMax;
  let leakQ = db.from("keyword_pool").select("keyword, monthly_searches, blog_total").eq("vertical", vertical)
    .gte("monthly_searches", band.volMin).lte("monthly_searches", band.volMax);
  if (sub) leakQ = leakQ.eq("sub", sub);
  if (cap != null) leakQ = leakQ.or(`blog_total.is.null,blog_total.lt.${cap}`);
  const { data: leakRows, error: leakErr } = await leakQ
    .order("times_assigned", { ascending: true }).order("monthly_searches", { ascending: false }).limit(150);
  const 위반 = (leakRows ?? []).filter((r) => r.blog_total != null && cap != null && r.blog_total >= cap);

  // ★화면에 실제로 선 카드의 저장값을 직접 조회한다 — 서브·버티컬 조건을 빼고 키워드로만 찾는다.
  //  이 카드들이 어떤 sub/vertical에 매달려 있는지가 곧 '어느 경로로 들어왔나'의 답이다.
  const 실물목록 = (url.searchParams.get("rows") ?? "패시브인컴,신불자대출,금융공기업 채용,무담보사채")
    .split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
  const { data: 실물행 } = await db.from("keyword_pool")
    .select("keyword, vertical, sub, monthly_searches, blog_total, competition, times_assigned")
    .in("keyword", 실물목록);

  // ★sub 라벨이 두 경로에서 다르게 읽혔다(topics diag는 '재테크', 여기는 '경제·재테크').
  //  같은 blog_profiles.sub_category를 같은 방식으로 읽는데 값이 다르면, 활성 프로필이 하나가 아니라는 뜻이다.
  //  CLAUDE.md 상태 원칙(블로그 단위 격리)이 걸린 자리라 조용히 넘기지 않고 전부 펼쳐 보여 준다.
  const { data: 프로필들 } = await supabase.from("blog_profiles")
    .select("id, vertical, sub_category, is_active").eq("user_id", user.id);

  return NextResponse.json({
    수요실측: 수요,
    문턱보정: 보정,
    "★밴드누수": {
      재현한필터: `vertical=${vertical}${sub ? ` & sub=${sub}` : ""} & 검색량 ${band.volMin}~${band.volMax} & or(blog_total.is.null, blog_total.lt.${cap})`,
      돌아온행: leakRows?.length ?? 0,
      위반행: 위반.length,
      예시: 위반.slice(0, 8).map((r) => ({ keyword: r.keyword, 검색량: r.monthly_searches, 문서수: r.blog_total })),
      오류: leakErr?.message ?? null,
      해석: leakErr ? "쿼리 자체가 실패했다 — topics도 같은 필터를 쓰므로 폴백 경로를 확인해야 한다."
        : 위반.length > 0 ? "★필터가 새고 있다 — 상한을 넘긴 행이 그대로 돌아왔다. 막는 쪽(route.ts:419)이 범인이다."
        : "이 경로는 깨끗하다 — 화면의 고문서수 카드는 fetchPool이 아닌 다른 경로로 들어왔다.",
    },
    "★화면카드_저장값": 실물행 ?? [],
    "★프로필": { 전체: 프로필들 ?? [], 활성수: (프로필들 ?? []).filter((p) => (p as { is_active?: boolean }).is_active).length, 이번요청이본sub: sub },
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
    풀크기: { vertical전체: n버티컬전체, sub전체: n서브전체, 밴드안: n밴드안, 예시표본: inBand.length },
    밴드안_문서수분포: 문서수분포,
    밴드안_광고경쟁분포: 광고경쟁분포,
    문서수_상한별_생존: survivors,
    참고: "★모든 숫자는 count 쿼리(행 상한 없음). 측정된것만 = blog_total이 실제로 측정된 키워드 중 상한 미만. 미측정포함 = null도 통과시킨 현재 방식. '예시표본'만 1,000행 상한이 걸리며 계측에는 쓰지 않는다.",
  });
}
