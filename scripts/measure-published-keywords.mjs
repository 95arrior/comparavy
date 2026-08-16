// ★발행 글감 실측(2026-07-31) — pigtong.com 발행 26편의 '키워드 크기'를 네이버 검색광고 API로 잰다.
//  배경: 클릭 8회가 5개 글에만 났다(정기예금특판·저평가우량주·irp이전·cma계좌개설·회사채금리).
//  1차 가설('주말형 재고가 없다')은 사이트맵 확인으로 기각됐다 — 개념·비교·추천형 글이 오히려 다수였다.
//  2차 가설: 이긴 글은 '행동 직전 롱테일', 진 글은 '개념·추천 빅키워드'다. 요일이 아니라 키워드 크기 문제다.
//  ★감으로 단정하지 않는다 — 검색량·경쟁도를 실제로 재서 클릭 유무와 겹쳐 본다.
//  실행: node --env-file=.env --import tsx scripts/measure-published-keywords.mjs
import { fetchKeywordStats, hasNaverAdEnv } from "../lib/naverKeyword.ts";
import { topicIntent } from "../lib/cardFinalGate.ts";

// 사이트맵(post-sitemap.xml)에서 뽑은 발행 슬러그 26개. 클릭 난 글에 표시.
const CLICKED = new Set(["정기예금특판", "저평가우량주", "irp이전", "cma계좌개설", "회사채금리"]);
const SLUGS = [
  "저축은행종류", "회사채금리", "연말정산환급금", "로또세금", "긴급생계비", "금융기관",
  "베트남펀드", "보통주", "퇴직금계산방법", "온투업", "국내주식", "앱테크추천",
  "소상공인정책자금", "cma계좌개설", "퇴직연금세액공제", "cma통장추천", "모의주식",
  "정기예금특판", "저평가우량주", "중국etf", "코인종류", "irp이전", "미국etf추천",
  "국채금리", "증권수수료", "개인연금세액공제",
];

if (!hasNaverAdEnv()) { console.log("네이버 광고 API env 없음 — 중단"); process.exit(1); }

const stats = await fetchKeywordStats(SLUGS, 10);
const rows = SLUGS.map((s) => {
  const st = stats.get(s.replace(/\s+/g, "").toLowerCase()) ?? stats.get(s) ?? null;
  const total = st ? st.mobile + st.pc : null;
  return { kw: s, total, comp: st?.compIdx ?? "?", depth: st?.adDepth ?? null, clicked: CLICKED.has(s), intent: topicIntent(s) };
});

const known = rows.filter((r) => r.total !== null).sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
const unknown = rows.filter((r) => r.total === null);

console.log("\n검색량 큰 순 (월 PC+모바일)\n");
console.log("  클릭  검색량      경쟁    유형      키워드");
for (const r of known) {
  console.log(`  ${r.clicked ? " ★ " : "   "}  ${String(r.total).padStart(8)}  ${String(r.comp).padStart(4)}  ${r.intent.padEnd(6)}  ${r.kw}`);
}
if (unknown.length) console.log(`\n  (검색량 미확인 ${unknown.length}건: ${unknown.map((r) => r.kw).join(", ")})`);

// 클릭 난 글과 안 난 글의 검색량 분포 비교 — 2차 가설의 핵심 지표
const withV = known.filter((r) => (r.total ?? 0) > 0);
const med = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const hit = withV.filter((r) => r.clicked).map((r) => r.total);
const miss = withV.filter((r) => !r.clicked).map((r) => r.total);
console.log("\n■ 클릭 유무별 검색량");
console.log(`  클릭 있음 ${hit.length}건 — 중앙값 ${med(hit).toLocaleString()} / 최대 ${Math.max(...hit, 0).toLocaleString()}`);
console.log(`  클릭 없음 ${miss.length}건 — 중앙값 ${med(miss).toLocaleString()} / 최대 ${Math.max(...miss, 0).toLocaleString()}`);

const compOf = (list) => { const c = {}; for (const r of list) c[r.comp] = (c[r.comp] ?? 0) + 1; return Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · "); };
console.log("\n■ 클릭 유무별 경쟁도");
console.log(`  클릭 있음: ${compOf(withV.filter((r) => r.clicked))}`);
console.log(`  클릭 없음: ${compOf(withV.filter((r) => !r.clicked))}`);
// 유형 × 클릭 — 이번 측정의 핵심 지표
console.log("\n■ 글감 유형별 (전체)");
for (const t of ["행동판단", "용어", "중립"]) {
  const g = withV.filter((r) => r.intent === t);
  if (!g.length) continue;
  console.log(`  ${t.padEnd(6)} ${String(g.length).padStart(2)}편 · 클릭 ${g.filter((r) => r.clicked).length}편`);
}
// 거대 키워드를 빼고 같은 검색량 구간에서만 비교(크기 효과 분리)
const BAND = [300, 2000];
console.log(`\n■ 글감 유형별 (검색량 ${BAND[0]}~${BAND[1]} 구간만 — 크기 효과 분리)`);
for (const t of ["행동판단", "용어"]) {
  const g = withV.filter((r) => r.intent === t && r.total >= BAND[0] && r.total <= BAND[1]);
  if (!g.length) continue;
  console.log(`  ${t.padEnd(6)} ${String(g.length).padStart(2)}편 · 클릭 ${g.filter((r) => r.clicked).length}편   ${g.map((r) => (r.clicked ? "★" : "") + r.kw).join(" / ")}`);
}
console.log("\n※ 표본 26편·클릭 8회. 방향을 보는 용도이며 유의성 주장은 하지 않는다. 차단 승격은 표본 축적 후.");
