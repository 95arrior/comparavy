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

    return NextResponse.json({ enabled: true, winners, losers, watching, minSample: PERF_MIN_SAMPLE, revenue30, inflow30 });
  } catch (e) {
    console.error("[perf] 요약 실패:", e instanceof Error ? e.message : e);
    return NextResponse.json({ enabled: true, winners: [], losers: [], watching: [], minSample: PERF_MIN_SAMPLE, revenue30: 0, inflow30: 0 });
  }
}
