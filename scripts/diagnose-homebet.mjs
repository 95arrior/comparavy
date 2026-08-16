// ★홈판 카드 결품 진단(2026-08-02) — 배합은 40%(열 4장)인데 화면에 2장만 떴다.
//  "안 터진 것"이 아니라 "쏘지 않은 것"이라는 진단을 한 단계 더 좁힌다: 어디서 몇 장이 떨어지나.
//  손실 지점은 두 곳이다 — ①카드 생성(genOne: 뉴스 없음·금지어·투자권유·JSON·제목규격) ②하류 필터(usedSet·finalGate·중복).
//  ★감으로 단정하지 않는다. 실제로 돌려서 유형별 생사를 센다.
//  실행: node --env-file=.env.local --import tsx scripts/diagnose-homebet.mjs
import { pickHomefeedBets } from "../lib/homefeedBet.ts";
import { finalGate } from "../lib/cardFinalGate.ts";
import { fetchNews } from "../lib/newsTopics.ts";

const WANT = Number(process.env.WANT ?? 4); // 열 쿼터(신생 short 열의 homefeed 몫)
const SUB = process.env.SUB ?? "경제·재테크";

if (!process.env.ANTHROPIC_API_KEY) { console.log("ANTHROPIC_API_KEY 없음 — 중단"); process.exit(1); }

// ① 뉴스 그라운딩 선행 확인 — '시장 급변 번역' 유형은 기사를 못 받으면 무조건 스킵된다(설계).
const news = await fetchNews("증시 환율 금리");
console.log(`\n[선행] 뉴스 그라운딩: ${news.length}건 ${news.length ? "OK" : "★없음 — '시장 급변 번역' 유형은 이 시점에 항상 스킵된다"}`);
if (!process.env.NAVER_DATALAB_CLIENT_ID) console.log("        (NAVER_DATALAB_CLIENT_ID 없음 — 로컬에선 뉴스 0이 정상, 운영과 다를 수 있음)");

// ② 캐시를 태우지 않는 스텁 db — 조회는 미스, 저장은 무시(둘 다 원 코드가 try/catch로 감싼다)
const db = {
  from() {
    return {
      select() { return { eq() { return { maybeSingle: async () => ({ data: null }) }; } }; },
      upsert: async () => ({}),
    };
  },
};

console.log(`\n[생성] 쿼터 ${WANT}장 요청 (내부적으로 ${Math.min(8, WANT + 3)}유형 시도)`);
console.log("       ↓ 실패는 아래 [homebet] 로그로 사유가 찍힌다\n");

const t0 = Date.now();
const bets = await pickHomefeedBets(db, "diag-user", SUB, new Set(), WANT);
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n[결과] 생성 통과 ${bets.length}/${WANT}장 (${secs}초)`);
for (const b of bets) {
  console.log(`  · [${b.betType}] ${b.title}`);
  console.log(`      키워드: ${b.keyword} | 썸네일: ${b.thumbCopy} | 제목유형: ${b.titleType ?? "(없음)"}`);
}

// ③ 하류 필터 — 생성을 통과해도 여기서 또 떨어진다(보드에 실제로 서빙되는 장수는 이 뒤의 수)
console.log(`\n[하류] finalGate 통과 여부 — 생성 통과분이 보드까지 가는지`);
let served = 0;
for (const b of bets) {
  const g = finalGate([{ keyword: b.keyword, title: b.title }], { anchorKeyword: true });
  const pass = g.pass.length > 0;
  if (pass) served++;
  const why = pass ? "" : ` ← ${JSON.stringify(g.dropped?.[0] ?? g).slice(0, 160)}`;
  console.log(`  ${pass ? "통과" : "탈락"} | ${b.keyword}${why}`);
}

console.log(`\n═══ 요약 ═══`);
console.log(`  쿼터 ${WANT}장 → 생성 ${bets.length}장 → 보드 서빙 ${served}장`);
if (served < WANT) {
  console.log(`  ★결품 ${WANT - served}장. 손실 지점: 생성 ${WANT - bets.length}장 / 하류 게이트 ${bets.length - served}장`);
  console.log(`  → 생성 손실이 크면 유형별 실패 사유(위 [homebet] 로그)를 보고 그 유형을 고친다.`);
  console.log(`  → 하류 손실이 크면 finalGate가 홈판 글감을 검색 글감 기준으로 재단하고 있는지 본다.`);
} else {
  console.log(`  결품 없음 — 이 조건에서는 쿼터를 채운다.`);
}
