import { columnQuota, dayQuota, TIER_LANE_MIX } from "../lib/scoreWeights.ts";
import { judgeHomefeed } from "../lib/homefeedVerdict.ts";

// ★보드 조립 시뮬레이션 회귀(2026-08-01) — 이번에 실제로 놓쳤던 유형을 영구 회귀로 박는다.
//  놓쳤던 것: 배합을 4분할로 고쳐 놓고, 그 배합이 '렌더되지 않는 경로'에서만 돌고 있었다.
//  화면은 2열(지금 뜨는/꾸준한 수요) × 활성 5장이고, 각 열은 다른 API 경로를 쓴다.
//  → 배합만 맞고 화면 슬라이스를 안 보면 사용자에게는 아무것도 안 바뀐다.
//  그래서 여기서는 '배합 → 조립 → 화면 자르기'를 끝까지 시뮬레이션한다.
const PER_COLUMN = 5; // Home.tsx의 활성 슬라이스와 같아야 한다(둘이 어긋나면 배합이 무의미해진다)

let fail = 0;
const ok = (cond, label, extra = "") => { if (!cond) fail++; console.log(cond ? "OK " : "FAIL", "|", label, extra); };

// ★[상수 일치] 서버 배합의 분모와 화면 슬롯이 어긋나면 배합이 조용히 무의미해진다 — 주석 약속이 아니라 코드에서 읽어 본다.
//  이번 사고의 정확한 형태가 이거였다: 서버는 10슬롯으로 배합하고 화면은 5장만 보여줬다.
{
  const fs = await import("node:fs");
  const srv = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  const ui = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
  const srvDaily = Number(srv.match(/const DAILY_BOARD = (\d+)/)?.[1] ?? NaN);
  const srvPer = srv.match(/const PER_COLUMN = DAILY_BOARD \/ 2/) ? srvDaily / 2 : NaN;
  const uiPer = Number(ui.match(/const PER_COLUMN = (\d+)/)?.[1] ?? NaN);
  ok(srvPer === uiPer, "서버 PER_COLUMN == 화면 PER_COLUMN", `→ 서버 ${srvPer} / 화면 ${uiPer}`);
  ok(uiPer === PER_COLUMN, "이 테스트의 가정 == 화면 슬롯", `→ ${uiPer}`);
  ok(srvDaily === uiPer * 2, "하루 보드 = 열당 슬롯 × 2열", `→ ${srvDaily}`);
  // 화면이 실제로 상수를 쓰는지(리터럴로 되돌아가면 다시 어긋난다)
  ok(/slice\(0, PER_COLUMN\)/.test(ui), "화면 활성 슬라이스가 상수를 사용");
}

const card = (lane, i) => ({ lane, keyword: `${lane}-${i}` });
const make = (lane, n) => Array.from({ length: n }, (_, i) => card(lane, i));
const countBy = (list) => list.reduce((m, c) => ({ ...m, [c.lane]: (m[c.lane] ?? 0) + 1 }), {});

/** 서버 short 열 조립 재현: 트렌드를 밴드·쿼터로 자르고 홈판을 앞에 unshift. */
function assembleShort(tier, { trendAvail = 20, homefeedAvail = 99 } = {}) {
  const q = columnQuota(tier, "short", PER_COLUMN);
  const trends = make("trend", trendAvail).slice(0, Math.max(0, PER_COLUMN - q.homefeed));
  const homes = make("homefeed", Math.min(q.homefeed, homefeedAvail));
  return [...homes, ...trends];
}

/** 서버 long 열 조립 재현: 황금 쿼터 + 헤드, 남은 황금은 예비로 뒤에. */
function assembleLong(tier, { goldenAvail = 20, headAvail = 99 } = {}) {
  const q = columnQuota(tier, "long", PER_COLUMN);
  const golden = make("golden", goldenAvail);
  const heads = make("head", Math.min(q.head, headAvail));
  return [...golden.slice(0, q.golden), ...heads, ...golden.slice(q.golden)];
}

/** 화면이 실제로 보여주는 것 — 활성 상위 PER_COLUMN장. */
const onScreen = (list) => list.slice(0, PER_COLUMN);

// ★[단일 진실원] 하루 쿼터는 두 열 쿼터의 합과 반드시 같아야 한다.
//  2026-08-01 검거: 같은 값을 laneQuota와 columnQuota가 따로 계산해 ESTABLISHED에서 실제로 어긋났다
//  (열합 트렌드2·헤드2 vs laneQuota 트렌드1·헤드3). 두 경로가 같은 걸 계산하면 반드시 드리프트한다.
for (const tier of Object.keys(TIER_LANE_MIX)) {
  const s = columnQuota(tier, "short", PER_COLUMN);
  const l = columnQuota(tier, "long", PER_COLUMN);
  const d = dayQuota(tier, PER_COLUMN);
  ok(d.homefeed === s.homefeed && d.trend === s.trend, `${tier} 하루쿼터 short 몫 == 열 쿼터`, `→ ${JSON.stringify(d)}`);
  ok(d.golden === l.golden && d.head === l.head, `${tier} 하루쿼터 long 몫 == 열 쿼터`);
  ok(Object.values(d).reduce((a, b) => a + b, 0) === PER_COLUMN * 2, `${tier} 하루쿼터 합 = ${PER_COLUMN * 2}`);
}

// ── [핵심 회귀] 화면에 잘린 뒤에도 배합이 살아 있는가 ──────────────────────
for (const tier of Object.keys(TIER_LANE_MIX)) {
  const s = countBy(onScreen(assembleShort(tier)));
  const l = countBy(onScreen(assembleLong(tier)));
  const qs = columnQuota(tier, "short", PER_COLUMN);
  const ql = columnQuota(tier, "long", PER_COLUMN);

  ok((s.homefeed ?? 0) === qs.homefeed, `${tier} 화면 short 홈판 = 쿼터`, `→ ${s.homefeed ?? 0}/${qs.homefeed}`);
  ok((s.trend ?? 0) === qs.trend, `${tier} 화면 short 트렌드 = 쿼터`, `→ ${s.trend ?? 0}/${qs.trend}`);
  ok((l.golden ?? 0) === ql.golden, `${tier} 화면 long 황금 = 쿼터`, `→ ${l.golden ?? 0}/${ql.golden}`);
  ok((l.head ?? 0) === ql.head, `${tier} 화면 long 헤드 = 쿼터`, `→ ${l.head ?? 0}/${ql.head}`);
  ok(onScreen(assembleShort(tier)).length === PER_COLUMN, `${tier} short 열이 5장을 채움`);
  ok(onScreen(assembleLong(tier)).length === PER_COLUMN, `${tier} long 열이 5장을 채움`);
}

// ★[회귀] 하루 총량이 10편(유저 확정 발행량)과 일치해야 한다 — 어긋나면 목표 산수가 깨진다
{
  const total = onScreen(assembleShort("SEEDLING")).length + onScreen(assembleLong("SEEDLING")).length;
  ok(total === 10, "신생 하루 보드 총 10편", `→ ${total}`);
}

// ★[회귀] 홈판이 화면을 독식하면 안 된다 — 4장을 앞에 몰면 다른 레인이 잘려 나갔던 게 원래 사고다
{
  const s = countBy(onScreen(assembleShort("SEEDLING")));
  ok((s.trend ?? 0) >= 1, "신생 short에 트렌드가 최소 1장 남음(홈판 독식 금지)", `→ ${s.trend ?? 0}`);
  const l = countBy(onScreen(assembleLong("SEEDLING")));
  ok((l.head ?? 0) >= 1, "신생 long에 헤드가 최소 1장 남음", `→ ${l.head ?? 0}`);
}

// ── [결품] 레인이 굶으면 화면이 비는가, 다른 레인이 메우는가 ────────────────
{
  // 홈판 생성이 통째로 실패해도 열이 비면 안 된다(예비가 채운다)
  const s = onScreen(assembleShort("SEEDLING", { homefeedAvail: 0 }));
  ok(s.length >= 1, "홈판 0장이어도 short 열이 비지 않음", `→ ${s.length}장`);
  const c = countBy(s);
  ok((c.homefeed ?? 0) === 0, "홈판 0장이면 홈판 카드도 0", `→ ${c.homefeed ?? 0}`);
  // 헤드 후보가 없어도 long은 황금으로 채워진다
  const l = onScreen(assembleLong("SEEDLING", { headAvail: 0 }));
  ok(l.length === PER_COLUMN, "헤드 0장이어도 long 열은 5장 유지", `→ ${l.length}`);
  ok((countBy(l).golden ?? 0) === PER_COLUMN, "헤드 자리를 황금이 메움", `→ ${countBy(l).golden ?? 0}`);
}

// ── [헤드 레인] 성장·확장기 배합이 구조적으로 달성 가능한가 ─────────────────
// (원래 버그: headBetCards가 .find()로 1장만 만들고 ESTABLISHED는 아예 제외돼 있었다)
for (const tier of ["GROWING", "ESTABLISHED"]) {
  const need = columnQuota(tier, "long", PER_COLUMN).head;
  const got = countBy(onScreen(assembleLong(tier, { headAvail: 99 }))).head ?? 0;
  ok(got === need, `${tier} 헤드 쿼터 달성 가능`, `→ ${got}/${need}`);
  ok(need >= 1, `${tier} 헤드 쿼터가 0이 아님`, `→ ${need}`);
}

// ── [홈판 판정기] 40% 베팅이 반증 가능한가 ────────────────────────────────
{
  const mkDays = (vals, start = 1) => vals.map((v, i) => ({ day: `2026-08-${String(start + i).padStart(2, "0")}`, visitors: v }));

  // 표본 부족 — 어떤 결론도 내면 안 된다
  const thin = judgeHomefeed({ days: mkDays([100, 110, 105]), homefeedPublishDays: ["2026-08-01"], otherPublishDays: [] });
  ok(thin.verdict === "insufficient", "표본 부족이면 판정 보류", `→ ${thin.verdict}`);

  // 홈판을 충분히 냈는데 급등이 한 번도 없음 → 되돌리기 권고
  const flatDays = mkDays(Array.from({ length: 14 }, () => 150));
  const flat = judgeHomefeed({
    days: flatDays,
    homefeedPublishDays: flatDays.slice(0, 12).map((d) => d.day),
    otherPublishDays: [],
  });
  ok(flat.verdict === "revert", "★홈판 12편에 급등 0회 → 되돌리기 권고", `→ ${flat.verdict}`);
  ok(flat.notes.some((n) => n.includes("TIER_LANE_MIX")), "되돌리는 방법을 알려줌");

  // 급등이 홈판 발행 직후에 몰림 → 유망(단, 인과 단정은 금지)
  const spikeDays = mkDays([...Array.from({ length: 8 }, () => 100), 400, 120, 110, 380, 100, 105]);
  const spiky = judgeHomefeed({
    days: spikeDays,
    homefeedPublishDays: ["2026-08-09", "2026-08-12", ...spikeDays.slice(0, 10).map((d) => d.day)],
    otherPublishDays: [],
  });
  ok(spiky.verdict === "promising", "급등이 홈판과 겹치면 유망", `→ ${spiky.verdict}`);
  ok(spiky.notes.some((n) => n.includes("인과")), "★인과가 아님을 명시(과신 방지)");
  ok(spiky.spikes.length >= 1, "급등일을 실제로 잡아냄", `→ ${spiky.spikes.length}회`);

  // 급등은 있는데 홈판과 무관 → 유지(비중을 올리지 않는다)
  // 급등일은 08-09·08-12 → 귀속 창(직전 3일)은 08-06~08-09, 08-09~08-12.
  // 홈판을 08-01~08-05에만 몰아 두면 어느 창에도 안 걸린다 = 귀속 0%.
  const early = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"];
  const unrelated = judgeHomefeed({
    days: spikeDays,
    homefeedPublishDays: [...early, ...early], // 하루 2편씩 = 10편(MIN_POSTS 충족)
    otherPublishDays: [],
  });
  ok(unrelated.verdict === "hold", "★급등이 홈판과 무관하면 유지(올리지 않음)", `→ ${unrelated.verdict}`);
  ok(unrelated.spikeAttribution === 0, "귀속률 0%로 계산됨", `→ ${unrelated.spikeAttribution}`);
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 보드 조립 + 홈판 판정");
process.exit(fail ? 1 : 0);
