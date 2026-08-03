import { laneQuota, TIER_LANE_MIX, TIER_BANDS } from "../lib/scoreWeights.ts";

// ★밴드 사다리 배합 회귀(2026-08-01) — 실측 사고에서 출발했다:
//  돼지통(1개월차, 신생) 7/31 발행 5편이 전부 헤드 키워드로 나가 노출 0/5.
//  원인은 배합이 설계(트렌드 25%)와 정반대인 2분할 [트렌드,에버그린]=[7,3](트렌드 70%)이었던 것.
//  여기 케이스가 깨지면 그 사고가 재발한 것이다.
let fail = 0;
const ok = (cond, label, extra = "") => { if (!cond) fail++; console.log(cond ? "OK " : "FAIL", "|", label, extra); };

// [합계 보존] 배합이 어떻든 총 장수는 정확히 n이어야 한다(최대잔여법)
for (const tier of Object.keys(TIER_LANE_MIX)) {
  for (const n of [1, 3, 7, 10, 13]) {
    const q = laneQuota(tier, n);
    const sum = Object.values(q).reduce((a, b) => a + b, 0);
    ok(sum === n, `합계 보존 ${tier} n=${n}`, `→ ${sum}`);
  }
}

// [신생 배합] 유저 확정값(2026-08-04 개정): 황금20 / 홈판50 / 트렌드20 / 헤드10
//  ★2026-08-01의 황금35/홈판40에서 옮겼다 — 유저: "꾸준한 수요를 2~3개로 줄이고 홈판 비중을 늘립시다."
//   연료론 전환(홈판이 지수를 올려 검색 글을 끌어올린다)의 논리적 귀결이다.
//  ★헤드 10은 유지 — 열이 3장으로 줄어도 밴드 사다리 장치는 남긴다.
{
  const q = laneQuota("SEEDLING", 10);
  ok(q.homefeed === 5, "신생 10편 중 홈판 5편(비중 확대)", `→ ${q.homefeed}`);
  ok(q.golden === 2, "신생 황금 2편(꾸준한 수요 축소)", `→ ${q.golden}`);
  ok(q.trend <= 2, "★신생 트렌드 2편 이하(구버전은 7편이었다)", `→ ${q.trend}`);
  ok(q.head <= 1, "신생 헤드 1편 이하", `→ ${q.head}`);
}

// ★[회귀 핵심] 신생기에 트렌드가 과반이면 안 된다 — 7/31 사고의 직접 원인
for (const n of [4, 10, 20]) {
  const q = laneQuota("SEEDLING", n);
  ok(q.trend < n / 2, `신생 트렌드가 과반 미만 n=${n}`, `→ ${q.trend}/${n}`);
}

// [단계 진행] 헤드 비중은 단계가 오를수록 커지고, 홈판은 줄지 않는다
{
  const s = laneQuota("SEEDLING", 20), g = laneQuota("GROWING", 20), e = laneQuota("ESTABLISHED", 20);
  ok(s.head <= g.head && g.head <= e.head, "헤드 비중 단조 증가", `→ ${s.head}/${g.head}/${e.head}`);
  ok(s.golden > 0 && e.golden > 0, "황금 레인은 어느 단계에서도 굶지 않음");
}

// [밴드] 신생 밴드는 설계값 100~2,000 — 실측 승자 구간(월 300~800)을 포함해야 한다
{
  const b = TIER_BANDS.SEEDLING;
  ok(b.volMin <= 300, "신생 하한이 실측 승자(300)를 자르지 않음", `→ ${b.volMin}`);
  ok(b.volMax <= 2000, "신생 상한 2,000 이하", `→ ${b.volMax}`);
  ok(b.volMin === 100 && b.volMax === 2000, "신생 밴드 = 설계값 100~2,000");
}

// [미지정 tier] 알 수 없는 단계는 신생으로 떨어져야 한다(콜드스타트 철학)
{
  const a = laneQuota("UNKNOWN_TIER", 10), b = laneQuota("SEEDLING", 10);
  ok(JSON.stringify(a) === JSON.stringify(b), "미지정 tier = 신생 폴백");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 배합 사다리");
process.exit(fail ? 1 : 0);
