// ★사건 밀도 계측(2026-08-07 — 사건 3편 + 꾸준한 수요 1편 전환의 첫 작업).
//
//  유저 확정: "사건 크기는 며칠 재보고 정하자."
//  ★컷을 감으로 정하지 않는다 — 어제 수요 게이트에서 배운 그대로다('못 쟀으면 통과' 문 4개가
//   게이트를 무력화했다). 사건 레인의 컷(6시간 기사 N건·매체 M개)은 이 계측이 며칠 쌓인 뒤
//   실측 분포에서 정한다. 그 전까지 발행 파이프는 아무것도 바꾸지 않는다 — 이 파일은 읽고 기록만 한다.
//
//  ★무엇을 재는가: 소재(probe)별로 '지금 사건이 얼마나 뜨거운가'.
//   - 1시간·6시간 내 기사 수 — 사건의 크기
//   - 서로 다른 매체 수 — 한 매체 단독 보도는 사건이 아니라 그 매체의 기획이다
//   - 제목 중복을 걷은 수 — 연합 재전송·받아쓰기가 부풀린 거품을 뺀 실제 사건 수
//  ★새벽 실측(2026-08-07 05시): 부동산 대책 20건/1h · 주가 급락 12 · 세금 개편 11 · 지원금 신청 0.
//   우리 주력(지원금)이 사건 밀도 0이었다 — 이 표가 그 관찰을 매일 자동으로 잇는다.
const NEWS_EP = "https://openapi.naver.com/v1/search/news.json";

// ★소재는 '경제 전반'(유저 확정) — 부동산·증시·금리환율·세제·지원금·생활물가·연금보험.
//  probe는 검색어가 아니라 온도계다. 여기서 글감을 만들지 않는다(그건 다음 단계).
export const EVENT_PROBES: { probe: string; group: string }[] = [
  { probe: "부동산 대책", group: "부동산" },
  { probe: "대출 규제", group: "부동산" },
  { probe: "아파트 분양", group: "부동산" },
  { probe: "전세 사기", group: "부동산" },
  { probe: "주가 급락", group: "증시" },
  { probe: "주가 급등", group: "증시" },
  { probe: "코스피", group: "증시" },
  { probe: "무상증자", group: "증시" },
  { probe: "금리 인하", group: "금리환율" },
  { probe: "환율", group: "금리환율" },
  { probe: "세금 개편", group: "세제" },
  { probe: "연말정산", group: "세제" },
  { probe: "지원금 신청", group: "지원금" },
  { probe: "민생지원금", group: "지원금" },
  { probe: "전기요금", group: "생활물가" },
  { probe: "보험료 인상", group: "연금보험" },
  { probe: "연금 개편", group: "연금보험" },
];

export interface DensityRow {
  probe: string;
  group: string;
  cnt1h: number;
  cnt6h: number;
  outlets6h: number;   // 서로 다른 매체(도메인) 수
  uniq6h: number;      // 제목 중복을 걷은 기사 수
  topTitles: string[]; // 최근 6시간 대표 제목(분포 해석용 — 컷을 정할 때 '이 숫자면 이런 사건'을 봐야 한다)
}

const normTitle = (t: string) =>
  String(t || "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/[\[\]().,'"“”‘’…·\s]/g, "").toLowerCase().slice(0, 24);

const domainOf = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
};

/** probe 하나의 현재 사건 밀도. 실패는 null — 0과 구분한다(측정 실패를 '사건 없음'으로 적으면 분포가 거짓말한다). */
export async function measureProbe(probe: string, group: string): Promise<DensityRow | null> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID;
  const secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return null;
  try {
    const res = await fetch(`${NEWS_EP}?query=${encodeURIComponent(probe)}&display=100&sort=date`, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { items?: { title?: string; pubDate?: string; originallink?: string; link?: string }[] };
    const now = Date.now();
    const within = (it: { pubDate?: string }, h: number) => {
      const t = new Date(String(it.pubDate ?? "")).getTime();
      return Number.isFinite(t) && now - t <= h * 3600_000;
    };
    const h6 = (j.items ?? []).filter((it) => within(it, 6));
    const titles = new Map<string, string>();
    const outlets = new Set<string>();
    for (const it of h6) {
      const k = normTitle(it.title ?? "");
      if (k && !titles.has(k)) titles.set(k, String(it.title ?? "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"'));
      const d = domainOf(String(it.originallink ?? it.link ?? ""));
      if (d) outlets.add(d);
    }
    return {
      probe, group,
      cnt1h: h6.filter((it) => within(it, 1)).length,
      cnt6h: h6.length,
      outlets6h: outlets.size,
      uniq6h: titles.size,
      topTitles: [...titles.values()].slice(0, 5),
    };
  } catch {
    return null;
  }
}
