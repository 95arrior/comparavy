// ★머니 랭킹(2026-08-11) — 네이버 뉴스 '많이 본 뉴스' 랭킹에서 돈 되는 소재만 추린다.
//
//  유저 지시: "돈·지원금·주식·대출 등 이런 분류의 랭킹뉴스를 가져와야" — 랭킹 상위 = 대중 관심 실증.
//  ★단, 대형 랭킹 뉴스를 검색 키워드로 그대로 심으면 언론이 점령한 SERP에서 죽는다(부동산 공급대책 3일 6회 실측).
//   그래서 소재마다 두 각을 갈라 낸다:
//    - 검색각: 실행형 꼬리 키워드('이곳' 클릭베이트는 실명을 밝혀서 — 의령군 사례) + 문서수 게이트
//    - 붐빔(게이트 초과)이어도 버리지 않고 보여준다 — 대중 관심 소재는 홈판각 후보다(8/12 홈판 편입 예정).
//  결핍 레이더(lackRadar)는 화면에서 내려감(2026-08-11 유저 지시) — 코드는 남긴다.

import Anthropic from "@anthropic-ai/sdk";
import { stripStaleYear, isEntertainmentTopic } from "./cardFinalGate";
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
  /** ★소재 근접 중복(2026-08-11 유저: "글 썼던 건 표기 좀, 중복으로 쓸까 봐 걱정") — 같은 소재의 기존 글 */
  similar?: { title: string; published: boolean };
  /** ★대형 스파이크 후보(2026-08-12 판정: 300 벽의 답은 니치 수십 편이 아니라 SK하이닉스급 대형 히트 재현) */
  big?: boolean;
}

// 근접 중복 판별용 실질 토큰 — 어느 소재에나 붙는 범용어는 겹침으로 안 센다
const GENERIC_TOKEN_RE = /^(조건|방법|일정|신청|확인|정리|이유|경우|지금|오늘|기준|대상|안내|총정리|변경|시작|마감|가입|추가|모집|20\d\d년?|올해)$/;
function coreTokens(s: string): Set<string> {
  return new Set(
    String(s ?? "").split(/[^가-힣a-zA-Z0-9]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => [...t].length >= 2 && !GENERIC_TOKEN_RE.test(t)),
  );
}

/**
 * ★소재 근접 중복 표기 — keyword_norm 정확 일치만 보면 표현만 다른 같은 소재를 놓친다
 *  (실측 우려: 어제 "하이닉스 용인공장 직원 주거"로 쓴 글이 오늘 "용인 반도체 주거 대책"으로 또 뜸).
 *  실질 토큰 2개 이상 겹치면 같은 소재로 보고, 기존 글의 발행 여부까지 실어 준다(막지 않고 알린다 — 판단은 유저).
 */
export function attachSimilar(items: MoneyRankItem[], articles: { keyword?: string | null; title?: string | null; status?: string | null }[], isPublished: (status: string) => boolean): void {
  const pool = articles.map((a) => ({
    tokens: coreTokens(`${a.keyword ?? ""} ${a.title ?? ""}`),
    title: String(a.title ?? a.keyword ?? "").slice(0, 40),
    published: isPublished(String(a.status ?? "")),
  })).filter((a) => a.tokens.size > 0);
  for (const it of items) {
    if (it.verdict === "written" || it.verdict === "blocked") continue;
    const mine = coreTokens(`${it.keyword} ${it.issue}`);
    let best: { title: string; published: boolean } | null = null;
    for (const a of pool) {
      let overlap = 0;
      for (const t of mine) if (a.tokens.has(t)) overlap += 1;
      if (overlap >= 2 && (!best || (a.published && !best.published))) best = { title: a.title, published: a.published };
    }
    if (best) it.similar = best;
  }
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
        "★주식 종목 소재는 두 유형만(2026-08-11 유저 확정 — 용인 글 실증): ①날짜 있는 사건(공모주 청약·무상증자·권리락·배당락·상장·자사주) ②생활 접점(공장·채용·주거·성과급). 시황·전망·목표주가·매수매도 각도는 만들지 마라 — 못 이기는 붐빔이고 투자권유는 법 리스크다('~주가 전망'·'~상한가 분석'류 kw 금지).",
        "- 각 소재마다 kw = 그 뉴스를 본 사람이 다음에 검색할 '실행형 꼬리 키워드'(2~5어절)를 만들어라.",
        "★소재의 핵심 고유명사(기업명·브랜드·제품명)는 kw에 반드시 유지하라(2026-08-11 유저: '삼성전자에 꽂혀 눌렀는데 제목에 없더라' — 이름에 끌려 고른 글감에서 이름이 빠지면 낚시가 된다). 예: '삼성전자 폴드8 증산' 소재 → kw '삼성전자 폴드8 수혜 부품주'(O), '반도체 수혜주'(X).",
        "  예: '청년 140만명 50만원 적립' 뉴스 → kw '청년도약계좌 가입 조건' (일반명사 하나로 뭉개지 말 것).",
        "- 제목이 '이곳·이것·~한 곳'으로 이름을 숨겼으면, 제목의 다른 단서로 실명을 알 때만 실명으로 kw를 만들어라. 모르면 그 소재는 버려라(지어내기 금지).",
        "- issue = 사람이 알아보는 소재 한 줄(15자 내), newsTitle = 원 제목 그대로.",
        "★big 판정(2026-08-12 확정 — 일 300 벽의 답은 대형 히트 재현): 전 국민이 아는 실명(대기업·유명 브랜드·전국 제도)이 낀 '사건'이면 big=true. 기준은 'SK하이닉스 1분 퇴근 10억 판결'급 — 검색 폭발이 예상되는 소재. 일반 니치 정보는 big=false.",
        '출력 JSON 배열만: [{"issue":"청년도약계좌 140만 돌파","kw":"청년도약계좌 가입 조건","cat":"지원금","big":false,"newsTitle":"..."}]. 최대 10개, 돈 파괴력 큰 순.',
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
    const arr = JSON.parse(m[0]) as { issue?: string; kw?: string; cat?: string; big?: boolean; newsTitle?: string }[];
    return arr
      .map((x) => ({ issue: stripStaleYear(String(x.issue ?? "").trim()).slice(0, 30), keyword: stripStaleYear(String(x.kw ?? "").trim()).slice(0, 40), cat: String(x.cat ?? "").trim().slice(0, 10), big: x.big === true, newsTitle: String(x.newsTitle ?? "").trim().slice(0, 120) }))
      .filter((x) => x.keyword.length >= 2 && x.issue.length >= 2)
      .filter((x) => !isEntertainmentTopic(`${x.issue} ${x.keyword} ${x.newsTitle}`)) // ★엔터 컷 공유(2026-08-17) — 랭킹 뉴스의 영화·흥행 소재 차단
      .slice(0, 10);
  } catch { return []; }
}

/**
 * ★빈틈 찾기(2026-08-11 유저: "붐빔인데 어떻게 빈틈을 비집고 들어갈까 빡세게 연구") — 붐빔 키워드의 꼬리 발굴.
 *  실측 3빈틈: ①시간(새 회차·날짜 꼬리는 텅 빔 — 민생지원금 48만→추석 2.4만→깊은 꼬리 수천)
 *  ②의도(지식iN 실질문 = 대중 수요의 구체 상황 — "갈아타기 후 해지") ③이름(일반명사 대신 실명·숫자).
 *  방법: 자동완성(사람들이 지금 붙여 치는 말) + 지식iN 최신 질문(진짜 다음 질문)을 그 자리에서 수확 →
 *  꼬리 후보 압축 → 문서수 실측 → 게이트 통과분만 돌려준다. 판단은 코드(문서수), 모델은 후보만.
 */
export async function findGapTails(headKeyword: string, userId?: string | null): Promise<{ keyword: string; hint: string }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const { fetchNaverAutocomplete } = await import("./naverAutocomplete");
  // ★머리 명사로 줄여 조회(2026-08-11 유저: "대부분 빈틈 각이 안 나온다") — 합성된 긴 키워드
  //  ("강남 2차 아파트 7억원 하락 급매 증가")를 자동완성에 넣으면 아무도 그렇게 안 쳐서 재료가 텅 빈다.
  //  사람들이 실제로 치는 건 앞 1~2어절이다 — 긴 원문과 짧은 머리 둘 다 조회해 재료를 합친다.
  const shortHead = headKeyword.split(/\s+/).slice(0, 2).join(" ");
  const kinFetch = async (q: string) => {
    const id = process.env.NAVER_DATALAB_CLIENT_ID, secret = process.env.NAVER_DATALAB_SECRET;
    if (!id || !secret) return [] as string[];
    try {
      const res = await fetch(`https://openapi.naver.com/v1/search/kin.json?query=${encodeURIComponent(q)}&sort=date&display=10`, {
        headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      });
      if (!res.ok) return [];
      const d = (await res.json()) as { items?: { title?: string }[] };
      return (d.items ?? []).map((i) => String(i.title ?? "").replace(/<[^>]+>/g, "").trim()).filter(Boolean);
    } catch { return []; }
  };
  const [autoFull, autoShort, kinShort] = await Promise.all([
    fetchNaverAutocomplete(headKeyword).catch(() => [] as string[]),
    shortHead !== headKeyword ? fetchNaverAutocomplete(shortHead).catch(() => [] as string[]) : Promise.resolve([] as string[]),
    kinFetch(shortHead),
  ]);
  const auto = Array.from(new Set([...autoFull, ...autoShort]));
  const kinRaw = kinShort;
  if (auto.length === 0 && kinRaw.length === 0) return [];
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        `대형 검색어 "${headKeyword}"는 블로그 글이 너무 많아 정면으로는 못 이긴다. 아래 실측 재료에서 '빈틈 꼬리 키워드' 4개를 골라라.`,
        "재료1 = 네이버 자동완성(사람들이 지금 붙여 치는 말):", ...auto.slice(0, 10).map((a) => `- ${a}`),
        "재료2 = 지식iN 최신 질문(진짜 다음 질문):", ...kinRaw.map((k) => `- ${k}`),
        "★규칙: 재료에 실제로 있는 말에서만 만들 것(지어내기 금지). 구체 상황·조건·날짜·대상이 붙은 꼬리 우선(신청기간·중도해지·대상 제외·지급일 같은).",
        `머리 명사("${headKeyword}"의 핵심어)는 유지하되 2~5어절 검색형으로. hint = 이 꼬리를 고른 근거 한 줄(10자 내).`,
        '출력 JSON 배열만: [{"k":"...","hint":"질문 몰림"}]',
      ].join("\n"),
    }],
  });
  void logUsage({ userId, model: "claude-haiku-4-5", kind: "money_rank_gap", inputTokens: res.usage?.input_tokens, outputTokens: res.usage?.output_tokens });
  const t = res.content.find((b) => b.type === "text");
  const m = /\[[\s\S]*\]/.exec(t && t.type === "text" ? t.text : "");
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]) as { k?: string; hint?: string }[];
    return arr
      .map((x) => ({ keyword: stripStaleYear(String(x.k ?? "").trim()).slice(0, 40), hint: String(x.hint ?? "").trim().slice(0, 16) }))
      .filter((x) => x.keyword.length >= 2)
      .slice(0, 4);
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
