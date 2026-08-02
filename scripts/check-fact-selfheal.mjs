import { scanFacts, staleFutureDates, applyFactFix } from "../lib/factGate.ts";
import fs from "node:fs";

// ★2026-08-02 유저: "검사가 또 나오네요. 검사할 거 있음 너가 수정해서 뽑으라니깐."
//  검토 화면의 '사실 검사' 패널은 원래 사람 눈이 마지막으로 보는 안전망이었는데,
//  고칠 수 있는 것까지 거기로 넘기고 있었다 — 그건 검사가 아니라 숙제 떠넘기기다.
//  ★원칙: 값만 바꾸면 되는 건 코드가 치환하고(모델 안 부름), 서술 방식 문제는 재생성으로 고친다.
//   사람에게 남기는 건 코드도 모델도 판단 못 하는 것뿐이다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };
const NOW = new Date("2026-08-02T00:00:00Z");

// ── ① 치환 가능한 오류는 코드가 스스로 고치는가 ────────────────────────
{
  const bad = "<p>예금자보호 한도는 5,000만 원까지 보호됩니다.</p>";
  const issues = scanFacts(bad, "예금자보호").filter((i) => i.replace);
  ok(issues.length >= 1, "★옛 한도는 '치환 가능' 오류로 분류된다");
  let fixed = bad;
  for (const i of issues) fixed = applyFactFix(fixed, i);
  ok(/1억\s*원/.test(fixed), "★코드가 1억 원으로 고쳐 놓는다", fixed.slice(0, 60));
  ok(scanFacts(fixed, "예금자보호").filter((i) => i.replace).length === 0, "★고친 뒤엔 같은 오류가 안 남는다(무한루프 방지)");
}

// ── ② finalize가 실제로 그 치환을 돌리는가 ─────────────────────────────
{
  const g = fs.readFileSync(new URL("../lib/generateArticle.ts", import.meta.url), "utf-8");
  const fin = g.slice(g.indexOf("function finalize"), g.indexOf("const SAVE_TOOL"));
  ok(/applyFactFix/.test(fin), "★finalize가 자동 치환을 돌린다");
  ok(/filter\(\(i\) => i\.replace\)/.test(fin), "치환 규칙이 있는 오류만 대상");
  ok(/body_html === before/.test(fin), "★본문에 안 닿으면 즉시 중단(무한루프 방지)");
  ok(/pass < 3/.test(fin), "치환 패스 상한");
  // ★두 생성 경로가 전부 finalize를 지나야 한다(게이트 중앙화)
  ok((g.match(/finalize\(/g) ?? []).length >= 2, "단발·스트리밍 두 경로가 finalize를 지난다");
}

// ── ③ 치환 불가한 오류는 재생성으로 넘어가는가 ─────────────────────────
{
  const rt = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  const spec = rt.slice(rt.indexOf("const specDefects"), rt.indexOf("const deficits"));
  ok(/wrongFacts/.test(spec), "★사실 오류가 재생성 발동 목록에 있다");
  ok(/i\.layer !== "missing" && !i\.replace/.test(spec), "★치환으로 이미 고친 건 다시 시키지 않는다");
  ok(/숙제로 남기지 말고/.test(spec), "재생성 지시가 명시적");
}

// ── ④ 오탐 — 정상 서술을 붙잡지 않는가 ─────────────────────────────────
//  ★실측: "가입 시점에 상관없이 2025년 9월 1일 이후부터 자동으로 1억 원 한도가 적용됩니다."
//   이건 맞는 문장인데 '부터 적용'만 보고 걸었다. '이후'는 시작점이지 예고가 아니다.
for (const s of [
  "가입 시점에 상관없이 2025년 9월 1일 이후부터 자동으로 1억 원 한도가 적용됩니다.",
  "2025년 9월 1일부터 시행돼 지금 적용 중입니다.",
  "2025년 9월 1일 이래 1억 원이 적용됩니다.",
  "2026년 12월 1일부터 시행됩니다.",
])
  ok(staleFutureDates(s, NOW).length === 0, "오탐 없음", s.slice(0, 40));

// ── ⑤ 진짜 낡은 서술은 여전히 잡히는가(④ 완화가 구멍을 내지 않았는지) ──
for (const s of [
  "2025년 9월 1일부터 예금자보호 한도가 1억 원으로 상향됩니다.",
  "2025년 9월 1일부터 적용됩니다.",
])
  ok(staleFutureDates(s, NOW).length === 1, "★진짜 예고형은 계속 잡힌다", s.slice(0, 40));

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 사실 오류 자가 수정");
process.exit(fail ? 1 : 0);
