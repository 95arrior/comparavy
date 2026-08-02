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

// ★2단 확장(2026-08-02 — 유저가 실성과에서 역추적해 찾은 것).
//  유저 관찰: 성과 낸 글의 제목이 "삼성카드 발급조회, 심사중일 때…"였고 지금도 1페이지·누적 조회 상위다.
//  실측해 보니 '삼성카드 발급조회'는 1단 자동완성 10개 안에 없다 — '삼성카드 발급'을 한 번 더 넣어야 나온다.
//   1단: 고객센터·홈페이지·발급·결제일별·추천·이용내역·해지·몰·앱  ← 전부 굵고 경쟁 심한 머리말
//   2단: 발급조회·발급기간·발급조건·발급보류·발급취소·발급혜택      ← 의도가 뾰족하고 경쟁이 얕다
//  ★1단은 '무엇을'까지고, 2단이 '무엇을 어떻게'다. 검색자의 진짜 문장은 2단에 있다.
//  자동완성은 랭킹 요인이 아니라 수요의 증거다 — 다만 사람들이 실제로 치는 '표기 그대로'를 알려준다는 게 핵심이다
//  (띄어쓰기·어순까지. 우리가 임의로 '발급 조회'로 바꿔 쓰면 그 정합이 깨진다).
export async function expandAutocomplete(
  query: string,
  opts?: { branch?: number; perNode?: number; limit?: number },
): Promise<string[]> {
  const branch = opts?.branch ?? 5;   // 1단에서 몇 개를 더 팔지
  const perNode = opts?.perNode ?? 6; // 가지마다 몇 개를 가져올지
  const limit = opts?.limit ?? 40;
  const first = await fetchNaverAutocomplete(query);
  if (!first.length) return [];
  const out: string[] = [...first];
  const seen = new Set(out.map((x) => x.replace(/\s+/g, "")));
  // ★순차 호출이 아니라 병렬 — 비공식 엔드포인트라 실패는 조용히 넘어간다(fetchNaverAutocomplete가 빈 배열).
  const nested = await Promise.all(first.slice(0, branch).map((q) => fetchNaverAutocomplete(q)));
  for (const list of nested) {
    for (const kw of list.slice(0, perNode)) {
      const k = kw.replace(/\s+/g, "");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(kw);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ★광고 API 키워드 띄어쓰기 복원(2026-08-02 유저 화면 실측).
//  네이버 검색광고 API는 relKeyword를 공백 없이 준다 — '신용카드발급신용점수', '전세보증금반환확약서'.
//  그걸 제목에 그대로 박으니 사람이 안 치는 말이 카드에 떴다("신용카드발급신용점수, 이것만 알면 됩니다").
//  ★자동완성이 정답을 안다: 같은 글자열의 '사람이 쓰는 띄어쓰기'를 그대로 돌려준다.
//   실측 — 신용카드발급신용점수 → '신용카드발급 신용점수' / 전세보증금반환확약서 → '전세보증금 반환 확약서'
//   반대로 '개인신용정보서'처럼 원래 붙여 쓰는 말은 자동완성도 붙여 쓴다 → 건드리지 않는다.
//  실패하면 원본 그대로(graceful) — 표기를 우리가 추측해서 만들지는 않는다.
export async function naturalizeKeyword(keyword: string): Promise<string> {
  const k = String(keyword || "").trim();
  if (!k || /\s/.test(k) || [...k].length < 6) return k; // 이미 띄어져 있거나 짧으면 볼 것 없다
  const cmp = (x: string) => x.replace(/\s+/g, "");
  const list = await fetchNaverAutocomplete(k);
  // 같은 글자열인데 공백이 들어간 형태만 채택 — 다른 단어가 붙은 확장형은 제외한다
  const hit = list.find((x) => cmp(x) === k && x !== k);
  return hit ?? k;
}
