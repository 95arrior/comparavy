// 네이버 블로그 검색 API — 키워드의 '블로그 글 수(total)' = 진짜 콘텐츠 경쟁 신호.
// (네이버 검색광고 compIdx는 '광고 경쟁'이라 콘텐츠 경쟁을 못 나타냄 → 이걸로 보완)
// DataLab과 동일한 네이버 개발자 앱 자격증명 사용(앱에 '검색' API 추가돼 있어야 함).

const ENDPOINT = "https://openapi.naver.com/v1/search/blog.json";

/**
 * 키워드의 네이버 블로그 글 총 개수(total) 반환. 실패/미설정 시 null(→ 호출측 폴백).
 * display=1로 최소 응답만 받고 total만 쓴다.
 */
export async function fetchBlogTotal(query: string): Promise<number | null> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const q = query.trim();
  if (!id || !secret || !q) return null;
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}&display=1`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) return null; // 권한 없음(검색 API 미추가)·쿼터초과 등 → 폴백
    const data = (await res.json()) as { total?: number };
    return typeof data.total === "number" && data.total >= 0 ? data.total : null;
  } catch {
    return null;
  }
}

/**
 * ★색인 체커 — 글 제목으로 네이버 블로그 검색을 돌려 '내 블로그 글'이 검색 결과에 잡히는지 확인.
 * 판정: 결과 링크에 내 블로그 아이디가 있거나, 제목이 사실상 일치(공백·태그 제거)하면 색인됨.
 * 실패/미설정 시 null(판정 불가 — UI는 표시 생략).
 */
export async function checkIndexed(title: string, blogId?: string | null): Promise<boolean | null> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const q = title.trim();
  if (!id || !secret || !q) return null;
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}&display=20`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { title?: string; link?: string }[] };
    const norm = (s: string) => s.replace(/<[^>]+>/g, "").replace(/[\s ]/g, "").toLowerCase();
    const target = norm(q);
    const bid = (blogId ?? "").trim().toLowerCase();
    for (const item of data.items ?? []) {
      if (bid && (item.link ?? "").toLowerCase().includes(`blog.naver.com/${bid}`)) return true;
      if (target.length >= 10 && norm(item.title ?? "") === target) return true;
    }
    return false;
  } catch {
    return null;
  }
}

/**
 * ★SERP 역분석 — 키워드 상위 블로그 글 제목·요약(정확도순). '제치기'의 눈.
 * 실패/미설정 시 [] (생성은 그대로 진행 — 눈 없이도 쓰던 기존 품질).
 */
export async function fetchTopPosts(query: string, n = 5): Promise<{ title: string; description: string }[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const q = query.trim();
  if (!id || !secret || !q) return [];
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}&display=${Math.min(10, n)}&sort=sim`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string; description?: string }[] };
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
    return (data.items ?? []).slice(0, n).map((it) => ({ title: strip(it.title ?? ""), description: strip(it.description ?? "") })).filter((x) => x.title);
  } catch { return []; }
}
