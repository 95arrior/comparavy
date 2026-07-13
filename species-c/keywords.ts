// [species-c] §4 문제 키워드 발굴·실측 — LLM 후보 3층 → 광고 API 검색량 + 검색 API blog_total 전량 실측(실측 불가=폐기).
import { JOURNEY_SCORE, KEYWORD_BAND } from "./config";
import { fetchBlogTotal, fetchVolumes } from "./copied/naverApi";
import { askJson } from "./llm";
import type { ArticleType, KeywordCand, KeywordLayer, KeywordResult, Product } from "./types";

interface RawCand { keyword: string; layer: KeywordLayer }

export async function discoverKeywords(p: Product, hasCompare: boolean, seasonScore: number): Promise<KeywordResult> {
  const raw = await askJson<RawCand[]>(
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
    1500,
  );

  const uniq = [...new Map(raw.filter((r) => r.keyword && r.layer in JOURNEY_SCORE).map((r) => [r.keyword.trim(), r])).values()];
  if (uniq.length < 5) throw new Error(`키워드 후보 부족(${uniq.length}개) — LLM 재실행 필요`);

  // 전량 실측(§4: 실측 불가 후보는 폐기 — fail-closed)
  const vols = await fetchVolumes(uniq.map((r) => r.keyword));
  const measured: KeywordCand[] = [];
  for (const r of uniq) {
    const vol = vols.get(r.keyword) ?? null;
    if (vol == null) continue; // 검색량 실측 실패 = 폐기
    const blogTotal = await fetchBlogTotal(r.keyword);
    if (blogTotal == null) continue; // 경쟁 실측 실패 = 폐기
    const journeyScore = JOURNEY_SCORE[r.layer] ?? 0;
    const inBand = vol >= KEYWORD_BAND.volMin && vol <= KEYWORD_BAND.volMax && blogTotal < KEYWORD_BAND.blogTotalMax;
    const finalScore = journeyScore * (vol / Math.max(1, blogTotal)) * (inBand ? 1 : 0.25);
    measured.push({ keyword: r.keyword, layer: r.layer, vol, blogTotal, journeyScore, finalScore, inBand });
    await new Promise((res) => setTimeout(res, 150));
  }
  if (!measured.length) throw new Error("실측 통과 후보 0개 — API 키·후보 품질 확인");

  const sorted = [...measured].sort((a, b) => b.finalScore - a.finalScore);
  const banded = sorted.filter((c) => c.inBand);
  const pickFrom = banded.length ? banded : sorted; // 밴드 내 우선, 전멸 시 차선(경고는 finalScore 감쇠로 이미 반영)
  const main = pickFrom[0]!;
  const subs = pickFrom.slice(1, 1 + KEYWORD_BAND.subKeywords);

  // §7-3 글 유형 자동 판정
  const articleType: ArticleType = hasCompare ? "compare"
    : seasonScore > 0 && main.layer === "purchase" ? "season-preempt"
    : main.layer === "purchase" && /추천|비교|고르|어떤/.test(main.keyword) ? "how-to-choose"
    : "problem-solve";

  return { main, subs, all: sorted, articleType };
}
