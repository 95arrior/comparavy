// ★체류 프록시 골든 케이스(FF_DWELL_SCORE) — 판정 회귀 고정(10케이스).
import { dwellPotential } from "../lib/dwellScore.ts";
const cases = [
  ["재산세 계산 방법과 카드 혜택", 2],
  ["파킹통장 금리 비교, 높은 곳", 2],
  ["연말정산 환급액 조건별 유불리", 2],
  ["IRP로 절세, 공제 한도 총점검", 2],
  ["근로장려금 신청 방법과 서류", 1],
  ["청년도약계좌 가입 방법 순서대로", 1],
  ["ISA 계좌 개설 자격 요건", 1],
  ["재산세 납부 언제부터", -1],
  ["주민세 발표일", -1],
  ["2030 연금 준비 이야기", 0],
];
let fail = 0;
for (const [text, want] of cases) {
  const got = dwellPotential(text);
  const ok = got === want;
  if (!ok) fail++;
  console.log(ok ? "OK " : "FAIL", "|", text, "→", got, ok ? "" : `(기대 ${want})`);
}
process.exit(fail ? 1 : 0);
