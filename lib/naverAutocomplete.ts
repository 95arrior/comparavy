// 네이버 자동완성 — 사용자가 네이버 검색창에 칠 때 뜨는 '실제 검색어' 제안.
// 비공식 엔드포인트(ac.search.naver.com)라 graceful: 실패하면 빈 배열.
// 글감 풀 시드로 써서, 네이버에서 진짜로 검색되는 키워드를 발굴한다.

export async function fetchNaverAutocomplete(query: string): Promise<string[]> {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://search.naver.com/" },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { items?: unknown[][] };
    const items = j?.items?.[0];
    if (!Array.isArray(items)) return [];
    const out: string[] = [];
    for (const row of items) {
      const s = Array.isArray(row) ? String(row[0] ?? "").trim() : "";
      if (s && s !== q && !out.includes(s)) out.push(s);
    }
    return out.slice(0, 10);
  } catch {
    return [];
  }
}
