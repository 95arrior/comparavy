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
