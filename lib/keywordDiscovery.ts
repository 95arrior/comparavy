// 황금 키워드 발굴 코어 — 주제 1개 → 네이버 시드 → AI 재구성 → 네이버 재검증 → 스위트스팟 스코어.
// 기존 /api/keywords/discover 의 로직을 그대로 추출해, 라우트(사용자 발굴)와 풀 적재 스크립트가 공유한다.
// (인증·rate limit·logUsage 등 요청 컨텍스트는 호출부가 담당. 여기는 순수 발굴 로직.)
import { fetchRelatedKeywords, fetchKeywordStats, buildStatsPool, normalizeKey } from "./naverKeyword";
import { filterAndScore, reconstructKeywords, scoreValidated, type GoldenKeyword } from "./goldenKeyword";

const SEED_LIMIT = 60; // AI 재구성에 넣을 시드(재료 단어) 상한
const RESULT_LIMIT = 30; // 최종 추천 개수

export interface DiscoveryResult {
  keywords: GoldenKeyword[];
  total: number; // 네이버 연관키워드 총 개수
  usedAi: boolean; // AI 재구성이 실제로 돌았는지
  usage: { inputTokens?: number; outputTokens?: number } | null; // 토큰 사용량(호출부에서 로깅)
}

export async function discoverKeywords(topic: string, resultLimit = RESULT_LIMIT): Promise<DiscoveryResult> {
  // 1) 네이버 시드 수집 (실패 시 throw → 호출부가 처리)
  const related = await fetchRelatedKeywords(topic);

  // 2) 시드 정제(거래형·저검색·고경쟁 제거) → AI 재료(상위 단어)
  const scored = filterAndScore(related);
  const seeds = scored.slice(0, SEED_LIMIT).map((s) => s.keyword);

  // 3) AI 재구성(haiku 1회): 단어 → 정보형 롱테일 구
  const { phrases, usage, usedAi } = await reconstructKeywords(topic, seeds);

  // 4) 재검증(하이브리드) + 5) 스위트스팟 스코어
  let keywords: GoldenKeyword[] = [];
  if (phrases.length > 0) {
    const pool = buildStatsPool(related);
    const heads = new Set<string>();
    for (const p of phrases) heads.add(p.trim().split(/\s+/).slice(0, 2).join(" "));
    const missing = Array.from(heads).filter((q) => q && !pool.has(normalizeKey(q)));
    if (missing.length > 0) {
      const extra = await fetchKeywordStats(missing);
      for (const [k, v] of extra) if (!pool.has(k)) pool.set(k, v);
    }
    keywords = scoreValidated(phrases, pool, 180, 250, resultLimit);
    if (keywords.length < 20) {
      keywords = scoreValidated(phrases, pool, 120, 180, resultLimit);
    }
  }

  // 6) 폴백: AI가 아예 안 돌았을 때만(키 없음·오류) 정제 시드 단어로 채운다.
  if (!usedAi && keywords.length < resultLimit) {
    const seen = new Set(keywords.map((k) => normalizeKey(k.keyword)));
    for (const s of scored) {
      const nk = normalizeKey(s.keyword);
      if (seen.has(nk)) continue;
      seen.add(nk);
      keywords.push({ keyword: s.keyword, monthlyMobileQcCnt: s.monthlyMobileQcCnt, compIdx: s.compIdx, highVolume: s.highVolume, estimated: false });
      if (keywords.length >= resultLimit) break;
    }
  }

  return { keywords, total: related.length, usedAi, usage: usage ?? null };
}
