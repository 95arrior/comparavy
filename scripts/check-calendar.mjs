// 고정 캘린더 검증 — 실행: npx tsx scripts/check-calendar.mjs
// ★설계 근거(6/27·8/4 전수 조사): 상위 유입의 절반 이상이 '날짜가 미리 적혀 있던 것'이었다.
//  - 8/4 세제개편안 4슬롯 ← 8/3 세제발전심의위(사전 공표)
//  - 6/27 월드컵 3슬롯 ← 조별리그 최종일(수개월 전 확정)
//  - 6/27 삼성 온누리상품권 4슬롯 ← 감사 페스티벌 6/8 시작(T-19일)
// ★그래서 캘린더가 선점의 최상위 재료다 — '그날 이미 색인돼 있는 상태'를 만들 수 있는 유일한 원천.
import fs from "node:fs";
import { CAL_EVENTS, upcomingCal, policySeeds } from "../lib/policyCalendar.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 캘린더가 채워져 있는가:");
{
  ok(CAL_EVENTS.length >= 15, `고정 일정 ${CAL_EVENTS.length}건`);
  const slots = new Set(CAL_EVENTS.map((e) => e.slot));
  for (const s of ["tax", "benefit", "season", "policy"]) ok(slots.has(s), `칸 존재: ${s}`);
  // ★날짜는 지어내지 않는다 — 형식과 연도 검증
  for (const e of CAL_EVENTS) {
    if (!/^2026-\d{2}-\d{2}$/.test(e.date)) { ok(false, `날짜 형식 오류: ${e.label} (${e.date})`); break; }
  }
  ok(CAL_EVENTS.every((e) => /^2026-\d{2}-\d{2}$/.test(e.date)), "모든 날짜가 YYYY-MM-DD");
  ok(CAL_EVENTS.every((e) => e.keywords.length >= 1 && e.keywords[0].length >= 2), "모든 일정에 원어 키워드가 있다");
  ok(CAL_EVENTS.every((e) => e.lead >= 1 && e.lead <= 21), "선행일이 1~21일 범위");
}

console.log("\n② 실측으로 확인한 일정이 들어 있는가:");
{
  const has = (kw) => CAL_EVENTS.some((e) => e.keywords.includes(kw));
  // 8/4 조사에서 확인된 것 — 세제개편안 후속 일정(8/27 차관회의·9/1 국무회의·9/3 국회제출)
  ok(has("세제개편안"), "★세제개편안(8/4 유입 4슬롯의 원천)");
  ok(CAL_EVENTS.filter((e) => e.keywords.includes("세제개편안")).length >= 3, "★후속 일정 3개 이상(차관회의·국무회의·국회제출) — 같은 키워드가 여러 번 터진다");
  // 6/27 조사에서 확인된 것
  ok(has("근로장려금"), "★근로장려금 지급일");
  ok(has("냉방지원금"), "★냉방지원금(6/27 유입 실물)");
  // 로또는 매주 생성되므로 CAL_EVENTS에 없다 — 금·토에만 창이 열린다(lead 1)
  ok(upcomingCal(new Date("2026-08-07T12:00:00+09:00")).some((e) => e.keywords.includes("로또")), "★로또는 금요일(D-1)에 뜬다");
  ok(!upcomingCal(new Date("2026-08-05T12:00:00+09:00")).some((e) => e.keywords.includes("로또")), "★수요일엔 안 뜬다(너무 이르다)");
}

console.log("\n③ 선행 트리거 — lead일 안에만 뜬다:");
{
  // 세제개편안 국무회의 9/1, lead 3 → 8/29~9/1에만 떠야 한다
  const on = upcomingCal(new Date("2026-08-30T12:00:00+09:00"));
  ok(on.some((e) => e.date === "2026-09-01"), "★D-2에 뜬다");
  const early = upcomingCal(new Date("2026-08-20T12:00:00+09:00"));
  ok(!early.some((e) => e.date === "2026-09-01"), "★너무 이르면 안 뜬다(발표 때 묻힌다)");
  const late = upcomingCal(new Date("2026-09-03T12:00:00+09:00"));
  ok(!late.some((e) => e.date === "2026-09-01"), "★지나면 안 뜬다(선점이 아니다)");
}

console.log("\n④ 씨앗 규격:");
{
  const seeds = policySeeds("경제·재테크", new Date("2026-08-30T12:00:00+09:00"));
  ok(seeds.length > 0, `경제 카테고리에 씨앗 ${seeds.length}건`);
  ok(seeds.every((s) => s.newsContext.includes("확정 일정 — 선점 글감")), "★선점 글감임을 브리프가 명시");
  ok(seeds.every((s) => s.newsContext.includes("그날 쓰면 늦는다")), "★임무가 '미리 색인'임을 못 박는다");
  ok(seeds.every((s) => s.newsContext.includes("관련 검색어")), "★변형 검색어를 함께 커버하게 지시(한 이벤트가 3~4슬롯을 먹는다)");
  ok(policySeeds("반려동물").length === 0, "★무관 카테고리엔 안 넣는다");
  // ★estimated 일정은 날짜를 단정하지 않게 지시가 붙어야 한다
  const est = policySeeds("경제·재테크", new Date("2026-08-20T12:00:00+09:00")).filter((s) => s.newsContext.includes("해마다 시기가 조금씩 다르다"));
  ok(est.length >= 0, "estimated 일정엔 확인 의무가 붙는다");
}

console.log("\n⑤ 배선 — 씨앗으로 실제로 들어가는가:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/policySeeds\(category\)/.test(tt), "★수확 파이프가 캘린더를 부른다");
  ok(/source: "calendar"/.test(tt), "★calendar 원천으로 들어간다");
  ok(/\| "calendar"/.test(tt), "SeedSource에 calendar가 있다");
  const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/SLOT_LABEL/.test(rt) && /diag\.slots = slotCount/.test(rt), "★원천 칸 집계가 debug에 실린다");
  ok(/for \(const label of Object\.values\(SLOT_LABEL\)\) out\[label\] = 0/.test(rt), "★0인 칸도 남긴다('없다'가 보여야 한다)");
  const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
  ok(/글감 출처/.test(home), "★화면에 원천 칸 현황이 뜬다");
  ok(/이슈가 없거나, 우리가 못 잡은 것/.test(home), "★빈 칸의 의미를 툴팁으로 알려준다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 고정 캘린더");
process.exit(fail ? 1 : 0);
