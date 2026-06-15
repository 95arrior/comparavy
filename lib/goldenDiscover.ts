// 황금 키워드 B 파이프라인 공용 함수.
// 키워드 발굴(discover 라우트)과 동일한 로직을 추출해 연구소 '주목 키워드'에도 같이 쓴다.
// (discover 라우트·goldenKeyword 코어는 건드리지 않고 동일 흐름을 재구성)
import { fetchRelatedKeywords, fetchKeywordStats, buildStatsPool, normalizeKey } from "./naverKeyword";
import { filterAndScore, reconstructKeywords, scoreValidated, type GoldenKeyword } from "./goldenKeyword";

const SEED_LIMIT = 60;

export interface DiscoverResult {
  keywords: GoldenKeyword[];
  usedAi: boolean;
  usage: { inputTokens?: number; outputTokens?: number } | null;
}

/**
 * 주제 → 정보형 황금 키워드 (B구조): 네이버 시드 → AI 재구성 → 핵심 재검증 → 스위트스팟 스코어.
 * @param topic 검색 주제(세부 또는 대분류)
 * @param limit 상위 N
 */
export async function discoverGolden(topic: string, limit: number): Promise<DiscoverResult> {
  const related = await fetchRelatedKeywords(topic);

  // 시드 정제 → AI 재료
  const scored = filterAndScore(related);
  const seeds = scored.slice(0, SEED_LIMIT).map((s) => s.keyword);

  // AI 재구성: 단어 → 정보형 롱테일 구
  const { phrases, usage, usedAi } = await reconstructKeywords(topic, seeds);

  let keywords: GoldenKeyword[] = [];
  if (phrases.length > 0) {
    // 재검증: 초기 연관키워드 무료 풀 + 없는 '핵심(2단어)'만 재조회(429 방어)
    const pool = buildStatsPool(related);
    const heads = new Set<string>();
    for (const p of phrases) heads.add(p.trim().split(/\s+/).slice(0, 2).join(" "));
    const missing = Array.from(heads).filter((q) => q && !pool.has(normalizeKey(q)));
    if (missing.length > 0) {
      const extra = await fetchKeywordStats(missing);
      for (const [k, v] of extra) if (!pool.has(k)) pool.set(k, v);
    }
    keywords = scoreValidated(phrases, pool, 180, 250, limit);
    if (keywords.length < limit) keywords = scoreValidated(phrases, pool, 120, 180, limit);
  }

  // 폴백: AI 미작동(키 없음/오류)일 때만 정제 시드로 최소 보충
  if (!usedAi && keywords.length < limit) {
    const seen = new Set(keywords.map((k) => normalizeKey(k.keyword)));
    for (const s of scored) {
      const nk = normalizeKey(s.keyword);
      if (seen.has(nk)) continue;
      seen.add(nk);
      keywords.push({ keyword: s.keyword, monthlyMobileQcCnt: s.monthlyMobileQcCnt, compIdx: s.compIdx, highVolume: s.highVolume, estimated: false });
      if (keywords.length >= limit) break;
    }
  }

  return { keywords, usedAi, usage };
}
