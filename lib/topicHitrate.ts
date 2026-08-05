// ★글감 적중률(2026-08-05 유저 요청) — "우리가 낸 글감이 실제 유입 검색어에 있었나".
//
//  ★재는 이유: 원천을 다섯 개 붙였는데 어느 것이 일하는지 증거가 없다.
//   8/4엔 유저의 인기유입검색어 20개 중 우리 글감이 0개였다. 그 숫자가 올라가는지를 봐야 한다.
//
//  ★대조 규칙(느슨하게 잡되, 느슨함을 숨기지 않는다):
//   유입 검색어와 글감 키워드는 표기가 어긋난다 — "근로장려금" vs "근로장려금 지급일".
//   그래서 공백을 지우고 '한쪽이 다른 쪽을 포함하면 적중'으로 본다.
//   ★대신 2글자 포함 같은 헐거운 매칭은 막는다(3글자 미만은 우연히 겹친다).
//   판정 결과에 우리 키워드와 유입 검색어를 둘 다 남겨서, 유저가 눈으로 반증할 수 있게 한다.

export const norm = (s: string) => String(s || "").replace(/\s+/g, "").toLowerCase();

/** 두 말이 같은 검색 의도인가. 한쪽이 다른 쪽을 품으면 적중으로 본다. */
export function keywordMatch(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // ★짧은 말이 긴 말에 우연히 박히는 걸 막는다("세금"이 "재산세금액"에 들어가는 식)
  const short = x.length <= y.length ? x : y;
  const long = short === x ? y : x;
  if (short.length < 3) return false;
  return long.includes(short);
}

export interface ServedRow { date: string; keyword: string; norm: string; seed_source: string | null; lane: string | null; vol: number | null; blog_total: number | null; preempt: boolean }
export interface InflowRow { date: string; keyword: string; inflow: number }

export interface HitRow {
  inflow_date: string; served_date: string; keyword: string; inflow_keyword: string;
  seed_source: string | null; lane: string | null; inflow: number; lead_days: number;
}

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(`${a}T00:00:00+09:00`) - Date.parse(`${b}T00:00:00+09:00`)) / 86400_000);

/**
 * 유입 검색어와 서빙 글감을 맞대 적중을 뽑는다.
 * ★한 유입 검색어에 여러 글감이 걸릴 수 있다 — 가장 먼저 낸 것(선점 폭이 큰 것)을 남긴다.
 *  나중에 낸 걸 남기면 우리가 실제보다 늦게 잡은 것처럼 보인다.
 */
export function computeHits(served: ServedRow[], inflow: InflowRow[]): HitRow[] {
  const out = new Map<string, HitRow>();
  for (const inf of inflow) {
    for (const s of served) {
      if (dayDiff(inf.date, s.date) < 0) continue; // 유입 이후에 낸 글감은 적중이 아니다
      if (!keywordMatch(s.keyword, inf.keyword)) continue;
      const key = `${inf.date}|${inf.keyword}`;
      const lead = dayDiff(inf.date, s.date);
      const prev = out.get(key);
      if (prev && prev.lead_days >= lead) continue; // 더 먼저 낸 것이 이긴다
      out.set(key, {
        inflow_date: inf.date, served_date: s.date, keyword: s.keyword, inflow_keyword: inf.keyword,
        seed_source: s.seed_source, lane: s.lane, inflow: inf.inflow, lead_days: lead,
      });
    }
  }
  return [...out.values()].sort((a, b) => b.inflow - a.inflow);
}

export interface SourceStat { source: string; served: number; hit: number; rate: number; inflow: number; avgLead: number }

/**
 * 원천별 성적표. ★분모는 '그 원천이 낸 글감 수'다 —
 *  적중 수만 보면 많이 내는 원천이 무조건 이겨 보인다.
 */
export function sourceStats(served: ServedRow[], hits: HitRow[]): SourceStat[] {
  const m = new Map<string, { served: number; hit: number; inflow: number; lead: number }>();
  const get = (k: string) => { const v = m.get(k) ?? { served: 0, hit: 0, inflow: 0, lead: 0 }; m.set(k, v); return v; };
  for (const s of served) get(s.seed_source || "미상").served += 1;
  const counted = new Set<string>();
  for (const h of hits) {
    const k = `${h.served_date}|${norm(h.keyword)}`;
    if (counted.has(k)) continue; // 같은 글감이 여러 유입어에 걸려도 적중 1로 센다
    counted.add(k);
    const v = get(h.seed_source || "미상");
    v.hit += 1; v.inflow += h.inflow; v.lead += h.lead_days;
  }
  return [...m.entries()]
    .map(([source, v]) => ({
      source, served: v.served, hit: v.hit,
      rate: v.served ? Math.round((v.hit / v.served) * 1000) / 10 : 0,
      inflow: v.inflow, avgLead: v.hit ? Math.round((v.lead / v.hit) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.hit - a.hit || b.rate - a.rate);
}
