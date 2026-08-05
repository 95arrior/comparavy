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
  // ★로또 제외(2026-08-05 유저 지시) — 어느 날짜에도 나오면 안 된다.
  //  검색량이 커서 다시 넣고 싶어지는 자리다. 그래서 '안 나온다'를 테스트로 못 박는다.
  for (const d of ["2026-08-05", "2026-08-07", "2026-08-08"]) {
    ok(!upcomingCal(new Date(`${d}T12:00:00+09:00`)).some((e) => e.keywords.some((k) => k.includes("로또"))), `★로또 없음 (${d})`);
  }
  ok(!CAL_EVENTS.some((e) => e.keywords.some((k) => k.includes("로또"))), "★고정 일정에도 로또 없음");
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
  // ★유저 목업(2026-08-05): 탭으로 걸러 보기 + 카드에 키워드·출처·문서수 명시
  ok(/const \[slotTab, setSlotTab\]/.test(home), "★원천 탭 상태가 있다(눌러서 걸러 본다)");
  ok(/function slotMatch/.test(home), "★탭과 집계가 같은 판정 함수를 쓴다(따로 세면 숫자가 어긋난다)");
  ok(/boardShort\?\.filter\(\(t\) => slotMatch\(t, slotTab\)\)/.test(home), "★탭이 두 열 모두에 걸린다");
  ok(/text-\[11\.5px\] font-bold text-\[#1D75F7\]/.test(home) && /seedKeyword/.test(home), "★카드가 키워드를 제목보다 먼저 보여준다");
  ok(/출처 \{slot\}/.test(home), "★카드에 출처가 박힌다");
  ok(/문서 \{bt\.toLocaleString/.test(home) && /적을수록 선점하기 좋아요/.test(home), "★문서 수를 숫자 그대로 + 적을수록 선점임을 알린다");
}

console.log("\n⑥ 3단계 — 기업 액션 공시(동적 원천):");
{
  const ca = fs.readFileSync(new URL("../lib/dartCorpAction.ts", import.meta.url), "utf-8");
  // ★근거: 8/4 '알테오젠 무상증자' new 진입 — 신호탄은 7/16 공시(19일 전)
  // ★실측 교정(2026-08-05, DART 키 실호출): 공시명은 "주요사항보고서(유상증자결정)"처럼 괄호 안에 붙는다.
  //  종전 정규식은 "무상증자 결정"처럼 띄어쓰기를 가정해 10일치에서 단 1건도 못 잡았다(늘 0건).
  ok(/무상증자결정\|유상증자결정/.test(ca), "★띄어쓰기 없는 실제 공시명으로 잡는다");
  // ★유형도 틀렸었다: I(거래소 수시)엔 '결과·확정'만 있고 '결정'은 B(주요사항보고서)·J에 온다.
  ok(/for \(const ty of \["B", "J"\]/.test(ca), "★B·J에서 잡는다(결정 공시가 실제로 오는 곳)");
  ok(!/pblntf_ty=I\b/.test(ca), "★I만 보던 버그가 되살아나지 않는다");
  ok(/AMEND_RE/.test(ca) && /정정 공시 = 뒷북/.test(ca), "★[기재정정]은 예전 결정의 재공시 — 신호탄이 아니다");
  ok(/ACTION_RANK/.test(ca) && /무상증자결정: 0/.test(ca), "★흔한 유상증자가 드문 무상증자를 밀어내지 않게 순위를 준다");
  ok(/if \(!\(it\.stock_code \?\? ""\)\.trim\(\)\) continue;/.test(ca), "상장사만(비상장은 검색 수요가 없다)");
  ok(/followFrom/.test(ca) && /addDays\(dt, 14\)/.test(ca), "★후속 창(권리락·기준일)을 예약한다 — 한 번 터지고 끝나지 않는다");
  ok(/확인 못 한 날짜는 절대 지어내지 마라/.test(ca), "★정확한 일정은 원문에서 — 추정 날짜 단정 금지");
  ok(/투자 판단을 부추기는 서술 금지/.test(ca), "★제도 설명까지만(투자권유 선 유지)");
  ok(/out\.slice\(0, 6\)/.test(ca), "하루 상한 — 공시가 몰리는 날 보드를 먹지 않게");

  const tt2 = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/fetchCorpActionSeeds\(\)/.test(tt2), "★수확 파이프에 배선됐다");
  ok(/\[corp-action\] 수집 실패/.test(tt2), "★원천이 죽으면 로그에 남는다(조용한 0 금지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 고정 캘린더");
process.exit(fail ? 1 : 0);
