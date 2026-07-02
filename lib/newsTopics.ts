import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "./supabase-server";
import { isUnsafeKeyword } from "./keywordSafety";
import { logUsage } from "./usageLog";

// ★오늘 이슈 글감 — 네이버 뉴스 API(검색 권한)로 주제 최신 헤드라인을 읽고,
//  AI가 '사람들이 곧 검색할 질문형 글감' 1개를 추출한다. 신규 이슈 = 경쟁 0에 가까운 선점 구간.
//  법적 안전: 가십 필터(isUnsafeKeyword) + 연예·사건사고 제외 지시. 주제(sub)별 1일 캐시.

export interface IssueTopic {
  keyword: string;      // 검색어형 (예: "청년도약계좌 조건 변경")
  title: string;        // 글 제목형
  newsContext: string;  // 생성 프롬프트 주입용 근거 자료(헤드라인+요약+언론사)
}

interface NewsItem { title: string; description: string; press: string }

async function fetchNews(query: string): Promise<NewsItem[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return [];
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=8&sort=date`,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string; description?: string; originallink?: string; link?: string }[] };
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
    return (data.items ?? []).map((it) => ({
      title: strip(it.title ?? ""),
      description: strip(it.description ?? ""),
      press: (() => { try { return new URL(it.originallink || it.link || "").hostname.replace(/^www\./, ""); } catch { return ""; } })(),
    })).filter((n) => n.title);
  } catch { return []; }
}

/** 주제(sub)의 오늘 이슈 글감 1개. 없으면 null. KST 일 단위 캐시. */
export async function todayIssueTopic(sub: string): Promise<IssueTopic | null> {
  const admin = createSupabaseAdminClient();
  const kstDay = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const cacheKey = `issue_topic:${kstDay}:${sub}`;
  try {
    const { data } = await admin.from("api_cache").select("value").eq("key", cacheKey).single();
    if (data?.value) return (data.value as { topic: IssueTopic | null }).topic;
  } catch { /* 캐시 미스 */ }

  const news = await fetchNews(sub);
  let topic: IssueTopic | null = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (news.length >= 3 && apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const list = news.map((n, i) => `${i + 1}. [${n.press}] ${n.title} — ${n.description.slice(0, 120)}`).join("\n");
      const res = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `아래는 '${sub}' 주제의 오늘 네이버 뉴스다. 일반인이 '곧 검색해볼 실용 질문' 하나를 골라 블로그 글감으로 만들어라.

${list}

규칙:
- 연예인·유명인·사건사고·정치공방·루머·부고는 절대 제외. 생활에 실익 있는 정보성 이슈만(제도·금리·정책·출시·변경 등).
- 적합한 이슈가 없으면 {"none":true} 만 출력.
- keyword는 사람들이 칠 검색어(2~5어절), title은 클릭할 글 제목.
- 출력은 JSON만: {"keyword":"...","title":"...","newsIdx":[근거가 된 뉴스 번호들]}`,
        }],
      });
      void logUsage({ model: "claude-haiku-4-5", kind: "issue_topic", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
      const text = res.content[0]?.type === "text" ? res.content[0].text : "";
      const m = /\{[\s\S]*\}/.exec(text);
      if (m) {
        const parsed = JSON.parse(m[0]) as { none?: boolean; keyword?: string; title?: string; newsIdx?: number[] };
        if (!parsed.none && parsed.keyword && parsed.title && !isUnsafeKeyword(parsed.keyword) && !isUnsafeKeyword(parsed.title)) {
          const used = (parsed.newsIdx ?? []).map((i) => news[i - 1]).filter(Boolean);
          const ctx = (used.length ? used : news.slice(0, 4))
            .map((n) => `- [${n.press}] ${n.title}: ${n.description.slice(0, 160)}`)
            .join("\n");
          topic = { keyword: parsed.keyword.trim().slice(0, 60), title: parsed.title.trim().slice(0, 80), newsContext: ctx };
        }
      }
    } catch { /* 추출 실패 → 이슈 없음 */ }
  }

  try {
    await admin.from("api_cache").upsert({
      key: cacheKey,
      value: { topic },
      expires_at: new Date(Date.now() + 26 * 3600_000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch { /* 캐시 실패 무시 */ }
  return topic;
}
