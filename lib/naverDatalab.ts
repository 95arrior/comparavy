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

  // 차트 시계열: 키워드마다 절대 검색량 차이가 커서(부동산 100 vs 전세 3) 작은 선이 안 보임 →
  // 키워드별로 자기 최댓값 기준 0~100 정규화해 모든 선이 추이 곡선으로 보이게 한다.
  const maxOf = new Map<string, number>();
  for (const r of results) maxOf.set(r.title, Math.max(1, ...r.data.map((d) => d.ratio)));
  const byPeriod = new Map<string, TrendPoint>();
  for (const r of results) {
    const mx = maxOf.get(r.title) ?? 1;
    for (const d of r.data) {
      const row = byPeriod.get(d.period) ?? { period: d.period };
      row[r.title] = Math.round((d.ratio / mx) * 100);
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

// ★키워드 모멘텀(2026-08-05 유저 지적: "케이뱅크 황금캡슐, 일주일 지나 지금 나오면 선점 실패").
//  브랜드 이벤트는 '지금 열려 있는가'가 전부다. 자동완성에 남아 있다고 지금 뜨는 건 아니다 —
//  피크가 지난 말은 이미 남들이 다 썼고, 우리가 늦게 들어가면 문서 수만 늘린다.
//  ★그래서 일별 추이로 잰다: 최근 3일 평균 vs 그 앞 7일 평균. 오르는 중이면 창이 열려 있고,
//   꺾였으면 닫힌 것이다. 월 단위(fetchTrend)로는 이 판별이 불가능하다 — 일주일이 한 점에 뭉개진다.
export interface Momentum {
  recent: number;      // 최근 3일 평균 비율
  prior: number;       // 그 앞 7일 평균 비율
  ratio: number;       // recent / prior (1보다 크면 오르는 중)
  peakDaysAgo: number; // 최고점이 며칠 전인가(0=오늘)
}
export async function fetchKeywordMomentum(keywords: string[]): Promise<Map<string, Momentum>> {
  const out = new Map<string, Momentum>();
  const picks = Array.from(new Set(keywords.map((k) => k.trim()).filter(Boolean))).slice(0, 5);
  if (!picks.length || !hasDatalabEnv()) return out; // 키 없으면 판정 불가 — 호출측이 통과로 처리한다
  const end = new Date();
  const start = new Date(end.getTime() - 20 * 86400_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": process.env.NAVER_DATALAB_CLIENT_ID ?? "",
        "X-Naver-Client-Secret": process.env.NAVER_DATALAB_SECRET ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: ymd(start), endDate: ymd(end), timeUnit: "date",
        keywordGroups: picks.map((k) => ({ groupName: k, keywords: [k] })),
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return out;
    const json = (await res.json()) as { results?: { title: string; data: { period: string; ratio: number }[] }[] };
    for (const r of json.results ?? []) {
      const data = (r.data ?? []).slice().sort((a, b) => a.period.localeCompare(b.period));
      if (data.length < 5) continue;
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      const recent = avg(data.slice(-3).map((d) => d.ratio));
      const prior = avg(data.slice(-10, -3).map((d) => d.ratio));
      const peakIdx = data.reduce((best, d, i) => (d.ratio > data[best]!.ratio ? i : best), 0);
      out.set(r.title, {
        recent, prior,
        ratio: prior > 0 ? recent / prior : (recent > 0 ? 99 : 0),
        peakDaysAgo: data.length - 1 - peakIdx,
      });
    }
  } catch { /* 실패 = 판정 불가 — 호출측이 통과로 처리한다(수확을 막지 않는다) */ }
  return out;
}
