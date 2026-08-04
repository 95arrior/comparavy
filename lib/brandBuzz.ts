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
import { fetchKeywordMomentum } from "./naverDatalab";

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

// ★돈 축(2026-08-05 유저: "뱅크 쪽만 하지 말고 청약·지원금·재테크, 사람들이 포모 오는 걸 다 가져와야 한다").
//  브랜드는 '누가'이고, 이건 '무엇'이다. 사람이 검색창에 치는 시작 말들 — 뒤에 붙는 말이 곧 지금 뜨는 이슈다.
//  ★각 축은 자기 신호어를 갖는다. 브랜드엔 '이벤트·캡슐'이 맞고, 청약엔 '무순위·특별공급'이 맞다.
const MONEY_AXES: { seed: string; signal: RegExp }[] = [
  // 청약 — 행동 창이 명확하고 경쟁이 곧 화제다
  { seed: "청약", signal: /(무순위|줍줍|특별공급|사전청약|경쟁률|당첨|추첨|일정|공고|미분양|잔여세대)/ },
  { seed: "아파트 청약", signal: /(무순위|특별공급|경쟁률|당첨|일정|공고)/ },
  // 지원금·환급 — 결핍과 마감이 동시에 걸린다
  { seed: "지원금", signal: /(신청|지급|대상|기간|접수|마감|조회|얼마|받는법)/ },
  { seed: "정부지원금", signal: /(신청|지급|대상|기간|접수|조회|얼마)/ },
  { seed: "환급금", signal: /(조회|신청|숨은|미환급|찾는법|얼마)/ },
  { seed: "바우처", signal: /(신청|지급|대상|사용처|기간|잔액)/ },
  // 재테크 — 지금 돈이 몰리는 곳
  { seed: "공모주", signal: /(청약|일정|경쟁률|상장|환불|따상|수요예측)/ },
  { seed: "적금", signal: /(특판|금리|이벤트|고금리|비교|만기)/ },
  { seed: "파킹통장", signal: /(금리|비교|이벤트|한도)/ },
  { seed: "앱테크", signal: /(추천|순위|하루|포인트|현금화)/ },
  // 세금 — 시기마다 폭발한다
  { seed: "연말정산", signal: /(환급|공제|간소화|일정|추가납부)/ },
  { seed: "종합소득세", signal: /(신고|기간|환급|대상|가산세)/ },
  { seed: "재산세", signal: /(납부|조회|기간|카드|분납)/ },
];

// ★이벤트·혜택 신호 — 이게 붙어야 '지금 뜨는 돈 되는 말'이다. 없으면 브랜드 일반 정보라 안 들인다.
const BUZZ_RE = /(이벤트|캡슐|룰렛|출석|퀴즈|응모|당첨|쿠폰|캐시백|리워드|포인트|적금|특판|파킹|무료|지급|혜택|추첨|선착순|오픈)/;
// 대출 유인·사칭 계열은 아예 배제(3원칙의 법적 안전 — 여기서도 같은 선을 지킨다)
const BUZZ_BLOCK = /(대출|한도조회|신용점수|연체|회생|파산)/;

export interface BrandBuzz { keyword: string; brand: string; momentum?: number; peakDaysAgo?: number }

// ★선도 기준(2026-08-05 유저: "일주일 지나 지금 나오면 선점 실패").
//  자동완성에 남아 있다 ≠ 지금 뜨는 중이다. 피크가 지난 이벤트는 이미 남들이 다 썼다.
//  최근 3일이 그 앞 7일의 이 비율 밑으로 떨어졌으면 창이 닫힌 것으로 본다.
const MOMENTUM_MIN = 0.75;
//  그리고 최고점이 이 날짜보다 오래됐으면, 지금 오르는 것처럼 보여도 늦은 것이다.
const PEAK_MAX_DAYS = 6;

/**
 * 브랜드별 자동완성에서 '이벤트·혜택' 신호가 붙은 실제 검색어를 거둔다.
 * ★실패는 조용히 건너뛴다(비공식 엔드포인트) — 이 수확기가 죽어도 기존 씨앗 파이프는 그대로 돈다.
 */
export async function harvestBrandBuzz(category: string, limit = 6, budgetMs = 12_000): Promise<BrandBuzz[]> {
  const brands = BRANDS[category] ?? BRANDS[Object.keys(BRANDS).find((k) => category.includes(k) || k.includes(category)) ?? ""];
  if (!brands?.length) return [];
  // ★브랜드 축과 돈 축을 함께 돈다 — 브랜드만 돌면 '은행 이벤트 블로그'가 된다(유저 지적).
  //  돈 축이 먼저다: 청약·지원금은 검색량도 크고 행동 창(마감)이 있어 포모가 세다.
  const axes: { seed: string; signal: RegExp }[] = [
    ...MONEY_AXES,
    ...brands.map((b) => ({ seed: b, signal: BUZZ_RE })),
  ];
  const startedAt = Date.now();
  const out: BrandBuzz[] = [];
  const seen = new Set<string>();
  for (const { seed: axis, signal } of axes) {
    if (out.length >= limit) break;
    // ★시간 예산 — 축이 늘어도 수확 전체를 붙잡지 않는다(비공식 엔드포인트는 느려질 수 있다)
    if (Date.now() - startedAt > budgetMs) { console.log(`[buzz] 시간 예산 소진 — ${out.length}개에서 중단`); break; }
    let items: string[] = [];
    try { items = await fetchNaverAutocomplete(axis); } catch { continue; }
    for (const raw of items) {
      const kw = String(raw).trim();
      if (!kw || kw.length < 4 || kw.length > 30) continue;
      if (!kw.includes(axis)) continue;           // 축이 빠진 제안은 다른 얘기다
      if (!signal.test(kw)) continue;             // 그 축의 신호가 없으면 일반 정보
      if (BUZZ_BLOCK.test(kw)) continue;          // 대출 유인 계열 배제
      const nk = kw.replace(/\s+/g, "");
      if (seen.has(nk)) continue;
      seen.add(nk);
      out.push({ keyword: kw, brand: axis });
      break; // 축당 1개 — 한 축이 보드를 먹지 않게
    }
    await new Promise((r) => setTimeout(r, 120)); // 예의 있는 간격
  }
  if (!out.length) return out;

  // ★선도 판정 — 데이터랩 일별 추이로 '지금 열려 있는 창'만 남긴다(한 번의 호출로 최대 5개).
  //  ★판정 불가(키 없음·API 실패)는 통과로 둔다 — 재는 도구가 죽었다고 수확까지 멈추면 안 된다.
  try {
    const mo = await fetchKeywordMomentum(out.map((b) => b.keyword));
    if (mo.size) {
      const kept: BrandBuzz[] = [];
      for (const b of out) {
        const m = mo.get(b.keyword);
        if (!m) { kept.push(b); continue; } // 판정 불가 = 통과
        b.momentum = Math.round(m.ratio * 100) / 100;
        b.peakDaysAgo = m.peakDaysAgo;
        if (m.ratio < MOMENTUM_MIN || m.peakDaysAgo > PEAK_MAX_DAYS) {
          console.log(`[brand-buzz] 선점 창 닫힘 — 제외: ${b.keyword} (모멘텀 ${b.momentum}, 피크 ${m.peakDaysAgo}일 전)`);
          continue;
        }
        kept.push(b);
      }
      return kept.slice(0, limit);
    }
  } catch { /* 판정 실패 = 전부 통과(수확을 막지 않는다) */ }
  return out.slice(0, limit);
}

/** 이 카테고리에 브랜드 축이 정의돼 있는가(없으면 수확 자체를 건너뛴다). */
export function hasBrandAxis(category: string): boolean {
  return Boolean(BRANDS[category] ?? BRANDS[Object.keys(BRANDS).find((k) => category.includes(k) || k.includes(category)) ?? ""]);
}
