// ★개정 캘린더 검증(2026-07-17) — 시즌 윈도우·주제 매칭·연도 인스턴스 키(12월~1월 걸침).
import { activeSeasons, matchSeason, seasonInstanceKey, REVISION_SEASONS } from "../lib/revisionCalendar.ts";
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 시즌 윈도우:");
ok(activeSeasons(7).some((s) => s.key === "tax_reform") && activeSeasons(7).some((s) => s.key === "min_wage"), "7월 = 세법개정안 + 최저임금");
ok(activeSeasons(1).some((s) => s.key === "yearend_tax") && activeSeasons(1).some((s) => s.key === "new_year"), "1월 = 연말정산 + 신년 제도");
ok(activeSeasons(3).length === 0, "3월 = 열린 시즌 없음");

console.log("\n② 주제 매칭:");
ok(matchSeason("양도세 절세 방법", 7)?.key === "tax_reform", "7월 '양도세' → tax_reform");
ok(matchSeason("ISA 만기 세금", 7)?.key === "tax_reform", "7월 'ISA' → tax_reform");
ok(matchSeason("양도세 절세 방법", 3) === null, "3월 '양도세' → 시즌 밖이라 null");
ok(matchSeason("강아지 사료 추천", 7) === null, "무관 주제 → null");
ok(matchSeason("연말정산 인적공제", 12)?.key === "yearend_tax", "12월 '연말정산' → yearend_tax");

console.log("\n③ 시즌 인스턴스 키(12월~1월 걸침 = 한 인스턴스):");
const ye = REVISION_SEASONS.find((s) => s.key === "yearend_tax");
const dec = seasonInstanceKey(ye, new Date(Date.UTC(2026, 11, 15))); // 2026-12-15 KST
const jan = seasonInstanceKey(ye, new Date(Date.UTC(2027, 0, 15))); // 2027-01-15 KST
ok(dec === "yearend_tax:2027" && jan === "yearend_tax:2027" && dec === jan, "2026-12과 2027-01이 같은 키(yearend_tax:2027)");
const tr = REVISION_SEASONS.find((s) => s.key === "tax_reform");
ok(seasonInstanceKey(tr, new Date(Date.UTC(2026, 6, 17))) === "tax_reform:2026", "단일 연도 시즌은 그해 연도");

console.log(fail === 0 ? "\n통과: 개정 캘린더 정상" : "\n실패: " + fail);
process.exit(fail ? 1 : 0);
