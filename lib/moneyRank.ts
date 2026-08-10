// ★머니 랭킹(2026-08-11) — 네이버 뉴스 '많이 본 뉴스' 랭킹에서 돈 되는 소재만 추린다.
//
//  유저 지시: "돈·지원금·주식·대출 등 이런 분류의 랭킹뉴스를 가져와야" — 랭킹 상위 = 대중 관심 실증.
//  ★단, 대형 랭킹 뉴스를 검색 키워드로 그대로 심으면 언론이 점령한 SERP에서 죽는다(부동산 공급대책 3일 6회 실측).
//   그래서 소재마다 두 각을 갈라 낸다:
//    - 검색각: 실행형 꼬리 키워드('이곳' 클릭베이트는 실명을 밝혀서 — 의령군 사례) + 문서수 게이트
//    - 붐빔(게이트 초과)이어도 버리지 않고 보여준다 — 대중 관심 소재는 홈판각 후보다(8/12 홈판 편입 예정).
//  결핍 레이더(lackRadar)는 화면에서 내려감(2026-08-11 유저 지시) — 코드는 남긴다.

import Anthropic from "@anthropic-ai/sdk";
import { fetchBlogTotalDetailed } from "./naverBlogSearch";
import { isUnsafeKeyword } from "./keywordSafety";
import { DOC_HARD_MAX } from "./topicScore";
import { logUsage } from "./usageLog";

const RANK_URL = "https://news.naver.com/main/ranking/popularDay.naver";

/** 네이버 뉴스 랭킹 페이지 크롤 — EUC-KR. 실패 시 빈 배열(호출측이 사유 표시). */
export async function harvestRankingNews(): Promise<string[]> {
  try {
    const res = await fetch(RANK_URL, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } });
    if (!res.ok) return [];
    const html = new TextDecoder("euc-kr").decode(await res.arrayBuffer());
    const titles: string[] = [];
    const seen = new Set<string>();
    for (const m of html.matchAll(/class="list_title[^>]*>([^<]+)</g)) {
      const t = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").trim();
      if (t.length < 8 || t.length > 90) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(t);
      if (titles.length >= 80) break;
    }
    return titles;
  } catch { return []; }
}

export interface MoneyRankItem {
  issue: string;    // 뉴스 소재(사람이 알아보는 짧은 요약)
  keyword: string;  // 검색 베팅 키워드(실행형 꼬리)
  cat: string;      // 지원금·주식·대출·부동산·세금·생활비·앱테크
  docs: number | null;
  verdict: "direct" | "crowded" | "written" | "blocked" | "unmeasured";
  reason?: string;
  newsTitle: string; // 원 뉴스 제목 — 생성 시 newsContext 재료
}

/** 랭킹 제목 더미 → 돈 소재 분류·검색 꼬리 생성(haiku 1회). */
export async function condenseRanking(titles: string[], userId?: string | null): Promise<Omit<MoneyRankItem, "docs" | "verdict" | "reason">[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || titles.length === 0) return [];
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: [
        "아래는 지금 네이버 '많이 본 뉴스' 랭킹 제목이다. 경제·재테크 블로그의 글감으로 쓸 '돈 되는 소재'만 골라라.",
        "분류(cat): 지원금 | 주식 | 대출 | 부동산 | 세금 | 생활비 | 앱테크 — 이 7개에 안 들어가면 버려라.",
        "★규칙:",
        "- 정치 공방·사건사고·연예·스포츠는 돈 얘기가 스쳐도 버려라.",
        "- 각 소재마다 kw = 그 뉴스를 본 사람이 다음에 검색할 '실행형 꼬리 키워드'(2~5어절)를 만들어라.",
        "  예: '청년 140만명 50만원 적립' 뉴스 → kw '청년도약계좌 가입 조건' (일반명사 하나로 뭉개지 말 것).",
        "- 제목이 '이곳·이것·~한 곳'으로 이름을 숨겼으면, 제목의 다른 단서로 실명을 알 때만 실명으로 kw를 만들어라. 모르면 그 소재는 버려라(지어내기 금지).",
        "- issue = 사람이 알아보는 소재 한 줄(15자 내), newsTitle = 원 제목 그대로.",
        '출력 JSON 배열만: [{"issue":"청년도약계좌 140만 돌파","kw":"청년도약계좌 가입 조건","cat":"지원금","newsTitle":"..."}]. 최대 10개, 돈 파괴력 큰 순.',
        "",
        ...titles.map((t) => `- ${t}`),
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "money_rank", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\[[\s\S]*\]/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as { issue?: string; kw?: string; cat?: string; newsTitle?: string }[];
    return arr
      .map((x) => ({ issue: String(x.issue ?? "").trim().slice(0, 30), keyword: String(x.kw ?? "").trim().slice(0, 40), cat: String(x.cat ?? "").trim().slice(0, 10), newsTitle: String(x.newsTitle ?? "").trim().slice(0, 120) }))
      .filter((x) => x.keyword.length >= 2 && x.issue.length >= 2)
      .slice(0, 10);
  } catch { return []; }
}

/** 판정 — 검색각은 문서수 게이트, 초과는 '붐빔'(홈판각 후보)으로 남겨 보여준다(버리지 않는 게 이 레인의 핵심). */
export async function judgeMoneyRank(
  cands: Omit<MoneyRankItem, "docs" | "verdict" | "reason">[],
  opts: { written: Set<string>; normalize: (k: string) => string; allowFinanceBrand: boolean },
): Promise<MoneyRankItem[]> {
  const items: MoneyRankItem[] = [];
  let backedOff = false;
  for (const c of cands) {
    if (opts.written.has(opts.normalize(c.keyword))) { items.push({ ...c, docs: null, verdict: "written", reason: "이미 심은 키워드" }); continue; }
    if (isUnsafeKeyword(c.keyword, { allowFinanceBrand: opts.allowFinanceBrand })) { items.push({ ...c, docs: null, verdict: "blocked", reason: "업체명·가십 차단" }); continue; }
    if (backedOff) { items.push({ ...c, docs: null, verdict: "unmeasured" }); continue; }
    const r = await fetchBlogTotalDetailed(c.keyword);
    if (r.status === 429) backedOff = true;
    if (r.total == null) items.push({ ...c, docs: null, verdict: "unmeasured", reason: r.reason ?? undefined });
    else if (r.total === 0) items.push({ ...c, docs: 0, verdict: "unmeasured", reason: "글 0편 — 실존 의심" });
    else if (r.total < DOC_HARD_MAX) items.push({ ...c, docs: r.total, verdict: "direct" });
    else items.push({ ...c, docs: r.total, verdict: "crowded" });
    await new Promise((r2) => setTimeout(r2, 120));
  }
  const rank: Record<MoneyRankItem["verdict"], number> = { direct: 0, crowded: 1, written: 2, unmeasured: 3, blocked: 4 };
  items.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.docs ?? Infinity) - (b.docs ?? Infinity));
  return items;
}
