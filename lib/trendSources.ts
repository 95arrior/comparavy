// ★다중 소스 트렌드 헤드라인 수집 — 네이버 편향(경제=은행권만) 탈피.
//  네이버 뉴스 + 구글 뉴스 RSS(무료·무인증) 를 '다양한 소주제 시드'로 병렬 조회해 넓게 긁는다.
//  '경제 재테크' 한 단어로 치면 금융권만 나오므로, 소주제로 쪼개 검색 = 다양성의 핵심.

export interface Headline { title: string; description: string; press: string; seed: string }

// 카테고리별 소주제 시드 — 이걸로 각각 뉴스를 긁어 편향을 깬다. 없으면 generic 폴백.
const SEEDS: Record<string, string[]> = {
  "경제·재테크": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리 예적금"],
  "경제": ["정부지원금", "부동산 정책", "세금 절세", "청년 지원", "재테크 투자", "금리"],
  "IT·테크": ["신제품 출시", "AI 서비스", "스마트폰", "앱 업데이트", "가전 신기술"],
  "자동차": ["신차 출시", "전기차 보조금", "자동차 리콜", "중고차 시세", "자동차 세금"],
  "건강": ["건강 정보", "다이어트 방법", "영양제 효능", "질환 예방", "운동 루틴"],
  "리빙·인테리어": ["인테리어 트렌드", "생활 꿀팁", "가구 추천", "정리수납", "홈데코"],
  "반려동물": ["반려동물 건강", "강아지 훈련", "고양이 정보", "펫용품 추천", "반려동물 정책"],
  "육아": ["육아 정보", "출산 지원금", "아이 교육", "육아용품 추천", "보육 정책"],
  "국내여행": ["국내여행 추천", "여행 축제", "숙소 할인", "여행 코스", "관광지 개장"],
  "해외여행": ["해외여행 추천", "항공권 특가", "여행 비자", "환율 여행", "여행 트렌드"],
  "레시피·요리": ["간단 레시피", "제철 음식", "다이어트 식단", "밀키트 추천", "요리 꿀팁"],
  "맛집·푸드": ["맛집 추천", "신메뉴 출시", "프랜차이즈 이벤트", "지역 맛집", "푸드 트렌드"],
  "뷰티": ["뷰티 신제품", "화장품 성분", "스킨케어 방법", "메이크업 트렌드", "헤어 스타일"],
  "패션": ["패션 트렌드", "코디 추천", "브랜드 세일", "계절 패션", "신상 출시"],
  "게임": ["게임 신작", "게임 업데이트", "e스포츠", "게임 이벤트", "콘솔 신제품"],
  "스포츠": ["스포츠 경기", "선수 이적", "리그 일정", "홈트 운동", "스포츠 용품"],
  "교육": ["입시 정보", "교육 정책", "공부법", "자격증 시험", "온라인 강의"],
};

function seedsFor(category: string): string[] {
  const key = Object.keys(SEEDS).find((k) => category.includes(k) || k.includes(category));
  if (key) return SEEDS[key].slice(0, 5);
  // generic — 카테고리 + 흔한 정보성 수식어
  const c = category.replace(/[·/]/g, " ").trim();
  return [`${c} 추천`, `${c} 방법`, `${c} 정보`, `${c} 트렌드`, `${c} 최신`];
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

async function fetchNaverNews(query: string, seed: string): Promise<Headline[]> {
  const id = process.env.NAVER_DATALAB_CLIENT_ID, secret = process.env.NAVER_DATALAB_SECRET;
  if (!id || !secret) return [];
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=6&sort=date`,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: { title?: string; description?: string; originallink?: string; link?: string }[] };
    return (data.items ?? []).map((it) => ({
      title: strip(it.title ?? ""), description: strip(it.description ?? ""),
      press: (() => { try { return new URL(it.originallink || it.link || "").hostname.replace(/^www\./, ""); } catch { return ""; } })(),
      seed,
    })).filter((n) => n.title);
  } catch { return []; }
}

async function fetchGoogleNews(query: string, seed: string): Promise<Headline[]> {
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
      const title = strip(t.replace(/ - [^-]+$/, "")); // 구글은 제목 끝에 ' - 언론사'
      if (title) items.push({ title, description: strip(d).slice(0, 160), press: strip(src), seed });
    }
    return items;
  } catch { return []; }
}

/** 카테고리의 다양한 소주제로 네이버+구글 뉴스를 병렬 수집 → 중복 제거한 헤드라인. */
export async function gatherHeadlines(category: string): Promise<Headline[]> {
  const seeds = seedsFor(category);
  const jobs: Promise<Headline[]>[] = [];
  for (const s of seeds) {
    jobs.push(fetchNaverNews(s, s));
    jobs.push(fetchGoogleNews(s, s));
  }
  const all = (await Promise.all(jobs.map((p) => p.catch(() => [] as Headline[])))).flat();
  // 제목 정규화 중복 제거
  const seen = new Set<string>();
  const out: Headline[] = [];
  for (const h of all) {
    const nk = h.title.replace(/\s+/g, "").toLowerCase().slice(0, 30);
    if (seen.has(nk)) continue;
    seen.add(nk);
    out.push(h);
  }
  return out.slice(0, 30);
}
