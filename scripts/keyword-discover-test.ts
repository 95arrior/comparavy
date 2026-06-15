/**
 * 황금 키워드 발굴 파이프라인 검증 스크립트 (라우트와 동일 로직을 인증 없이 직접 실행).
 *   네이버 → 필터1·2+스코어(filterAndScore) → AI 필터3·4(classifyInformational) → 상위 30
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/keyword-discover-test.ts
 *   ... scripts/keyword-discover-test.ts 강아지 재테크
 *
 * 주의: ANTHROPIC_API_KEY가 .env에 없으면 AI 필터(의도·일관성)는 fail-open으로 전량 통과한다.
 *       (필터1·2+스코어는 그래도 검증됨.)
 */
import { fetchRelatedKeywords, hasNaverAdEnv } from "../lib/naverKeyword";
import { filterAndScore, classifyInformational } from "../lib/goldenKeyword";

const TOPICS = process.argv.slice(2).length ? process.argv.slice(2) : ["강아지", "재테크"];
const MAX_FOR_AI = 40;
const RESULT_LIMIT = 30;

async function main() {
  if (!hasNaverAdEnv()) {
    console.error("❌ .env에 NAVER_AD_* 키가 없습니다.");
    process.exit(1);
  }
  const hasAi = Boolean(process.env.ANTHROPIC_API_KEY);
  console.log(`AI 필터(의도·일관성): ${hasAi ? "ON" : "OFF (ANTHROPIC_API_KEY 없음 → fail-open 전량통과)"}`);
  console.log("=".repeat(72));

  for (const topic of TOPICS) {
    const related = await fetchRelatedKeywords(topic);
    const scored = filterAndScore(related);
    const forAi = scored.slice(0, MAX_FOR_AI);
    const { keep, usedAi } = await classifyInformational(topic, forAi.map((k) => k.keyword));
    const final = forAi.filter((k) => keep.has(k.keyword)).slice(0, RESULT_LIMIT);

    console.log(`\n■ "${topic}"`);
    console.log(`  네이버 ${related.length}개 → 필터1·2 통과 ${scored.length}개 → AI판별(${usedAi ? "ON" : "fail-open"}) → 최종 ${final.length}개\n`);
    final.forEach((k, i) => {
      const warn = k.highVolume ? " ⚠️검색량많음" : "";
      console.log(`  ${String(i + 1).padStart(2)}. ${k.keyword.padEnd(22)} 월 ${k.monthlyMobileQcCnt.toLocaleString("ko-KR").padStart(8)}회  [${k.compIdx}]${warn}`);
    });
  }
  console.log("\n" + "=".repeat(72));
  console.log("완료.");
}

main().catch((e) => { console.error(e); process.exit(1); });
