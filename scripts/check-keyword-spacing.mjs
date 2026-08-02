import { naturalizeKeyword } from "../lib/naverAutocomplete.ts";
import fs from "node:fs";

// ★2026-08-02 유저 화면 실측 — 카드에 이렇게 떴다:
//   "신용카드발급신용점수, 이것만 알면 됩니다"  "전세보증금반환확약서 작성 시 주의사항"
//  네이버 검색광고 API는 relKeyword를 공백 없이 준다. 그걸 제목에 그대로 박은 것이다.
//  ★사람은 그렇게 안 친다. 그리고 우리 원칙이 '사람이 치는 표기 그대로'인데 정반대가 나갔다.
//  자동완성이 정답을 안다 — 같은 글자열의 사람 띄어쓰기를 돌려준다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 붙어 나온 광고 키워드를 사람 표기로 되돌리는가(실호출) ───────────
for (const [raw, want] of [
  ["신용카드발급신용점수", "신용카드발급 신용점수"],
  ["전세보증금반환확약서", "전세보증금 반환 확약서"],
]) {
  const got = await naturalizeKeyword(raw);
  ok(got === want, "★사람 표기로 복원", `${raw} → ${got}`);
}

// ── ② 원래 붙여 쓰는 말은 건드리지 않는가 ───────────────────────────────
//  ★'개인신용정보서'는 자동완성도 붙여 쓴다. 우리가 예쁘게 띄우면 오히려 정합이 깨진다.
for (const k of ["개인신용정보서", "후순위아파트담보대출", "결혼준비신용카드"]) {
  const got = await naturalizeKeyword(k);
  ok(got === k, "붙여 쓰는 말은 무변경", `${k} → ${got}`);
}

// ── ③ 볼 필요 없는 입력은 그대로 ────────────────────────────────────────
for (const k of ["실업급여 조건", "청약", ""]) {
  const got = await naturalizeKeyword(k);
  ok(got === k, "이미 띄었거나 짧으면 무호출", JSON.stringify(k));
}

// ── ④ 배선 + 자기모순 제거 ──────────────────────────────────────────────
{
  const pc = fs.readFileSync(new URL("../lib/poolCollect.ts", import.meta.url), "utf-8");
  ok(/naturalizeKeyword/.test(pc), "★풀 수집 시점에 복원(저장값이 사람 표기여야 하류가 전부 산다)");
  ok(/catch\(\(\) => k\.keyword\)/.test(pc), "실패해도 원본 유지(graceful)");

  // ★폴백 템플릿이 프롬프트 금지 목록 그 자체였다 — 규칙을 가장 자주 깨는 게 우리 코드였다.
  const tt = fs.readFileSync(new URL("../lib/topicTitles.ts", import.meta.url), "utf-8");
  const tmpl = tt.slice(tt.indexOf("const TEMPLATES"), tt.indexOf("function templateTitle"));
  for (const banned of ["총정리", "이것만 알면", "전에 확인하면 좋은 것", "꼭 알아야 할 것들"])
    ok(!tmpl.includes(banned), "★폴백이 금지 표현을 안 쓴다", banned);
  ok(/금지/.test(tt) && /훅이 아니다/.test(tt), "프롬프트의 금지 규칙은 그대로 유지");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 키워드 띄어쓰기 · 폴백 자기모순");
process.exit(fail ? 1 : 0);
