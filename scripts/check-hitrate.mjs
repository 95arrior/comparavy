// 글감 적중률 + 선점 판별 — 실행: npx tsx scripts/check-hitrate.mjs
// ★유저 요청(2026-08-05): "적중률 재는 기능 만들어주세요. 이번 주 테스트해봐야겠네요."
//  8/4엔 유저의 인기유입검색어 20개 중 우리 글감이 0개였다. 그 숫자가 오르는지를 봐야 한다.
// ★유저 제기: "선점하려면 검색량도 없어야 하고 문서수도 적은 부류여야 해서" —
//  맞는 말이고, 내가 넣은 수요 하한(월 100회)이 정확히 그 부류를 죽이고 있었다.
import fs from "node:fs";
import { keywordMatch, computeHits, sourceStats } from "../lib/topicHitrate.ts";
import { preemptVerdict } from "../lib/preemptGate.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 유입 검색어 ↔ 글감 대조:");
{
  ok(keywordMatch("근로장려금", "근로장려금 지급일"), "표기가 어긋나도 같은 의도면 적중");
  ok(keywordMatch("주민세 납부", "주민세"), "반대 방향도 잡는다");
  // ★헐거운 매칭은 숫자를 부풀린다 — 짧은 말이 우연히 박히는 걸 막는다
  ok(!keywordMatch("세금", "재산세금액조회"), "★2글자가 긴 말에 우연히 박히는 건 적중이 아니다");
  ok(!keywordMatch("", "주민세"), "빈 값은 적중이 아니다");
  ok(keywordMatch("페이코 포인트 출금", "페이코포인트출금"), "공백 표기 차이를 흡수한다");
}

console.log("\n② 적중 계산 — 먼저 낸 것이 이긴다:");
{
  const served = [
    { date: "2026-08-01", keyword: "주민세", norm: "주민세", seed_source: "calendar", lane: "trend", vol: 10040, blog_total: 5000, preempt: false },
    { date: "2026-08-04", keyword: "주민세 납부", norm: "주민세납부", seed_source: "gov", lane: "trend", vol: 900, blog_total: 3000, preempt: false },
    { date: "2026-08-04", keyword: "엉뚱한말", norm: "엉뚱한말", seed_source: "news", lane: "trend", vol: 100, blog_total: 100, preempt: false },
  ];
  const inflow = [{ date: "2026-08-05", keyword: "주민세 납부기간", inflow: 320 }];
  const hits = computeHits(served, inflow);
  ok(hits.length === 1, `유입어 하나에 적중 하나만 남는다 (${hits.length})`);
  ok(hits[0].lead_days === 4, `★선점 폭은 가장 먼저 낸 날 기준 (${hits[0].lead_days}일)`);
  ok(hits[0].seed_source === "calendar", "먼저 낸 원천이 공을 가져간다");
  // ★유입보다 나중에 낸 글감은 적중이 아니다(뒷북을 적중으로 세면 지표가 거짓말을 한다)
  const late = computeHits([{ ...served[0], date: "2026-08-09" }], inflow);
  ok(late.length === 0, "★유입 이후에 낸 글감은 적중이 아니다");

  const st = sourceStats(served, hits);
  const cal = st.find((s) => s.source === "calendar");
  const news = st.find((s) => s.source === "news");
  ok(cal?.hit === 1 && cal?.served === 1 && cal?.rate === 100, `분모는 그 원천이 낸 수 (calendar ${cal?.rate}%)`);
  ok(news?.hit === 0 && news?.served === 1, "★안 맞은 원천도 성적표에 남는다(빠지면 잘한 것처럼 보인다)");
}

console.log("\n③ 선점형 — 검색량 0을 언제 봐줄 것인가:");
{
  // ★유저가 든 실물. 오늘 터진 이슈는 지난 30일 평균이 0이라 수요 하한에 걸린다.
  const a = preemptVerdict("동탄 로또청약 줍줍", "rising", 120);
  ok(a.eligible, `★"동탄 줍줍" 통과 — ${a.reasons.join("·")}`);
  const b = preemptVerdict("케이뱅크 황금캡슐 이벤트", "community", 300);
  ok(b.eligible, `★"케이뱅크 황금캡슐" 통과 — ${b.reasons.join("·")}`);
  // ★유저 화면에서 실제로 나왔던 오답: 월 0회 · 문서 7,149편
  const c = preemptVerdict("부동산 공급", "news", 7149);
  ok(!c.eligible, `★"부동산 공급" 탈락 — ${c.blockedBy}`);
  // 각 조건이 실제로 일하는지
  ok(!preemptVerdict("동탄 줍줍", "discover", 100).eligible, "★신선한 신호원이 아니면 면제 없음");
  ok(!preemptVerdict("동탄 줍줍", "rising", 50000).eligible, "★문서가 쌓였으면 선점이 아니라 뒷북");
  ok(!preemptVerdict("동탄 줍줍", "rising", null).eligible, "★문서 수를 못 쟀으면 면제하지 않는다(모르는 걸 근거로 예외 금지)");
  ok(!preemptVerdict("지원금 신청", "gov", 100).eligible, "★행동어만 있고 고유명사가 없으면 뭉뚱그린 말");
  ok(!preemptVerdict("동탄 부동산", "rising", 100).eligible, "★고유명사만 있고 행동이 없으면 막연한 말");
}

console.log("\n④ 배선:");
{
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/preemptVerdict\(c\.keyword/.test(rt), "★수요 하한이 선점형을 죽이지 않게 판별기를 부른다");
  ok(/const DEMAND_MIN = 100/.test(rt), "수요 하한이 있다");
  ok(/상한이 아니라 하한이라/.test(rt) || /하한이다/.test(rt), "★상한(밴드 해제)과 하한이 다른 축임을 적어둔다");
  ok(/served_topics/.test(rt) && /after\(async \(\) => \{/.test(rt), "★서빙한 글감을 남긴다(응답은 막지 않는다)");
  ok(/발행 여부와 무관하게 낸 것을 전부 남긴다/.test(rt), "★재는 대상은 '우리 추천이 맞았나'지 '유저가 썼나'가 아니다");

  const api = fs.readFileSync(new URL("../app/api/hitrate/route.ts", import.meta.url), "utf-8");
  ok(/ready: false/.test(api) && /0%와 '아직 못 잼'은 다른 말이다/.test(api), "★재료가 없으면 0%라고 쓰지 않는다");
  ok(/missed/.test(api) && /coverage/.test(api), "★놓친 유입어와 커버리지를 함께 준다");
  ok(/inflow_keywords/.test(api), "★입력 창구를 새로 만들지 않는다(기존 성과 기록 재사용)");

  const sheet = fs.readFileSync(new URL("../components/dashboard/PerfImportSheet.tsx", import.meta.url), "utf-8");
  ok(/글감 적중률/.test(sheet), "화면에 붙었다");
  ok(/커버리지/.test(sheet) && /놓친 유입 검색어/.test(sheet), "★적중률만이 아니라 커버리지·놓친 것을 보여준다");

  const mig = fs.readFileSync(new URL("../supabase/migrations/0066_topic_hitrate.sql", import.meta.url), "utf-8");
  ok(/create table if not exists public\.served_topics/.test(mig) && /create table if not exists public\.topic_hits/.test(mig), "마이그레이션이 있다");
  ok(/enable row level security/.test(mig), "RLS 켜짐(서비스롤 전용)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 글감 적중률 + 선점 판별");
process.exit(fail ? 1 : 0);
