import fs from "node:fs";
import { endedProgramOf, findEndedMisuse, ENDED } from "../lib/discontinued.ts";
import { scanFacts } from "../lib/factGate.ts";
import { finalGate } from "../lib/cardFinalGate.ts";

// ★폐지·종료 제도 회귀(2026-08-01 유저 지시: "빡세게 잡아주세요, 네이버랑 워드프레스 둘다").
//  실측 발단: 글감 보드에 '재형저축'(2015년 가입 종료)이 "세금 우대받으며 모으는 방법"으로 떴다.
//  검색은 지금도 되지만 가입하러 가면 헛걸음한다 — 품질이 아니라 독자가 손해를 보는 오류다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── 글감 단계: 폐지 제도는 이름만으로 걸러야 한다 ────────────────────────
for (const kw of ["재형저축", "소득공제장기펀드", "청년희망적금", "청년우대형 청약통장", "긴급재난지원금", "장기주택마련저축"]) {
  ok(endedProgramOf(kw) != null, "폐지 제도 검출", `→ ${kw}`);
}
// 현행 제도는 절대 걸리면 안 된다(오탐이 더 비싸다)
for (const kw of ["청년도약계좌", "주택청약종합저축", "ISA 계좌", "연금저축펀드", "비과세종합저축", "청년내일저축계좌", "IRP 계좌이전", "국민연금 예상수령액"]) {
  ok(endedProgramOf(kw) == null, "현행 제도는 통과", `→ ${kw}`);
}

// ── 네이버 글감 게이트가 실제로 끊는가 ──────────────────────────────────
{
  const g = finalGate([
    { keyword: "재형저축", title: "재형저축, 세금 우대받으며 모으는 방법" },
    { keyword: "청년도약계좌", title: "청년도약계좌, 조건부터 확인하세요" },
  ]);
  ok(g.pass.length === 1 && g.pass[0].keyword === "청년도약계좌", "★네이버: 폐지 제도만 끊고 현행은 통과", `→ 통과 ${g.pass.length}건`);
  ok(g.drops.some((d) => String(d.reason).startsWith("ended:")), "드롭 사유가 ended:로 남음");
}

// ── 본문 검사: 지금 가입 가능한 것처럼 쓰면 잡는다 ──────────────────────
{
  const bad = "<p>재형저축은 세금 우대를 받으며 목돈을 모을 수 있어요. 지금 가입하면 이자소득세가 면제됩니다.</p>";
  const hit = scanFacts(bad, "재형저축").filter((i) => i.layer === "structure" && i.title.includes("재형저축"));
  ok(hit.length === 1, "★본문에서 폐지 제도 오용 검출");
  ok(hit[0]?.severity === "block", "심각도 block");
  ok(/청년도약계좌|ISA/.test(hit[0]?.reason ?? ""), "대체 제도를 안내함");
}
// ★끝난 걸 알고 쓴 글은 통과해야 한다(폐지 사실을 설명하는 글까지 막으면 게이트가 죽는다)
{
  const aware = [
    "<p>재형저축은 2015년 말 신규 가입이 종료됐습니다. 지금은 ISA를 대신 활용합니다.</p>",
    "<p>청년희망적금은 더 이상 가입할 수 없어요. 청년도약계좌로 갈아타는 방법을 정리했습니다.</p>",
    "<p>긴급재난지원금은 코로나 당시 한시 지원이라 지금은 없어졌습니다.</p>",
  ];
  for (const t of aware) {
    const h = findEndedMisuse(t.replace(/<[^>]+>/g, " "));
    ok(h.length === 0, "종료를 명시한 글은 통과", `→ ${t.slice(3, 34)}…`);
  }
}
// 단순 언급(가입 맥락 아님)도 통과
ok(findEndedMisuse("재형저축 시절과 비교하면 지금 상품은 구조가 다릅니다.").length === 0, "가입 맥락 아닌 언급은 통과");

// ── 워드프레스 경로에도 붙어 있는가(finalGate를 안 타므로 따로 확인) ────
{
  const auto = fs.readFileSync(new URL("../app/api/cron/wp-autopublish/route.ts", import.meta.url), "utf-8");
  const manual = fs.readFileSync(new URL("../app/api/wordpress/generate-now/route.ts", import.meta.url), "utf-8");
  ok(/endedProgramOf\(pick\.keyword\)/.test(auto), "★WP 자동발행에 게이트 있음");
  ok(/endedProgramOf\(pick\.keyword\)/.test(manual), "★WP 수동생성에도 있음");
}

// ── 사전 자체 건전성 ────────────────────────────────────────────────────
ok(ENDED.length >= 10, "사전에 충분한 항목", `→ ${ENDED.length}건`);
ok(ENDED.every((p) => p.since && p.name), "모든 항목에 종료 시점·이름");

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 폐지 제도");
process.exit(fail ? 1 : 0);
