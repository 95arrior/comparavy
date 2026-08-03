import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { FF } from "@/config/featureFlags";
import { PERF_MIN_SAMPLE, RANK_WIN } from "@/lib/scoreWeights";

// ★성과 요약(FF_PERF_LOOP §1-4 대시보드) — "이긴 패턴 / 진 패턴" 두 리스트와 표본 수만.
//  통계적 과신 유도 금지: 표본 수 항상 병기, 표본 미달은 '지켜보는 중'으로만.
export async function GET() {
  if (!FF.perfLoop) return NextResponse.json({ enabled: false });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = createSupabaseAdminClient();

  const HOOK_NAMES: Record<string, string> = { loss: "손실 회피", number: "숫자 구체", target: "대상 지목", twist: "반전", confession: "경험 고백", deadline: "마감 시의", question: "질문", compare: "비교 대조", quote: "인용구" };
  const SRC_NAMES: Record<string, string> = { news: "뉴스", season: "시즌 캘린더", discover: "검색 발굴", applyhome: "청약홈 공고", gov24: "보조금24 공고", bizinfo: "기업마당 공고", pool: "꾸준한 수요 풀", announce: "공고" };

  try {
    const { data: snaps } = await admin.from("rank_snapshots").select("article_id, rank, status").eq("day_offset", 7).eq("area", "blog_tab").limit(4000);
    const winBy = new Map<string, boolean>();
    for (const s of snaps ?? []) { if (s.status !== "unknown") winBy.set(String(s.article_id), s.rank != null && s.rank <= RANK_WIN.blogTabTop); }
    const { data: posts } = winBy.size
      ? await admin.from("post_performance").select("article_id, species, seed_source, hook_type").in("article_id", [...winBy.keys()]).limit(4000)
      : { data: [] as { article_id: string; species: string | null; seed_source: string | null; hook_type: string | null }[] };
    const agg = new Map<string, { label: string; win: number; total: number }>();
    for (const p of posts ?? []) {
      const w = winBy.get(String(p.article_id));
      if (w === undefined) continue;
      const keys: [string, string][] = [];
      if (p.seed_source) keys.push([`src:${p.seed_source}`, `씨앗: ${SRC_NAMES[p.seed_source] ?? p.seed_source}`]);
      if (p.hook_type) keys.push([`hook:${p.hook_type}`, `훅: ${HOOK_NAMES[p.hook_type] ?? p.hook_type}${p.species === "evergreen" ? " (꾸준)" : ""}`]);
      for (const [k, label] of keys) {
        const a = agg.get(k) ?? { label, win: 0, total: 0 };
        a.total += 1; if (w) a.win += 1; agg.set(k, a);
      }
    }
    const rows = [...agg.values()].map((a) => ({ label: a.label, sample: a.total, rate: a.total ? Math.round((a.win / a.total) * 100) : 0, mature: a.total >= PERF_MIN_SAMPLE }));
    const winners = rows.filter((r) => r.mature && r.rate >= 50).sort((a, b) => b.rate - a.rate).slice(0, 6);
    const losers = rows.filter((r) => r.mature && r.rate < 30).sort((a, b) => a.rate - b.rate).slice(0, 6);
    const watching = rows.filter((r) => !r.mature).sort((a, b) => b.sample - a.sample).slice(0, 6);

    // 최근 30일 수익·유입(임포트분) — 전체 합만(글별 귀속은 애드포스트가 제공하지 않음)
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: rev } = await admin.from("revenue_daily").select("revenue_krw").eq("user_id", user.id).gte("date", since);
    const { data: inf } = await admin.from("inflow_keywords").select("inflow").eq("user_id", user.id).gte("date", since);
    const revenue30 = (rev ?? []).reduce((s, r) => s + Number(r.revenue_krw ?? 0), 0);
    const inflow30 = (inf ?? []).reduce((s, r) => s + Number(r.inflow ?? 0), 0);

    // ★연료론 계측(2026-08-03 유저 확정 — 홈피드 전략 문서 반영).
    //  주장: 홈판은 그 글의 조회가 목적이 아니라, 그 트래픽으로 블로그 지수를 올려
    //  '검색 글'의 순위를 끌어올리는 연료다. 유저 결정으로 이 프레임을 전제로 삼는다.
    //  ★다만 이건 업계 통설이지 우리 실측이 아니다. 전제로 쓰되 틀렸을 때 알 수 있어야 한다 —
    //   그래서 같은 화면에 반증 지표를 붙인다: 검색 글 각각에 대해 '발행 직전 14일간 홈판 편수'를 세고,
    //   홈판 0편 구간과 1편 이상 구간의 D+7 승률을 비교한다. 연료론이 맞다면 뒤가 높아야 한다.
    //  ★표본이 적을 땐 판정하지 않는다(승률 차이는 표본 10개 밑에서 아무 뜻이 없다).
    const 연료 = await (async () => {
      try {
        const { data: all } = await admin.from("post_performance")
          .select("article_id, species, published_at").eq("user_id", user.id).limit(4000);
        const rows = (all ?? []).filter((r) => r.published_at);
        const homeDays = rows.filter((r) => r.species === "homefeed").map((r) => new Date(String(r.published_at)).getTime());
        const search = rows.filter((r) => r.species === "evergreen");
        const WINDOW = 14 * 86400_000;
        const bucket = { 없음: { win: 0, total: 0 }, 있음: { win: 0, total: 0 } };
        for (const a of search) {
          const w = winBy.get(String(a.article_id));
          if (w === undefined) continue; // 아직 D+7 스냅샷이 없는 글은 세지 않는다
          const t = new Date(String(a.published_at)).getTime();
          const priorHome = homeDays.filter((h) => h < t && t - h <= WINDOW).length;
          const b = priorHome > 0 ? bucket.있음 : bucket.없음;
          b.total += 1; if (w) b.win += 1;
        }
        const rate = (b: { win: number; total: number }) => (b.total ? Math.round((b.win / b.total) * 100) : null);
        const 충분 = bucket.없음.total >= PERF_MIN_SAMPLE && bucket.있음.total >= PERF_MIN_SAMPLE;
        return {
          설명: "검색 글이 '발행 직전 14일 안에 홈판 글이 있었는지'로 갈라 D+7 승률을 비교한다. 연료론이 맞다면 '홈판 있음'이 높아야 한다.",
          홈판없이_발행: { 표본: bucket.없음.total, 승률: rate(bucket.없음) },
          홈판이후_발행: { 표본: bucket.있음.total, 승률: rate(bucket.있음) },
          판정: !충분
            ? `표본 부족 — 지켜보는 중(각 구간 ${PERF_MIN_SAMPLE}편 이상 필요)`
            : (rate(bucket.있음) ?? 0) > (rate(bucket.없음) ?? 0)
            ? `★연료론 지지 — 홈판 이후 발행분이 ${(rate(bucket.있음) ?? 0) - (rate(bucket.없음) ?? 0)}%p 높다`
            : `★연료론 반증 — 홈판 이후가 더 높지 않다. 홈판 배합(현재 신생 40%)을 재검토할 근거다`,
        };
      } catch { return null; } // 계측 실패는 대시보드를 막지 않는다
    })();

    return NextResponse.json({ enabled: true, winners, losers, watching, minSample: PERF_MIN_SAMPLE, revenue30, inflow30, 연료 });
  } catch (e) {
    console.error("[perf] 요약 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ enabled: true, winners: [], losers: [], watching: [], minSample: PERF_MIN_SAMPLE, revenue30: 0, inflow30: 0 });
  }
}
