// ★브랜드 버즈 수확기(2026-08-05 유저 지적에서 출발)
//  실물: 유명 블로거가 7/29에 '케이뱅크 황금캡슐 이벤트'를 써서 대박이 났는데, 우리 보드엔 그런 글감이
//  한 번도 뜬 적이 없다. 유저가 이전에도 같은 걸 물었다 — 왜 이런 게 안 나오냐고.
//
//  ★왜 못 들어왔나(파이프라인 3중 봉쇄):
//   ①씨앗 수확 쿼리가 분야 일반명사 10개뿐이다(정부지원금·부동산 정책·금리 예적금…).
//     '케이뱅크 황금캡슐'은 그 어느 쿼리로도 뉴스에 안 걸린다.
//   ②구글 트렌드 급상승은 전 카테고리 공통인데, 카테고리 정합 관문이 '분야 일반명사와 겹치는가'라
//     브랜드+이벤트명은 통과할 수가 없다(그 말 안에 '금리'도 '지원금'도 없다).
//   ③keyword_pool(검색광고 API)은 신조어·이벤트명을 대체로 안 갖고 있다.
//
//  ★해법: 자동완성은 '지금 사람들이 브랜드 뒤에 실제로 붙여 치는 말'을 알려준다.
//   '케이뱅크'를 치면 '케이뱅크 황금캡슐'이 뜬다 — 그 자체가 실시간 신호다(무료·무제한).
//   그래서 브랜드를 씨앗으로 자동완성을 돌려, 이벤트·혜택 신호가 붙은 것을 글감으로 들인다.
import { fetchNaverAutocomplete } from "./naverAutocomplete";

// 경제·재테크 채널의 브랜드 축. ★하드코딩이지만 이유가 있다 — 브랜드는 분야마다 다르고,
//  '지금 뜨는 이벤트'는 브랜드 없이는 검색어가 성립하지 않는다(사람은 '케이뱅크'부터 친다).
//  다른 분야를 열 때 그 분야 브랜드를 여기에 추가한다.
const BRANDS: Record<string, string[]> = {
  "경제·재테크": [
    "케이뱅크", "토스", "카카오뱅크", "카카오페이", "네이버페이",
    "신한은행", "국민은행", "우리은행", "하나은행", "농협",
    "현대카드", "삼성카드", "신한카드", "페이코", "새마을금고",
  ],
};

// ★이벤트·혜택 신호 — 이게 붙어야 '지금 뜨는 돈 되는 말'이다. 없으면 브랜드 일반 정보라 안 들인다.
const BUZZ_RE = /(이벤트|캡슐|룰렛|출석|퀴즈|응모|당첨|쿠폰|캐시백|리워드|포인트|적금|특판|파킹|무료|지급|혜택|추첨|선착순|오픈)/;
// 대출 유인·사칭 계열은 아예 배제(3원칙의 법적 안전 — 여기서도 같은 선을 지킨다)
const BUZZ_BLOCK = /(대출|한도조회|신용점수|연체|회생|파산)/;

export interface BrandBuzz { keyword: string; brand: string }

/**
 * 브랜드별 자동완성에서 '이벤트·혜택' 신호가 붙은 실제 검색어를 거둔다.
 * ★실패는 조용히 건너뛴다(비공식 엔드포인트) — 이 수확기가 죽어도 기존 씨앗 파이프는 그대로 돈다.
 */
export async function harvestBrandBuzz(category: string, limit = 6, budgetMs = 12_000): Promise<BrandBuzz[]> {
  const brands = BRANDS[category] ?? BRANDS[Object.keys(BRANDS).find((k) => category.includes(k) || k.includes(category)) ?? ""];
  if (!brands?.length) return [];
  const startedAt = Date.now();
  const out: BrandBuzz[] = [];
  const seen = new Set<string>();
  for (const brand of brands) {
    if (out.length >= limit) break;
    // ★시간 예산 — 브랜드가 늘어도 수확 전체를 붙잡지 않는다(비공식 엔드포인트는 느려질 수 있다)
    if (Date.now() - startedAt > budgetMs) { console.log(`[brand-buzz] 시간 예산 소진 — ${out.length}개에서 중단`); break; }
    let items: string[] = [];
    try { items = await fetchNaverAutocomplete(brand); } catch { continue; }
    for (const raw of items) {
      const kw = String(raw).trim();
      if (!kw || kw.length < 4 || kw.length > 30) continue;
      if (!kw.includes(brand)) continue;          // 브랜드가 빠진 제안은 다른 얘기다
      if (!BUZZ_RE.test(kw)) continue;            // 이벤트·혜택 신호가 없으면 일반 정보
      if (BUZZ_BLOCK.test(kw)) continue;          // 대출 유인 계열 배제
      const nk = kw.replace(/\s+/g, "");
      if (seen.has(nk)) continue;
      seen.add(nk);
      out.push({ keyword: kw, brand });
      break; // 브랜드당 1개 — 한 브랜드가 보드를 먹지 않게
    }
    await new Promise((r) => setTimeout(r, 120)); // 예의 있는 간격
  }
  return out.slice(0, limit);
}

/** 이 카테고리에 브랜드 축이 정의돼 있는가(없으면 수확 자체를 건너뛴다). */
export function hasBrandAxis(category: string): boolean {
  return Boolean(BRANDS[category] ?? BRANDS[Object.keys(BRANDS).find((k) => category.includes(k) || k.includes(category)) ?? ""]);
}
