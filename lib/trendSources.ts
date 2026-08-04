// ★다중 소스 트렌드 헤드라인 수집 — 네이버 편향(경제=은행권만) 탈피.
//  네이버 뉴스 + 구글 뉴스 RSS(무료·무인증)를 '다양한 소주제 시드'로 병렬 조회해 넓게 긁는다.
//  ★신선도 게이트: pubDate 기준 48시간 이내만. 파싱 실패(미확인)는 트렌드 부적격 — 폐기(2026-07-08 유저 확정) —
//   시드당 확인된 신선 기사 3개 이상이면 미확인분 버리고, 3개 미만이면 미확인분으로 보충(고갈 방어).

import { CATEGORIES } from "./categories";

export interface Headline { title: string; description: string; press: string; seed: string; fresh: boolean | null } // fresh: true=48h내, false=오래됨, null=미확인
export interface GatherStats { raw: number; fresh: number; unverified: number; stale: number; kept: number; perSeed: Record<string, { fresh: number; unverified: number; stale: number }> }

const FRESH_WINDOW_MS = 48 * 3600_000; // 48시간

// 카테고리별 소주제 시드 — 이걸로 각각 뉴스를 긁어 편향을 깬다. 없으면 generic 폴백.
const SEEDS: Record<string, string[]> = {
  "경제·재테크": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리 예적금", "지원금 신청", "보조금 지급", "지원사업 공고", "바우처 신청"],
  "경제": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리", "지원금 신청", "보조금 지급", "지원사업 공고", "바우처 신청"],
  "IT·테크": ["IT 신제품", "AI 서비스", "스마트폰 출시", "앱 업데이트", "가전 신기술", "통신 요금제"],
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
  "패션": ["패션 트렌드", "코디 추천", "패션 브랜드 세일", "계절 패션", "패션 신상", "쇼핑 할인"],
  "게임": ["게임 신작", "게임 업데이트", "e스포츠", "게임 이벤트", "콘솔 신제품", "모바일 게임"],
  "스포츠": ["스포츠 경기", "선수 이적", "리그 일정", "홈트 운동", "스포츠 용품", "마라톤 대회"],
  "교육": ["입시 정보", "교육 정책", "공부법", "자격증 시험", "온라인 강의", "학원비 지원"],
  "부업": ["부업 추천", "블로그 수익", "스마트스토어", "앱테크", "N잡 세금", "재택 부업"],
  "IT/리뷰": ["신제품 출시", "AI 서비스", "스마트폰 출시", "가전 신기술", "앱 추천", "통신 요금제"],
  "정부지원금/생활정보": ["정부지원금", "복지 혜택", "청약 일정", "세금 환급", "생활 지원 정책", "신청 마감"],
  "결혼/웨딩": ["결혼 준비", "웨딩홀 비용", "신혼집 대출", "결혼 지원금", "혼수 준비", "신혼여행"],
  "취미": ["취미 추천", "원데이클래스", "카메라 입문", "독서 모임", "그림 배우기", "홈트 취미"],
  "원예/식물": ["실내식물 추천", "식물 키우기", "다육이 관리", "베란다 텃밭", "화분 분갈이", "공기정화식물"],
};

export function seedsFor(category: string): string[] {
  const key = Object.keys(SEEDS).find((k) => category.includes(k) || k.includes(category));
  if (key) return SEEDS[key]; // ★6개 전부 사용
  // ★세부 카테고리(주식·강아지·지원금 등) — 부모 대분류 시드 상속 + 세부어 구체 시드 2개(전 카테고리 정합)
  const parent = CATEGORIES.find((c) => c.subs.includes(category))?.name;
  if (parent) {
    const pk = Object.keys(SEEDS).find((k) => parent.includes(k) || k.includes(parent));
    const base = pk ? SEEDS[pk].slice(0, 4) : [];
    return [...base, `${category} 추천`, `${category} 최신`];
  }
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

// ── 구글 트렌드 KR 급상승 RSS — 유일한 공식 '실시간 인기 통계'(검색량 근사치 동봉). 전 카테고리 공통, 관련성은 선별 게이트가 거른다.
// ★씨앗 라벨을 상수로 뺀다(2026-08-04) — 이 표식이 파이프라인 끝(밴드 우회 판정)까지 살아 있어야 한다.
//  종전엔 급상승 헤드라인이 합성 단계에서 source:"news"로 뭉개져, '지금 뜨는 열은 실시간이어야 한다'는
//  유저 요구를 코드가 지킬 방법 자체가 없었다(무엇이 실시간 유래인지 알 수 없었다).
export const RISING_SEED = "실시간급상승";
export const RISING_TAG = "실시간 급상승";
/** 급상승 헤드라인 제목에서 실제 검색어만 뽑는다. 형식: `[실시간 급상승 2만+ 검색] 키워드 — 뉴스제목` */
export function risingKeywordOf(title: string): string {
  const m = new RegExp(`^\\[${RISING_TAG}[^\\]]*\\]\\s*([^—]+)`).exec(String(title || ""));
  return (m?.[1] ?? "").trim();
}
let gtCache: { at: number; items: Headline[] } | null = null;
export async function fetchGoogleTrendsKR(now: number): Promise<Headline[]> {
  if (gtCache && now - gtCache.at < 10 * 60_000) return gtCache.items;
  try {
    const res = await fetch("https://trends.google.co.kr/trending/rss?geo=KR", { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: Headline[] = [];
    const blocks = xml.split("<item>").slice(1);
    for (const b of blocks.slice(0, 20)) {
      const dec = (x: string) => x.replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const kw = dec((b.match(/<title>([^<]+)<\/title>/)?.[1] ?? "").trim());
      const traffic = (b.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/)?.[1] ?? "").trim();
      const newsTitle = dec((b.match(/<ht:news_item_title>([^<]+)<\/ht:news_item_title>/)?.[1] ?? "").trim());
      if (!kw) continue;
      items.push({ title: `[${RISING_TAG} ${traffic || "?"} 검색] ${kw}${newsTitle ? ` — ${newsTitle}` : ""}`, description: newsTitle, press: "구글트렌드", seed: RISING_SEED, fresh: true });
    }
    gtCache = { at: now, items };
    return items;
  } catch { return []; }
}

export async function gatherHeadlinesWithStats(category: string): Promise<{ headlines: Headline[]; stats: GatherStats }> {
  const now = Date.now();
  const seeds = seedsFor(category);
  const jobs: Promise<Headline[]>[] = [];
  for (const s of seeds) { jobs.push(fetchNaverNews(s, s, now)); jobs.push(fetchGoogleNews(s, s, now)); }
  jobs.push(fetchGoogleTrendsKR(now)); // ★실시간 인기 통계 합류 — 검색량 근사치가 제목에 실려 선별 AI가 강신호로 읽음
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
    // ★미확인(발행일 파싱 실패) 보충 폐지(유저 확정 — 실측: 과거 공고가 '실시간 급상승'으로 승격 의심): 발행일 못 찾는 소스는 트렌드 부적격.
    //  고갈은 즉석 수확·공고형 쿼리 다변화로 감수 — 가짜 신선보다 빈 보드가 정직하다.
  }

  // ★실시간 급상승(구글 트렌드 KR) 합류(2026-07-24 유저: "민생지원금신청 왜 안 주냐") — 이 그룹은 seed="실시간급상승"이라
  //  위 카테고리 시드 순회에서 통째로 빠져 '수집만 되고 전량 폐기'되던 실측 버그. 설계 의도(line 105 "전 카테고리 공통,
  //  관련성은 선별 게이트가 거른다")를 복원: 씨앗으로 태워 합성 프롬프트가 보게 하고, 카테고리 정합은 합성 LLM이 재선별.
  //  상한 8개(비관련 카테고리 노이즈 억제). fresh=true(하드코딩)만.
  {
    const rising = dedup.filter((h) => h.seed === RISING_SEED && h.fresh === true).slice(0, 8);
    if (rising.length) { perSeed[RISING_SEED] = { fresh: rising.length, unverified: 0, stale: 0 }; kept.push(...rising); }
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
