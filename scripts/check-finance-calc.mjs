// ★검증된 계산 자료 검증(2026-07-17) — 기대값은 전부 손 계산으로 재검증한 수치(코드가 틀리면 글 전체가 틀린다).
import { pensionRefund, isaSaving, afterTaxInterest, healthMonthly, financeCalcContext } from "../lib/financeCalc.ts";
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };
const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

console.log("① 연금계좌 세액공제(600/900만 한도, 16.5%/13.2%):");
ok(near(pensionRefund(48_000_000, 9_000_000), 1_485_000), "총급여 4,800만·900만 납입 → 1,485,000원");
ok(near(pensionRefund(60_000_000, 9_000_000), 1_188_000), "총급여 6,000만·900만 납입 → 1,188,000원(13.2%)");
ok(near(pensionRefund(48_000_000, 12_000_000), 1_485_000), "1,200만 납입해도 한도 900만까지만 공제");

console.log("\n② ISA 절세(비과세 500만/서민형 1,000만·초과 9.9% vs 일반 15.4%):");
const big = isaSaving(8_000_000, "general");
ok(near(big.normalTax, 1_232_000) && near(big.isaTax, 297_000) && near(big.saving, 935_000), "수익 800만 일반형: 1,232,000 vs 297,000 → 절감 935,000원");
const small = isaSaving(3_000_000, "general");
ok(near(small.isaTax, 0) && near(small.saving, 462_000), "수익 300만: 전액 비과세 → 절감 462,000원");
ok(near(isaSaving(8_000_000, "seomin").isaTax, 0), "서민형은 800만도 전액 비과세");

console.log("\n③ 예금 이자 세후(15.4%):");
const it = afterTaxInterest(50_000_000, 0.035);
ok(near(it.gross, 1_750_000) && near(it.tax, 269_500) && near(it.net, 1_480_500), "5,000만·연 3.5% → 세전 175만, 세후 1,480,500원");

console.log("\n④ 직장가입자 월 보험료(본인 3.595%·장기요양 0.9448%):");
const h = healthMonthly(4_000_000);
ok(near(h.health, 143_800) && near(h.ltc, 18_896, 2), "월급 400만 → 건보 143,800원 + 장기요양 약 18,896원");

console.log("\n⑤ 프롬프트 블록 조립:");
ok((financeCalcContext("연금저축 세액공제 한도") ?? "").includes("1,485,000원"), "연금 키워드 → 환급 수치 포함");
ok((financeCalcContext("ISA 만기 세금") ?? "").includes("935,000원"), "ISA 키워드 → 절감 수치 포함");
ok((financeCalcContext("정기예금 금리 비교") ?? "").includes("1,480,500원"), "예금 키워드 → 세후 수치 포함");
ok((financeCalcContext("건강보험료 산정 기준") ?? "").includes("143,800원"), "건보 키워드 → 보험료 수치 포함");
ok(financeCalcContext("고구마 다이어트 레시피") === null, "무관 키워드 → null(주입 안 함)");
const multi = financeCalcContext("연금저축 ISA 예금 건강보험") ?? "";
ok(multi.includes("연금계좌") && multi.includes("ISA 절세") && !multi.includes("예금 이자 세후"), "블록은 최대 2개(과주입 방지)");

console.log(fail === 0 ? "\n통과: 계산 모듈 정상" : "\n실패: " + fail);
process.exit(fail ? 1 : 0);
