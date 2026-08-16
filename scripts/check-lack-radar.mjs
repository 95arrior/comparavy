// 결핍 레이더 분야 게이트 검증 — 실행: npx tsx scripts/check-lack-radar.mjs
// ★출발점(2026-08-10 유저): "폭스바겐 아틀라스가 왜 나오지, 난 경제 블로그인데" —
//  결핍 판정을 모델에만 맡기면 '할인=돈'으로 소비 프로모션이 샌다. 경제 신호어 포지티브 게이트가 코드에 있어야 한다.
import { MONEY_SIGNAL_RE } from "../lib/lackRadar.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 통과해야 하는 것(경제·재테크):");
for (const k of [
  "청년미래적금 갈아타기 해지", "알테오젠 무상증자 권리락", "연말정산 자동차 구입비 할부 공제",
  "전세사기 피해 청년 월세 지원 신청", "청년문화예술패스 추가 발급", "농축협 예적금담보대출",
  "케이뱅크 황금캡슐 앱테크", "ISA 계좌 개편",
]) ok(MONEY_SIGNAL_RE.test(k), k);

console.log("② 떨어져야 하는 것(소비 프로모션·분야 밖):");
for (const k of ["폭스바겐 아틀라스", "제주여행 코스", "갤럭시 사전예약 혜택", "부산 맛집 추천", "홈플러스 재개장"]) {
  ok(!MONEY_SIGNAL_RE.test(k), k);
}

if (fail) { console.log(`\n${fail}건 실패`); process.exit(1); }
console.log("\n전부 통과");
