/**
 * 황금 키워드 발굴 — B 구조 파이프라인 검증 (라우트와 동일 로직을 인증 없이 직접 실행).
 *   네이버 시드 → AI 재구성(정보형 롱테일 구) → 네이버 재검증 → 스위트스팟 스코어 → 상위 30
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/keyword-discover-test.ts
 *   ... scripts/keyword-discover-test.ts 강아지 재테크
 *
 * 주의: ANTHROPIC_API_KEY가 .env에 없으면 AI 재구성이 안 돼 폴백(시드 단어)으로 떨어진다.
 */
import { fetchRelatedKeywords, fetchKeywordStats, buildStatsPool, hasNaverAdEnv, normalizeKey } from "../lib/naverKeyword";
import { filterAndScore, reconstructKeywords, scoreValidated, type GoldenKeyword } from "../lib/goldenKeyword";

const TOPICS = process.argv.slice(2).length ? process.argv.slice(2) : ["강아지", "재테크"];
const SEED_LIMIT = 60;
const RESULT_LIMIT = 30;

async function discover(topic: string) {
  const related = await fetchRelatedKeywords(topic);
  const scored = filterAndScore(related);
  const seeds = scored.slice(0, SEED_LIMIT).map((s) => s.keyword);

  const { phrases, usedAi } = await reconstructKeywords(topic, seeds);

  let keywords: GoldenKeyword[] = [];
  let pooled = 0;
  let requeried = 0;
  if (phrases.length > 0) {
    const pool = buildStatsPool(related);
    const heads = new Set<string>();
    for (const p of phrases) heads.add(p.trim().split(/\s+/).slice(0, 2).join(" "));
    const missing = Array.from(heads).filter((q) => q && !pool.has(normalizeKey(q)));
    requeried = missing.length;
    if (missing.length > 0) {
      const extra = await fetchKeywordStats(missing);
      for (const [k, v] of extra) if (!pool.has(k)) pool.set(k, v);
    }
    pooled = pool.size;
    keywords = scoreValidated(phrases, pool, 300, 500, RESULT_LIMIT);
    if (keywords.length < 15) keywords = scoreValidated(phrases, pool, 150, 300, RESULT_LIMIT);
  }
  let fellBack = false;
  if (!usedAi && keywords.length < RESULT_LIMIT) {
    fellBack = true;
    const seen = new Set(keywords.map((k) => normalizeKey(k.keyword)));
    for (const s of scored) {
      const nk = normalizeKey(s.keyword);
      if (seen.has(nk)) continue;
      seen.add(nk);
      keywords.push({ keyword: s.keyword, monthlyMobileQcCnt: s.monthlyMobileQcCnt, compIdx: s.compIdx, highVolume: s.highVolume, estimated: false });
      if (keywords.length >= RESULT_LIMIT) break;
    }
  }
  return { relatedCount: related.length, seedCount: scored.length, phraseCount: phrases.length, usedAi, pooled, requeried, fellBack, keywords };
}

async function main() {
  if (!hasNaverAdEnv()) {
    console.error("❌ .env에 NAVER_AD_* 키가 없습니다.");
    process.exit(1);
  }
  console.log(`AI 재구성: ${process.env.ANTHROPIC_API_KEY ? "ON" : "OFF(폴백)"}`);
  console.log("=".repeat(72));

  for (let t = 0; t < TOPICS.length; t++) {
    if (t > 0) await new Promise((r) => setTimeout(r, 1500)); // 토픽 간 간격(429 방지)
    const topic = TOPICS[t];
    const r = await discover(topic);
    console.log(`\n■ "${topic}"`);
    console.log(
      `  네이버 ${r.relatedCount} → 시드 ${r.seedCount} → AI 구 ${r.phraseCount}개(${r.usedAi ? "AI" : "폴백"})` +
        ` → 재조회 ${r.requeried}건 → 풀 ${r.pooled} → 최종 ${r.keywords.length}개${r.fellBack ? " ⚠️폴백보충" : ""}\n`,
    );
    r.keywords.forEach((k, i) => {
      const warn = k.highVolume ? " ⚠️많음" : "";
      const est = k.estimated ? " (추정)" : "";
      console.log(`  ${String(i + 1).padStart(2)}. ${k.keyword.padEnd(24)} 월 ${k.monthlyMobileQcCnt.toLocaleString("ko-KR").padStart(8)}회  [${k.compIdx}]${est}${warn}`);
    });
  }
  console.log("\n" + "=".repeat(72) + "\n완료.");
}

main().catch((e) => { console.error(e); process.exit(1); });
