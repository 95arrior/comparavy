// 네이버 블로그 검색 API — 키워드의 '블로그 글 수(total)' = 진짜 콘텐츠 경쟁 신호.
// (네이버 검색광고 compIdx는 '광고 경쟁'이라 콘텐츠 경쟁을 못 나타냄 → 이걸로 보완)
// DataLab과 동일한 네이버 개발자 앱 자격증명 사용(앱에 '검색' API 추가돼 있어야 함).

const ENDPOINT = "https://openapi.naver.com/v1/search/blog.json";

/**
 * 키워드의 네이버 블로그 글 총 개수(total) 반환. 실패/미설정 시 null(→ 호출측 폴백).
 * display=1로 최소 응답만 받고 total만 쓴다.
 */
export async function fetchBlogTotal(query: string): Promise<number | null> {
  return (await fetchBlogTotalDetailed(query)).total;
}

/**
 * ★사유까지 돌려주는 판(2026-08-04 백필 실측에서 필요해졌다).
 *  종전엔 권한 없음·쿼터 초과·429·네트워크 실패·'측정값 없음'이 전부 null 하나로 뭉개져서,
 *  백필이 12번 연속 실패했을 때 "왜"를 서버 로그도 없이 추측해야 했다.
 *  ★429(호출 과다)는 '실패'가 아니라 '천천히 하라'는 신호다 — 호출측이 구분해서 물러설 수 있어야 한다.
 */
export async function fetchBlogTotalDetailed(query: string): Promise<{ total: number | null; status: number | null; reason: string | null }> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const q = query.trim();
  if (!id || !secret) return { total: null, status: null, reason: "자격증명없음" };
  if (!q) return { total: null, status: null, reason: "빈질의" };
  // ★정확 구문으로 센다(2026-08-05 실측에서 드러난 근본 결함).
  //  따옴표가 없으면 네이버 블로그 검색은 어절을 느슨하게 푼다 — 두 단어가 '따로' 들어간 글까지 센다:
  //    부동산 공급              → 3,288,558편   "부동산 공급"              → 36,988편
  //    건설근로자공제회 퇴직공제금 →     3,963편   "건설근로자공제회 퇴직공제금" →    387편
  //  ★유저가 문서 수를 쓰는 목적은 '경쟁 분석'이다(유저 원문). 위 숫자는 경쟁이 아니라 소음이다.
  //   부풀려진 값으로 뒷북 컷·선점 판정·"이미 N편 있어요" 문구가 전부 돌고 있었다.
  //  ★이미 따옴표가 있으면 덧씌우지 않는다.
  const phrase = /^".*"$/.test(q) || !/\s/.test(q) ? q : `"${q}"`;
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(phrase)}&display=1`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) {
      const reason = res.status === 429 ? "호출과다(429)" : res.status === 401 || res.status === 403 ? `권한(${res.status})` : `HTTP ${res.status}`;
      return { total: null, status: res.status, reason };
    }
    const data = (await res.json()) as { total?: number };
    if (typeof data.total === "number" && data.total >= 0) return { total: data.total, status: 200, reason: null };
    return { total: null, status: 200, reason: "total없음" };
  } catch (e) {
    return { total: null, status: null, reason: `네트워크(${e instanceof Error ? e.name : "?"})` };
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
export async function fetchTopPosts(query: string, n = 5): Promise<{ title: string; description: string; postdate?: string }[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  const q = query.trim();
  if (!id || !secret || !q) return [];
  try {
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}&display=${Math.min(10, n)}&sort=sim`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string; description?: string; postdate?: string }[] };
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
    return (data.items ?? []).slice(0, n).map((it) => ({ title: strip(it.title ?? ""), description: strip(it.description ?? ""), postdate: (it.postdate ?? "").trim() || undefined })).filter((x) => x.title);
  } catch { return []; }
}
