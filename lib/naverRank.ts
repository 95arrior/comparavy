// ★순위 추적(FF_PERF_LOOP) — 2단 구성(승인 스펙):
//  1차 = 공식 블로그 검색 API(안정, blog_total과 같은 자격증명)에서 내 글의 블로그탭 순위
//  2차 = 모바일 통합검색 HTML에서 내 글 URL 존재 여부(베스트 에포트 — 실패는 unknown, 크론을 죽이지 않는다)
//  네이버 URL 정규화: blog.naver.com/{id}/{postNo} 형태로 비교(m.blog·PostView 변형 흡수).

const BLOG_EP = "https://openapi.naver.com/v1/search/blog.json";

/** blog.naver.com URL → "블로그id/글번호" 정규화 키. 실패 시 null */
export function naverPostKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)blog\.naver\.com$/.test(u.hostname)) return null;
    // /PostView.naver?blogId=x&logNo=y 형태
    const blogId = u.searchParams.get("blogId");
    const logNo = u.searchParams.get("logNo");
    if (blogId && logNo) return `${blogId}/${logNo}`.toLowerCase();
    // /{blogId}/{logNo} 형태
    const m = /^\/([A-Za-z0-9_-]+)\/(\d+)/.exec(u.pathname);
    if (m) return `${m[1]}/${m[2]}`.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

export interface RankResult {
  area: "blog_tab" | "integrated" | "ai_brief";
  rank: number | null;
  status: "ok" | "not_found" | "unknown";
}

/** 공식 블로그 검색 API — 키워드 결과 상위 30 중 내 글의 순위(1-base). */
export async function fetchBlogTabRank(keyword: string, postUrl: string): Promise<RankResult> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const myKey = naverPostKey(postUrl);
  if (!id || !secret || !keyword.trim() || !myKey) return { area: "blog_tab", rank: null, status: "unknown" };
  try {
    const res = await fetch(`${BLOG_EP}?query=${encodeURIComponent(keyword.trim())}&display=30&sort=sim`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { area: "blog_tab", rank: null, status: "unknown" };
    const data = (await res.json()) as { items?: { link?: string }[] };
    const items = data.items ?? [];
    for (let i = 0; i < items.length; i++) {
      if (naverPostKey(items[i]?.link) === myKey) return { area: "blog_tab", rank: i + 1, status: "ok" };
    }
    return { area: "blog_tab", rank: null, status: "not_found" };
  } catch {
    return { area: "blog_tab", rank: null, status: "unknown" };
  }
}

// ★AI 브리핑 인용 판정(2026-07-17 실측 — m.search.naver.com HTML: 블록 마커 'fender_renderer-ai_briefing',
//  인용 출처가 m.blog.naver.com/{id}/{글번호} URL로 블록 안에 존재. 블록 경계=다음 fender_renderer- 섹션).
//  rank 의미(이 area 한정): 1=브리핑에 내 글 인용, 0=브리핑은 떴지만 미인용, null=이 검색어엔 브리핑 없음.
export function aiBriefCitation(html: string, myKey: string): RankResult {
  const start = html.indexOf("fender_renderer-ai_briefing");
  if (start < 0) return { area: "ai_brief", rank: null, status: "not_found" };
  const next = html.indexOf('data-meta-ssuid-extra="fender_renderer-', start + 100);
  const block = html.slice(start, next > 0 ? next : start + 200_000).toLowerCase();
  const cited = block.includes(myKey.toLowerCase());
  return { area: "ai_brief", rank: cited ? 1 : 0, status: cited ? "ok" : "not_found" };
}

/** 모바일 통합검색 1회 요청으로 [통합 노출, AI 브리핑 인용]을 함께 측정. 베스트 에포트 — 실패는 둘 다 unknown. */
export async function fetchIntegratedAreas(keyword: string, postUrl: string): Promise<[RankResult, RankResult]> {
  const myKey = naverPostKey(postUrl);
  const unknown: [RankResult, RankResult] = [
    { area: "integrated", rank: null, status: "unknown" },
    { area: "ai_brief", rank: null, status: "unknown" },
  ];
  if (!myKey || !keyword.trim()) return unknown;
  const [blogId, logNo] = myKey.split("/");
  try {
    const res = await fetch(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword.trim())}`, {
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return unknown;
    const html = await res.text();
    const found = html.includes(`${blogId}/${logNo}`) || (html.includes(blogId!) && html.includes(String(logNo)));
    return [
      { area: "integrated", rank: found ? 1 : null, status: found ? "ok" : "not_found" },
      aiBriefCitation(html, myKey),
    ];
  } catch {
    return unknown;
  }
}

/** 모바일 통합검색 — 내 글 URL 존재 여부만(구 시그니처 유지 — 내부는 fetchIntegratedAreas 공용). */
export async function fetchIntegratedPresence(keyword: string, postUrl: string): Promise<RankResult> {
  return (await fetchIntegratedAreas(keyword, postUrl))[0];
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
