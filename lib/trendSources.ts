// ★다중 소스 트렌드 헤드라인 수집 — 네이버 편향(경제=은행권만) 탈피.
//  네이버 뉴스 + 구글 뉴스 RSS(무료·무인증)를 '다양한 소주제 시드'로 병렬 조회해 넓게 긁는다.
//  ★신선도 게이트: pubDate 기준 48시간 이내만(24h는 주말 고갈 위험). 파싱 실패는 '미확인'으로 분리 —
//   시드당 확인된 신선 기사 3개 이상이면 미확인분 버리고, 3개 미만이면 미확인분으로 보충(고갈 방어).

export interface Headline { title: string; description: string; press: string; seed: string; fresh: boolean | null } // fresh: true=48h내, false=오래됨, null=미확인
export interface GatherStats { raw: number; fresh: number; unverified: number; stale: number; kept: number; perSeed: Record<string, { fresh: number; unverified: number; stale: number }> }

const FRESH_WINDOW_MS = 48 * 3600_000; // 48시간

// 카테고리별 소주제 시드 — 이걸로 각각 뉴스를 긁어 편향을 깬다. 없으면 generic 폴백.
const SEEDS: Record<string, string[]> = {
  "경제·재테크": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리 예적금"],
  "경제": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리"],
  "IT·테크": ["신제품 출시", "AI 서비스", "스마트폰", "앱 업데이트", "가전 신기술", "통신 요금제"],
  "자동차": ["신차 출시", "전기차 보조금", "자동차 리콜", "중고차 시세", "자동차 세금", "자동차 보험"],
  "건강": ["건강 정보", "다이어트 방법", "영양제 효능", "질환 예방", "운동 루틴", "건강검진"],
  "리빙·인테리어": ["인테리어 트렌드", "생활 꿀팁", "가구 추천", "정리수납", "홈데코", "청소 팁"],
  "반려동물": ["반려동물 건강", "강아지 훈련", "고양이 정보", "펫용품 추천", "반려동물 정책", "동물병원 비용"],
  "육아": ["육아 정보", "출산 지원금", "아이 교육", "육아용품 추천", "보육 정책", "육아휴직"],
  "국내여행": ["국내여행 추천", "여행 축제", "숙소 할인", "여행 코스", "관광지 개장", "기차 여행"],
  "해외여행": ["해외여행 추천", "항공권 특가", "여행 비자", "환율 여행", "여행 트렌드", "면세점 할인"],
  "레시피·요리": ["간단 레시피", "제철 음식", "다이어트 식단", "밀키트 추천", "요리 꿀팁", "에어프라이어 요리"],
  "맛집·푸드": ["맛집 추천", "신메뉴 출시", "프랜차이즈 이벤트", "지역 맛집", "푸드 트렌드", "편의점 신상"],
  "뷰티": ["뷰티 신제품", "화장품 성분", "스킨케어 방법", "메이크업 트렌드", "헤어 스타일", "올리브영 세일"],
  "패션": ["패션 트렌드", "코디 추천", "브랜드 세일", "계절 패션", "신상 출시", "쇼핑 할인"],
  "게임": ["게임 신작", "게임 업데이트", "e스포츠", "게임 이벤트", "콘솔 신제품", "모바일 게임"],
  "스포츠": ["스포츠 경기", "선수 이적", "리그 일정", "홈트 운동", "스포츠 용품", "마라톤 대회"],
  "교육": ["입시 정보", "교육 정책", "공부법", "자격증 시험", "온라인 강의", "학원비 지원"],
};

function seedsFor(category: string): string[] {
  const key = Object.keys(SEEDS).find((k) => category.includes(k) || k.includes(category));
  if (key) return SEEDS[key]; // ★6개 전부 사용(기존 slice(0,5) 제거)
  const c = category.replace(/[·/]/g, " ").trim();
  return [`${c} 추천`, `${c} 방법`, `${c} 정보`, `${c} 트렌드`, `${c} 최신`, `${c} 비용`];
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// pubDate(RFC822 등) → fresh 판정. 파싱 실패 = null(미확인).
function freshOf(pubDate: string | undefined, now: number): boolean | null {
  if (!pubDate) return null;
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return null;
  return now - t <= FRESH_WINDOW_MS;
}

async function fetchNaverNews(query: string, seed: string, now: number): Promise<Headline[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID, secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return [];
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=6&sort=date`,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string; description?: string; originallink?: string; link?: string; pubDate?: string }[] };
    return (data.items ?? []).map((it) => ({
      title: strip(it.title ?? ""), description: strip(it.description ?? ""),
      press: (() => { try { return new URL(it.originallink || it.link || "").hostname.replace(/^www\./, ""); } catch { return ""; } })(),
      seed,
      fresh: freshOf(it.pubDate, now),
    })).filter((n) => n.title);
  } catch { return []; }
}

async function fetchGoogleNews(query: string, seed: string, now: number): Promise<Headline[]> {
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`,
      { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: Headline[] = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) && items.length < 6) {
      const block = m[1];
      const t = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "";
      const d = /<description>([\s\S]*?)<\/description>/.exec(block)?.[1] ?? "";
      const src = /<source[^>]*>([\s\S]*?)<\/source>/.exec(block)?.[1] ?? "";
      const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? "";
      const title = strip(t.replace(/ - [^-]+$/, "")); // 구글은 제목 끝에 ' - 언론사'
      if (title) items.push({ title, description: strip(d).slice(0, 160), press: strip(src), seed, fresh: freshOf(pub, now) });
    }
    return items;
  } catch { return []; }
}

/** 신선도 게이트가 적용된 헤드라인 + 분포 통계. */
export async function gatherHeadlinesWithStats(category: string): Promise<{ headlines: Headline[]; stats: GatherStats }> {
  const now = Date.now();
  const seeds = seedsFor(category);
  const jobs: Promise<Headline[]>[] = [];
  for (const s of seeds) { jobs.push(fetchNaverNews(s, s, now)); jobs.push(fetchGoogleNews(s, s, now)); }
  const all = (await Promise.all(jobs.map((p) => p.catch(() => [] as Headline[])))).flat();

  // 제목 정규화 중복 제거
  const seen = new Set<string>();
  const dedup: Headline[] = [];
  for (const h of all) {
    const nk = h.title.replace(/\s+/g, "").toLowerCase().slice(0, 30);
    if (seen.has(nk)) continue;
    seen.add(nk);
    dedup.push(h);
  }

  // ★신선도 게이트(시드별): fresh(48h내)만 기본 채택. 파싱실패(null)는 시드의 확인 신선이 3개 미만일 때만 보충. stale은 버림.
  const perSeed: GatherStats["perSeed"] = {};
  const kept: Headline[] = [];
  for (const s of seeds) {
    const group = dedup.filter((h) => h.seed === s);
    const fresh = group.filter((h) => h.fresh === true);
    const unverified = group.filter((h) => h.fresh === null);
    const stale = group.filter((h) => h.fresh === false);
    perSeed[s] = { fresh: fresh.length, unverified: unverified.length, stale: stale.length };
    kept.push(...fresh);
    if (fresh.length < 3) kept.push(...unverified.slice(0, 3 - fresh.length)); // 고갈 방어 보충
  }

  const stats: GatherStats = {
    raw: all.length,
    fresh: dedup.filter((h) => h.fresh === true).length,
    unverified: dedup.filter((h) => h.fresh === null).length,
    stale: dedup.filter((h) => h.fresh === false).length,
    kept: Math.min(kept.length, 40),
    perSeed,
  };
  return { headlines: kept.slice(0, 40), stats };
}

/** 기존 호환 래퍼 — 신선도 게이트 적용된 헤드라인만. */
export async function gatherHeadlines(category: string): Promise<Headline[]> {
  return (await gatherHeadlinesWithStats(category)).headlines;
}
