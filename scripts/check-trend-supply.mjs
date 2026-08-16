import fs from "node:fs";

// ★트렌드 공급 회귀(2026-08-02 검거) — '지금 뜨는' 열이 아침마다 1~2장으로 마르던 진짜 원인.
//  씨앗 수명(FRESH_MS)과 수확 크론 간격은 따로 보면 둘 다 멀쩡해 보인다. 같이 봐야 구멍이 보인다:
//    수명 6h · 크론 "0 0,2,6,12"(UTC) = KST 09·11·15·21 → 밤 간격 12h
//    ⇒ KST 03:00~09:00 씨앗 전멸. 하필 권장 발행 시간(KST 06~08)이 그 구멍 한가운데.
//  이 테스트가 지키는 것: **최대 크론 간격 < 씨앗 수명**. 둘 중 하나만 바꿔도 여기서 걸린다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const root = new URL("../", import.meta.url);
const vercel = JSON.parse(fs.readFileSync(new URL("vercel.json", root), "utf-8"));
const trendCron = (vercel.crons ?? []).find((c) => c.path === "/api/cron/trend-refresh");
ok(Boolean(trendCron), "트렌드 수확 크론이 존재");

// 씨앗 수명(FRESH_MS) 파싱 — 소스에서 직접 읽는다(상수가 바뀌면 이 테스트도 같이 움직인다)
const src = fs.readFileSync(new URL("lib/trendTopics.ts", root), "utf-8");
const m = /const FRESH_MS = (\d+) \* 3600_000/.exec(src);
ok(Boolean(m), "FRESH_MS를 소스에서 읽음");
const ttlHours = m ? Number(m[1]) : 0;

// 크론 표현식에서 시(hour) 목록을 뽑는다 — 스텝형(매 N시간)과 나열형 둘 다 지원.
function cronHours(schedule) {
  const hourField = String(schedule).split(/\s+/)[1] ?? "";
  if (/^\*\/(\d+)$/.test(hourField)) {
    const step = Number(RegExp.$1);
    return Array.from({ length: Math.ceil(24 / step) }, (_, i) => i * step);
  }
  if (hourField === "*") return Array.from({ length: 24 }, (_, i) => i);
  return hourField.split(",").map(Number).filter((n) => Number.isInteger(n));
}

const hours = cronHours(trendCron.schedule);
ok(hours.length > 0, `크론 시각 파싱 (${trendCron.schedule} → ${hours.join(",")} UTC)`);

// ★간격은 UTC로 계산해도 KST로 계산해도 같다(시차는 평행이동) — 최대 간격만 보면 된다.
const sorted = [...hours].sort((a, b) => a - b);
const gaps = sorted.map((h, i) => ((sorted[(i + 1) % sorted.length] - h) + 24) % 24 || 24);
const maxGap = Math.max(...gaps);
const kst = sorted.map((h) => (h + 9) % 24).sort((a, b) => a - b);

console.log(`\n  씨앗 수명 ${ttlHours}h · 수확 KST ${kst.join("·")}시 · 최대 간격 ${maxGap}h\n`);

ok(maxGap < ttlHours,
  `★최대 수확 간격(${maxGap}h) < 씨앗 수명(${ttlHours}h)`,
  maxGap < ttlHours ? "" : `→ ${maxGap - ttlHours}시간 동안 씨앗이 전멸한다`);

// ★권장 발행 시간대(KST 06~08시)에 살아 있는 씨앗이 있어야 한다.
//  이 창은 Home.tsx의 발행 추천 문구("지금 발행 좋아요 — 출근길과 점심을 커버해요")와 같은 값이다.
for (const target of [6, 7, 8]) {
  const alive = kst.some((h) => {
    const since = ((target - h) + 24) % 24; // 가장 최근 수확으로부터 경과 시간
    return since < ttlHours;
  });
  ok(alive, `권장 발행 시간 KST ${target}시에 씨앗이 살아 있음`);
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 트렌드 공급(수명 vs 수확 간격)");
process.exit(fail ? 1 : 0);
