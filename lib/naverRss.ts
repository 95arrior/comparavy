// ★네이버 RSS 발행 검증 — 제목 유사도 매칭 + 삭제 감지. 함정 2개 절대 준수:
//  (a) RSS엔 최근 글만 담긴다 → "RSS에 없음 = 삭제" 판정 금지. 삭제는 URL 조회로만.
//  (b) 네이버는 삭제글에도 200을 준다 → 본문의 삭제 안내 패턴으로만, 불확실하면 유지(보수).
// 조회 예의: 전용 User-Agent, 실패 백오프(verify_attempts), 유저당 RSS 1회/배치.
// 일일 조회량(1만 명 스케일): 발행 유저/일 1만 × RSS 1~6회 = 1만~6만 GET/일, 10분 배치 144회/일로 분산
//  = 배치당 70~420회(네이버 RSS는 정적 캐시 서빙이라 무리 없음). 삭제 스캔은 일 1회·최근 verified만.

const UA = "AtefloVerify/1.0 (+https://ateflo.com)";

export interface RssItem { title: string; link: string; pubDate: number }

/** 어떤 형태든 blogId 추출 — URL(https/m./PostList/postview 쿼리)·순수 id 전부. 실패 시 null. */
export function parseNaverBlogId(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const q = /blogId=([A-Za-z0-9_-]{2,30})/.exec(s);
  if (q) return q[1].toLowerCase();
  const m = /(?:https?:\/\/)?(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]{2,30})/i.exec(s);
  if (m) return m[1].toLowerCase();
  const rss = /rss\.blog\.naver\.com\/([A-Za-z0-9_-]{2,30})/i.exec(s);
  if (rss) return rss[1].replace(/\.xml$/i, "").toLowerCase();
  if (/^[A-Za-z0-9_-]{2,30}$/.test(s) && !/naver|http|www|blog/i.test(s)) return s.toLowerCase();
  return null;
}

export async function fetchBlogRss(blogId: string): Promise<RssItem[]> {
  const res = await fetch(`https://rss.blog.naver.com/${encodeURIComponent(blogId)}.xml`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < 30) {
    const b = m[1];
    const t = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(b)?.[1] ?? "";
    const l = /<link>([\s\S]*?)<\/link>/.exec(b)?.[1] ?? "";
    const p = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1] ?? "";
    const pd = Date.parse(p);
    if (t && l) items.push({ title: t.trim(), link: l.trim(), pubDate: Number.isNaN(pd) ? 0 : pd });
  }
  return items;
}

/** 제목 정규화 — 공백·문장부호·괄호류 제거, 소문자. */
export function normalizeTitle(s: string): string {
  return String(s ?? "").toLowerCase().replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[\s ]+/g, "").replace(/[.,!?~·…'"“”‘’()\[\]{}<>|/\\:;\-—_+*#%]/g, "");
}

/** bigram Dice 유사도(0~1) — 부분 수정·조사 차이에 관대, 다른 글엔 낮게. */
export function titleSimilarity(a: string, b: string): number {
  const x = normalizeTitle(a), y = normalizeTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const grams = (s: string) => { const g = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); g.set(k, (g.get(k) ?? 0) + 1); } return g; };
  const ga = grams(x), gb = grams(y);
  let inter = 0; for (const [k, v] of ga) inter += Math.min(v, gb.get(k) ?? 0);
  return (2 * inter) / (Math.max(1, x.length - 1) + Math.max(1, y.length - 1));
}

export const MATCH_THRESHOLD = 0.6;
/** RSS에서 발행 글 매칭 — 유사도 + pubDate 가중(발행 신고 시각 ±36h 내면 +0.1). 실패=null(즉시 실패 아님 — 재시도 몫). */
export function matchInRss(title: string, items: RssItem[], claimedAtMs: number): RssItem | null {
  let best: { item: RssItem; score: number } | null = null;
  for (const it of items) {
    let score = titleSimilarity(title, it.title);
    if (it.pubDate && Math.abs(it.pubDate - claimedAtMs) < 36 * 3600_000) score += 0.1;
    if (!best || score > best.score) best = { item: it, score };
  }
  return best && best.score >= MATCH_THRESHOLD ? best.item : null;
}

// 삭제 안내 패턴 — 네이버가 200으로 주는 삭제/비공개 페이지의 명시 문구만(보수). 불확실=유지.
const DELETED_RE = /(삭제되었거나 존재하지 않는|존재하지 않는 게시물|삭제된 게시물|비공개 게시물이|권한이 없어 볼 수 없)/;
export type DeleteVerdict = "deleted" | "alive" | "unknown";
/** URL 조회 기반 삭제 감지 — RSS 부재로는 절대 판정하지 않는다(함정 a). 네트워크 실패·모호 = unknown(유지). */
export async function checkPostDeleted(url: string): Promise<DeleteVerdict> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (res.status === 404 || res.status === 410) return "deleted";
    if (!res.ok) return "unknown"; // 5xx·차단 = 모호 → 유지(오탐 방지)
    const html = (await res.text()).slice(0, 40000);
    if (DELETED_RE.test(html)) return "deleted";
    return "alive"; // 200 + 삭제 문구 없음
  } catch { return "unknown"; }
}

/** ★검증 단일 진입점 — blogId를 '명시적으로' 받는다(멀티 블로그 대비: 글이 속한 blog_profile의 blogId만 넘길 것).
 *  계정 단일 참조를 이 아래로 내려보내지 않는다 — 호출측이 글→프로필 해석을 책임진다. */
export async function verifyTitleInBlog(blogId: string, title: string, claimedAtMs: number): Promise<RssItem | null> {
  if (!blogId) return null;
  const items = await fetchBlogRss(blogId).catch(() => []);
  return matchInRss(title, items, claimedAtMs);
}
