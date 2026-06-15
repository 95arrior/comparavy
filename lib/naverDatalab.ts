// 네이버 데이터랩 검색어 트렌드 API. (검색광고 API와 다른 키 — 개발자센터 애플리케이션 Client ID/Secret)
// 공용 데이터라 카테고리별 하루 1회만 호출하고 DB 캐시(category_insights)로 서빙 — 한도(1,000/일) 안전.

const ENDPOINT = "https://openapi.naver.com/v1/datalab/search";

export interface TrendPoint {
  period: string;
  [keyword: string]: number | string;
}
export interface TrendItem {
  keyword: string;
  rising: boolean; // 최근값이 이전 평균보다 의미있게 높으면 상승
  latest: number;
}
export interface TrendResult {
  series: TrendPoint[]; // 차트용 (월별, 키워드별 비율)
  items: TrendItem[]; // 키워드별 상승/하락
}

export function hasDatalabEnv(): boolean {
  return Boolean(process.env.NAVER_DATALAB_CLIENT_ID && process.env.NAVER_DATALAB_SECRET);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 키워드들의 최근 12개월 월별 검색 추이. 최대 5개(데이터랩 그룹 한도)까지.
 * @throws env 미설정/HTTP 오류 시
 */
export async function fetchTrend(keywords: string[]): Promise<TrendResult> {
  if (!hasDatalabEnv()) throw new Error("데이터랩 키(NAVER_DATALAB_*)가 설정되지 않았습니다.");
  const picks = Array.from(new Set(keywords.map((k) => k.trim()).filter(Boolean))).slice(0, 5);
  if (picks.length === 0) return { series: [], items: [] };

  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_DATALAB_CLIENT_ID ?? "",
      "X-Naver-Client-Secret": process.env.NAVER_DATALAB_SECRET ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: ymd(start),
      endDate: ymd(end),
      timeUnit: "month",
      keywordGroups: picks.map((k) => ({ groupName: k, keywords: [k] })),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`데이터랩 HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { results?: { title: string; data: { period: string; ratio: number }[] }[] };
  const results = json.results ?? [];

  // 차트 시계열: period 기준으로 키워드별 ratio 병합
  const byPeriod = new Map<string, TrendPoint>();
  for (const r of results) {
    for (const d of r.data) {
      const row = byPeriod.get(d.period) ?? { period: d.period };
      row[r.title] = Math.round(d.ratio);
      byPeriod.set(d.period, row);
    }
  }
  const series = Array.from(byPeriod.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));

  // 상승/하락: 마지막값 vs 그 이전 평균(>5% 높으면 상승)
  const items: TrendItem[] = results.map((r) => {
    const vals = r.data.map((d) => d.ratio);
    const latest = vals.length ? vals[vals.length - 1] : 0;
    const prior = vals.slice(0, -1);
    const avg = prior.length ? prior.reduce((s, v) => s + v, 0) / prior.length : latest;
    return { keyword: r.title, latest: Math.round(latest), rising: avg > 0 && latest > avg * 1.05 };
  });

  return { series, items };
}
