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

/** 카테고리의 살아있는 트렌드 글감을 읽는다(만료 제외). */
export async function getTrendTopics(category: string): Promise<TrendTopic[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("trend_topics")
      .select("keyword, title, news_context, longtails, expires_at")
      .eq("category", category)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40);
    return (data ?? []).map((r) => ({ keyword: r.keyword, title: r.title, newsContext: r.news_context, longtails: Array.isArray(r.longtails) ? (r.longtails as Longtail[]) : [] }));
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
- keyword=실제 검색어(2~5어절), title=클릭할 블로그 제목.
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
      const kw = (it.keyword ?? "").trim().slice(0, 60);
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
      const acs = await fetchNaverAutocomplete(row.keyword).catch(() => []);
      // 씨앗과 무관한 잡음 제거: 씨앗의 핵심 토큰을 포함하는 롱테일만
      const core = row.keyword.split(/\s+/)[0];
      const cand = acs.filter((a) => a.includes(core) || a.length >= 6).slice(0, 8);
      ltTotal += cand.length;
      const longtails: Longtail[] = [];
      for (let i = 0; i < cand.length; i++) {
        let bt: number | null = null;
        if (i < GAP_PER_SEED && gapUsed < GAP_BUDGET) { bt = await fetchBlogTotal(cand[i]).catch(() => null); gapUsed += 1; }
        longtails.push({ kw: cand[i], blogTotal: bt });
      }
      // gap 낮은 것(선점 가능) 우선 정렬 — null(미검사)은 뒤로
      longtails.sort((a, b) => (a.blogTotal ?? 1e9) - (b.blogTotal ?? 1e9));
      (row as typeof row & { longtails?: Longtail[] }).longtails = longtails;
    }
    console.log(`[trend] ${category}: seeds=${rows.length}, autocomplete=${ltTotal}, gapChecks=${gapUsed}/${GAP_BUDGET}`);

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
    // 이 카테고리의 만료분 정리 후 새로 upsert
    try { await admin.from("trend_topics").delete().eq("category", category).lt("expires_at", new Date().toISOString()); } catch { /* ignore */ }
    await admin.from("trend_topics").upsert(rows, { onConflict: "category,keyword" });
    return rows.length;
  } catch {
    return 0;
  }
}
