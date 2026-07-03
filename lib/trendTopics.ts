import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "./supabase-server";
import { gatherHeadlines } from "./trendSources";
import { fetchNaverAutocomplete } from "./naverAutocomplete";
import { fetchBlogTotal } from "./naverBlogSearch";
import { fetchTrend } from "./naverDatalab";
import { isUnsafeKeyword } from "./keywordSafety";
import { logUsage } from "./usageLog";

// ★실시간 트렌드 글감 — 카테고리 단위로 '그날 그시간' 트렌드를 종합해 공유 풀에 저장.
//  소스: 네이버 뉴스(분야별·실시간) + Anthropic 웹검색(열린 웹 전체). AI가 다양한 검색형 글감으로 합성.
//  스케일: 유저 무관(카테고리당 1회) → 1만·100만 명 동일 비용. 유저는 이 풀에서 시드 회전으로 다른 조각을 봄.

export interface Longtail { kw: string; blogTotal: number | null }
export interface TrendTopic {
  keyword: string;
  title: string;
  newsContext: string | null;
  longtails: Longtail[]; // 자동완성 실검증 롱테일(실익 키워드). 검색자가 실제로 치는 것.
}

const FRESH_MS = 6 * 3600_000; // 6시간 신선도

// ★헤드라인/합성 키워드 → 검색형 명사구 정규화(구조적). 조사·서술어·분석/논평어 제거, 2~3어절.
//  검색창에 칠 법한 형태로 강제 → 자동완성이 걸리는 씨앗만 남게 하는 전제.
const ANALYSIS_TAIL = /\s*(효과\s*분석|영향\s*분석|정책\s*변화|효과|분석|전망|현황|동향|방안|변화|영향|정책|이슈|논란|대책|정리|총정리|비교)\s*$/;
export function compressToSearchKeyword(raw: string): string {
  let s = (raw || "").trim().slice(0, 60);
  // 분석/논평 꼬리를 반복 제거(예: "지원금 효과 분석" → "지원금")
  for (let i = 0; i < 3 && ANALYSIS_TAIL.test(s); i++) s = s.replace(ANALYSIS_TAIL, "").trim();
  // 끝 조사 제거
  s = s.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|께|한|할)\s*$/g, "").trim();
  // 2~3어절 명사구로
  const toks = s.split(/\s+/).filter(Boolean).slice(0, 3);
  return toks.join(" ").trim();
}

/** 카테고리의 살아있는 트렌드 글감을 읽는다(만료 제외). */
export async function getTrendTopics(category: string): Promise<TrendTopic[]> {
  try {
    const admin = createSupabaseAdminClient();
    const run = (cols: string) => admin
      .from("trend_topics")
      .select(cols)
      .eq("category", category)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40);
    // longtails 컬럼(0049) 유무에 무관하게 작동 — 있으면 쓰고, 없으면(마이그레이션 전) 컬럼 빼고 재조회.
    type Row = { keyword: string; title: string; news_context: string | null; longtails?: unknown };
    const first = await run("keyword, title, news_context, longtails, expires_at");
    const rows = (first.error ? (await run("keyword, title, news_context, expires_at")).data : first.data) as Row[] | null;
    return (rows ?? []).map((r) => ({ keyword: r.keyword, title: r.title, newsContext: r.news_context, longtails: Array.isArray(r.longtails) ? (r.longtails as Longtail[]) : [] }));
  } catch {
    return [];
  }
}

/** 카테고리에 신선한 트렌드가 있는지(있으면 갱신 스킵). */
export async function hasFreshTrends(category: string): Promise<boolean> {
  const t = await getTrendTopics(category);
  return t.length >= 8;
}

/** 카테고리 트렌드 갱신 — 뉴스+웹검색 종합 → AI 합성 → 풀 저장. 크론에서만 호출. */
export async function refreshCategoryTrends(category: string): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 0;

  // ★다중 소스 — 네이버+구글 뉴스를 다양한 소주제로 수집(은행권 편향 제거)
  const heads = await gatherHeadlines(category).catch(() => []);
  const newsList = heads.slice(0, 20).map((n, i) => `${i + 1}. (${n.seed}) ${n.title} — ${n.description.slice(0, 90)}`).join("\n");

  const kstDate = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const client = new Anthropic({ apiKey });

  const prompt = `오늘은 ${kstDate}(한국)이다. '${category}' 분야에서 지금 한국 사람들이 검색할 만한 '트렌디한 정보성 블로그 글감' 16개를 뽑아라.

[아래는 오늘 수집한 뉴스 헤드라인이다. 이걸 근거로 '지금 뜨는' 글감을 만들어라.]
${newsList || "(뉴스 수집 실패 — 분야 상식으로 다양하게 만들어라)"}

규칙:
- 그날의 신선함이 최우선. 오래된·뻔한 주제(예: 은행 금리 비교만 반복)는 피하고 분야 전체에 걸쳐 다양하게 흩어라.
- 검색하는 사람이 실익을 얻는 정보성만. 연예인·유명인·사건사고·정치공방·부고·루머·자극적 가십은 절대 제외.
- ★keyword = 사람이 네이버 검색창에 실제로 칠 2~3어절 '명사구'다. 조사·서술어를 붙이지 말고, '분석·전망·현황·동향·효과·변화·영향·정책·방안·이슈' 같은 논평/분석어를 넣지 마라. (나쁜 예: "소상공인 지원금 효과 분석", "부동산 규제 정책 변화" → 좋은 예: "소상공인 지원금", "부동산 규제")
- title=클릭할 블로그 제목.
- 16개가 서로 다른 소주제여야 한다(중복·유사 금지).
- 반드시 JSON 배열로만 답(다른 말 금지): [{"keyword":"...","title":"..."}]`;

  let text = "";
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    void logUsage({ model: "claude-haiku-4-5", kind: "trend_refresh", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
    text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  } catch {
    return 0;
  }

  try {
    const m = /\[[\s\S]*\]/.exec(text);
    if (!m) return 0;
    const parsed = JSON.parse(m[0]) as { keyword?: string; title?: string }[];

    // 근거 컨텍스트(뉴스) — 생성 시 최신성 주입용
    const ctx = heads.slice(0, 6).map((n) => `- [${n.press || n.seed}] ${n.title}: ${n.description.slice(0, 130)}`).join("\n") || null;

    const seen = new Set<string>();
    const rows = [];
    const expires = new Date(Date.now() + FRESH_MS).toISOString();
    for (const it of parsed) {
      const kw = compressToSearchKeyword((it.keyword ?? "").trim()); // ★검색형 명사구로 정규화(조사·분석/논평어 제거)
      const ti = (it.title ?? "").trim().slice(0, 80);
      if (!kw || !ti || seen.has(kw)) continue;
      if (isUnsafeKeyword(kw) || isUnsafeKeyword(ti)) continue;
      if (/20(1[0-9]|2[0-3])/.test(kw) || /20(1[0-9]|2[0-3])/.test(ti)) continue; // 낡은 연도
      seen.add(kw);
      rows.push({ category, keyword: kw, title: ti, news_context: ctx, longtails: [] as Longtail[], created_at: new Date().toISOString(), expires_at: expires });
    }
    if (rows.length === 0) return 0;

    // ★B단계: 씨앗별 자동완성 롱테일(실검증) + gap(예산). 자동완성은 비공식·무제한(무료), gap(fetchBlogTotal)만 쿼터 소비.
    //  예산 계산: 30 카테고리 × GAP_BUDGET(60)/refresh × 4 refresh/day = 7,200/day (네이버 검색 API 25,000/일 한도의 약 29%).
    //  예산 초과 시 롱테일 gap은 미검사(blogTotal=null)로 두고 씨앗 gap을 상속(폴백).
    const GAP_BUDGET = 60;       // 이 카테고리 1회 갱신당 gap 콜 상한
    const GAP_PER_SEED = 3;      // 씨앗당 gap 검사할 롱테일 수(검색량 상위)
    let gapUsed = 0;
    let ltTotal = 0;
    for (const row of rows) {
      // 씨앗이 이미 검색형 명사구(정규화됨) → 그대로 + 1어절 축약 순으로 자동완성 질의.
      const core = row.keyword.split(/\s+/)[0];
      const queries = [row.keyword, row.keyword.split(/\s+/).slice(0, 2).join(" "), core].filter((q, i, a) => q && a.indexOf(q) === i);
      let acs: string[] = [];
      for (const q of queries) { acs = await fetchNaverAutocomplete(q).catch(() => []); if (acs.length > 0) break; }
      const cand = acs.filter((a) => a.includes(core) || a.length >= 6).slice(0, 8);
      ltTotal += cand.length;
      const longtails: Longtail[] = [];
      for (let i = 0; i < cand.length; i++) {
        let bt: number | null = null;
        if (i < GAP_PER_SEED && gapUsed < GAP_BUDGET) { bt = await fetchBlogTotal(cand[i]).catch(() => null); gapUsed += 1; }
        longtails.push({ kw: cand[i], blogTotal: bt });
      }
      longtails.sort((a, b) => (a.blogTotal ?? 1e9) - (b.blogTotal ?? 1e9));
      (row as typeof row & { longtails?: Longtail[] }).longtails = longtails;
    }
    // ★하드 게이트 — 자동완성 롱테일이 0개인 씨앗(=아무도 안 치는 뉴스 문구)은 풀에서 제외.
    const gated = rows.filter((r) => ((r as { longtails?: Longtail[] }).longtails?.length ?? 0) > 0);
    console.log(`[trend] ${category}: seeds=${rows.length}→gated=${gated.length}, autocomplete=${ltTotal}, gapChecks=${gapUsed}/${GAP_BUDGET}`);
    if (gated.length === 0) return 0; // 게이트 통과 0개면 기존 풀 유지(전멸 방지 — 삭제 안 함)
    rows.length = 0; rows.push(...gated);

    // ★데이터랩 급상승 랭킹 — 합성 키워드의 실제 검색 momentum으로 정렬(지금 뜨는 게 위로).
    //  데이터랩 그룹 한도 5개 → 배치로 조회. 실패해도 순서만 원본 유지(치명적 아님).
    try {
      const rising = new Map<string, number>();
      for (let i = 0; i < rows.length; i += 5) {
        const batch = rows.slice(i, i + 5).map((r) => r.keyword);
        const tr = await fetchTrend(batch).catch(() => ({ items: [] as { keyword: string; rising: boolean; latest: number }[] }));
        for (const it of tr.items) rising.set(it.keyword, (it.rising ? 1000 : 0) + (it.latest ?? 0));
      }
      rows.sort((a, b) => (rising.get(b.keyword) ?? 0) - (rising.get(a.keyword) ?? 0));
    } catch { /* 랭킹 실패 — 원본 순서 유지 */ }

    const admin = createSupabaseAdminClient();
    // ★게이트 통과 씨앗이 있으니 이 카테고리 기존 행 전체 purge 후 새로 넣는다(뉴스 문구형 잔재 일괄 정리).
    try { await admin.from("trend_topics").delete().eq("category", category); } catch { /* ignore */ }
    await admin.from("trend_topics").upsert(rows, { onConflict: "category,keyword" });
    return rows.length;
  } catch {
    return 0;
  }
}
