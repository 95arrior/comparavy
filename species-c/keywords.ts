// [species-c] §4 문제 키워드 발굴·실측 — 바늘 광산(LLM 3층 + 자동완성 재귀 + 조합 매트릭스) 전량 실측 → 황금 판정.
import { JOURNEY_SCORE, KEYWORD_BAND } from "./config";
import { MATRIX } from "./matrix.config";
import { expandAutocomplete, fetchBlogTotal, fetchVolumes } from "./copied/naverApi";
import { askJson } from "./llm";
import type { ArticleType, KeywordCand, KeywordLayer, KeywordResult, Product } from "./types";

interface RawCand { keyword: string; layer: KeywordLayer; source: KeywordCand["source"] }

/** 자동완성·매트릭스 후보의 층 판정(휴리스틱) */
function guessLayer(kw: string): KeywordLayer {
  if (/(추천|비교|vs|순위|살까|어떤)/.test(kw)) return "purchase";
  if (/(원인|이유|왜|차이|뜻)/.test(kw)) return "info";
  if (/(사용법|세척|세탁법|청소법|관리법|보관법)/.test(kw)) return "owner";
  return "problem";
}

/** ★황금 판정(확장 라운드): 검색량 100~2,000 AND blog_total<500 AND 여정 만점 */
export function judgeGolden(vol: number, blogTotal: number, journeyScore: number): { golden: boolean; goldBadge: boolean } {
  return { golden: vol >= 100 && vol <= 2000 && blogTotal < 500 && journeyScore >= 2, goldBadge: blogTotal < 300 };
}

// ★'추천' 꼬리 감점(2026-07-16 유저 승인 — 200키워드 SERP 실측 자료): 'OO 추천' 검색은 인기글 블록을
//  카페·광고가 잠식(온수매트 추천 블로그 0%, 추천류 0~27%) vs 품명·비용·비교 꼬리는 블로그 89~91%.
//  ★blog_total이 적어도 함정 — 블로그 문서가 적은 건 블로그가 그 판에서 못 이겨서다(황금 판정이 속는 지점).
//  그래서 정렬에서 황금보다 먼저 강등하되, 컷은 아니다(대안이 전무하면 쓴다). '추천인'처럼 뒤에 글자가 붙으면 무관.
export const RECO_TAIL_RE = /추천(?![가-힣])/;
export function serpTailFactor(kw: string): number { return RECO_TAIL_RE.test(kw) ? 0.3 : 1; }
/** 후보 정렬(1글 1바늘 메인 선정 순서) — ①추천 꼬리 아님 ②황금 ③점수. 테스트 가능하게 분리. */
export function orderCandidates<T extends { keyword: string; golden: boolean; finalScore: number }>(cands: T[]): T[] {
  const reco = (c: T) => (RECO_TAIL_RE.test(c.keyword) ? 1 : 0);
  return [...cands].sort((a, b) => reco(a) - reco(b) || Number(b.golden) - Number(a.golden) || b.finalScore - a.finalScore);
}

export async function discoverKeywords(p: Product, hasCompare: boolean, seasonScore: number): Promise<KeywordResult> {
  // ── 소스 1: LLM 3층
  const raw = await askJson<{ keyword: string; layer: KeywordLayer }[]>(
    [
      `상품: "${p.name}" (카테고리: ${p.category}, 가격 ${p.price.toLocaleString()}원)`,
      `이 상품이 해결하는 '문제 상황'을 검색하는 사람들의 네이버 검색어 후보를 ${KEYWORD_BAND.candidatesMin}~${KEYWORD_BAND.candidatesMax}개 만들어라.`,
      `반드시 세 층을 섞는다:`,
      `- problem(문제형): 문제 상황 그 자체. 예: "차 에어컨 냄새"`,
      `- purchase(구매직전형): "OO 추천", "OO 비교", "A vs B" 류.`,
      `- info(정보형): 원인·이유·방법을 묻는 검색. 예: "에어컨 냄새 원인"`,
      `owner(보유자형: 사용법·세척법 등 이미 산 사람의 검색)는 만들지 않는다.`,
      `규칙: 실제로 검색창에 칠 법한 2~6어절 한국어. 브랜드명 금지(상품명 복제 금지). 지역명 금지.`,
      `JSON 배열: [{"keyword":"차 에어컨 냄새","layer":"problem"}, ...]`,
    ].join("\n"),
    6000,
  );
  const cands: RawCand[] = raw.filter((r) => r.keyword && r.layer in JOURNEY_SCORE).map((r) => ({ keyword: r.keyword.trim(), layer: r.layer, source: "llm" as const }));
  if (cands.length < 5) throw new Error(`키워드 후보 부족(${cands.length}개) — LLM 재실행 필요`);

  // ── 소스 2: 자동완성 재귀 확장(깊이 2·중복 제거) — 문제형 상위 시드에서
  const seeds = cands.filter((c) => c.layer === "problem" || c.layer === "purchase").slice(0, 5).map((c) => c.keyword);
  const acFound = await expandAutocomplete(seeds);
  const brandRe = new RegExp(MATRIX.brandStop.join("|")); // 유통·타사만 스톱 — 자사 모델명은 구매직전 후보로 허용(교본 흡수)
  for (const kw of acFound.filter((k) => !brandRe.test(k)).slice(0, 25)) cands.push({ keyword: kw, layer: guessLayer(kw), source: "autocomplete" });

  // ── 소스 2.5: 자사 모델명 변형(교본 흡수 — 구체 모델명 검색은 구매 직전 최강. 자사명은 브랜드 스톱 예외)
  //  ★브랜드×명사 전조합 보강(실측 2026-07-16: '델레고 골프 쿨토시 팔토시 손등형'에서 앞토막 조합만 만들어
  //  ★황금 '델레고 팔토시'(180/277 사전 실측)가 후보에 아예 없었음 — 메인이 '여름 팔토시 추천' 밴드 외로 추락)
  const nameToks = p.name.split(/\s+/).filter((t) => /^[가-힣a-zA-Z0-9]{2,}$/.test(t));
  if (nameToks.length >= 2) {
    const brand = nameToks[0]!;
    const variants = new Set<string>([
      nameToks.slice(0, 2).join(" "),
      nameToks.slice(0, 3).join(" "),
      ...nameToks.slice(1).map((t) => `${brand} ${t}`), // 브랜드 × 각 카테고리 명사(델레고 쿨토시·델레고 팔토시…)
    ]);
    for (const v of variants) cands.push({ keyword: v, layer: "purchase", source: "llm" });
  }

  // ── 소스 3: 조합 매트릭스([상황]×[대상]×[문제], 사전=matrix.config.ts) — 상한 내 전량 실측
  const core = p.category.split(/\s+/).filter((t) => t.length >= 2)[0] ?? p.name.split(/\s+/)[0] ?? "";
  const combos: string[] = [];
  for (const prob of MATRIX.problems) {
    for (const sit of MATRIX.situations) combos.push(`${sit} ${core} ${prob}`);
    for (const tg of MATRIX.targets) combos.push(`${tg} ${core} ${prob}`);
  }
  for (const kw of combos.slice(0, MATRIX.measureCap)) cands.push({ keyword: kw, layer: guessLayer(kw), source: "matrix" });

  // 중복 제거(공백 무시)
  const uniqMap = new Map<string, RawCand>();
  for (const c of cands) { const k = c.keyword.replace(/\s+/g, ""); if (!uniqMap.has(k)) uniqMap.set(k, c); }
  const uniq = [...uniqMap.values()];

  // ── 전량 실측(fail-closed): 검색량 → 통과분만 blog_total(비용 통제: 여정·검색량 상위 35개)
  const vols = await fetchVolumes(uniq.map((r) => r.keyword));
  const withVol = uniq
    .map((r) => ({ r, vol: vols.get(r.keyword) ?? null }))
    .filter((x): x is { r: RawCand; vol: number } => x.vol != null && x.vol >= 50)
    .sort((a, b) => (JOURNEY_SCORE[b.r.layer] ?? 0) - (JOURNEY_SCORE[a.r.layer] ?? 0) || b.vol - a.vol)
    .slice(0, 35);
  const measured: KeywordCand[] = [];
  for (const { r, vol } of withVol) {
    const blogTotal = await fetchBlogTotal(r.keyword);
    if (blogTotal == null) continue; // 실측 실패 = 폐기
    const journeyScore = JOURNEY_SCORE[r.layer] ?? 0;
    const { golden, goldBadge } = judgeGolden(vol, blogTotal, journeyScore);
    // 밴드: SEEDLING 유지 — 단 ★황금 태그는 하한(500) 예외
    const inBand = ((vol >= KEYWORD_BAND.volMin) || golden) && vol <= KEYWORD_BAND.volMax && blogTotal < KEYWORD_BAND.blogTotalMax;
    const finalScore = journeyScore * (vol / Math.max(1, blogTotal)) * (inBand ? 1 : 0.25) * (golden ? 2 : 1) * serpTailFactor(r.keyword);
    measured.push({ keyword: r.keyword, layer: r.layer, source: r.source, vol, blogTotal, journeyScore, finalScore, inBand, golden, goldBadge });
    await new Promise((res) => setTimeout(res, 150));
  }
  if (!measured.length) throw new Error("실측 통과 후보 0개 — API 키·후보 품질 확인");

  // ── ★상품 정합 판정(실측 사고: '제거제' 키워드가 '건조기' 글 메인으로) — 검색자가 이 상품으로 만족하는가(검색자=손님)
  let fitChecked = measured;
  try {
    const fitJudge = await askJson<{ keyword: string; fit: boolean }[]>(
      [
        `상품: "${p.name}" (${p.category})`,
        `아래 검색어 각각에 대해: 이 검색어를 친 사람에게 이 상품을 권하면 자연스러운가? 다른 제품군(스프레이·제거제 등 상품과 다른 물건)을 찾는 검색이면 fit=false.`,
        JSON.stringify(measured.map((m) => m.keyword)),
        `JSON: [{"keyword":"...","fit":true}, ...] 전 항목.`,
      ].join("\n"),
      4000,
    );
    const fitMap = new Map(fitJudge.map((f) => [f.keyword.replace(/\s+/g, ""), f.fit]));
    const kept = measured.filter((m) => fitMap.get(m.keyword.replace(/\s+/g, "")) !== false);
    if (kept.length) fitChecked = kept;
  } catch { /* 판정 실패 = 전체 유지(fail-open — 실측은 이미 끝난 후보들) */ }

  // ── 1글 1바늘: 메인은 ①추천 꼬리 아님 ②황금 ③점수순 1개만(추천 꼬리는 황금이어도 강등 — SERP 실측 근거)
  const sorted = orderCandidates(fitChecked);
  const banded = sorted.filter((c) => c.inBand);
  const pickFrom = banded.length ? banded : sorted;
  const main = pickFrom[0]!;
  const subs = pickFrom.slice(1, 1 + KEYWORD_BAND.subKeywords);

  const articleType: ArticleType = hasCompare ? "compare"
    : seasonScore > 0 && main.layer === "purchase" ? "season-preempt"
    : main.layer === "purchase" && /추천|비교|고르|어떤/.test(main.keyword) ? "how-to-choose"
    : "problem-solve";

  return { main, subs, all: sorted, articleType };
}
