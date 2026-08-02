import { spacingDefects, hasSpacingDefect, longParagraphs, emojiCount, photoSlotShortfall, EMOJI_MIN, PARA_MAX_LINES } from "../lib/editorial.ts";
import { BODY_ALIGN } from "../config/publish.ts";
import fs from "node:fs";

// ★발행글 감사 회귀(2026-08-02) — 실제 발행물 「퇴사 전날까지 받을 수 있는 돈」을 검사해 나온 결함들.
//  이 다섯은 전부 '규격은 있는데 코드가 안 재던' 것들이다. 프롬프트만으로는 지켜지지 않는다는 게 실측으로 확인됐다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 띄어쓰기 붙음 ────────────────────────────────────────────────────
//  실측 2건: "임의계속가입은퇴직", "전환되면서보험료". 미리보기 24자 안에서만 나온 수라 전문엔 더 있었다.
//  ★한국어 띄어쓰기 일반 판정은 불가능하다 — 오탐이 나면 멀쩡한 글이 반려된다. 고정밀 네 패턴만 쓴다.
{
  const 오류 = [
    ["건강보험 임의계속가입은퇴직 후 36개월", "어절 중간 조사"],
    ["지역가입자로 전환되면서보험료가 오릅니다", "연결어미 뒤 명사"],
    ["쓰지 못한 연차는1일 통상임금", "조사 뒤 숫자"],
    ["주택담보대출을받는 경우", "어절 중간 조사"],
    ["36개월건강보험 임의계속", "수량 뒤 명사"],
  ];
  for (const [t, why] of 오류) ok(hasSpacingDefect(`<p>${t}</p>`), `★검출: ${why}`, spacingDefects(`<p>${t}</p>`).join(","));

  // ★오탐이 나면 이 게이트는 못 쓴다 — 멀쩡한 문장을 반드시 통과시켜야 한다.
  const 정상 = [
    "국민연금 가입자는 신청할 수 있습니다", "1만1000원이 부과됩니다", "최대 36개월간 유지됩니다",
    "3개월분할 납부가 가능합니다", "확인하면서도 놓치기 쉽습니다", "기초생활수급자는 대상입니다",
    "주택담보대출을 받는 경우입니다", "36개월입니다", "5년이상 유지하세요", "2년까지 연장됩니다",
  ];
  for (const t of 정상) ok(!hasSpacingDefect(`<p>${t}</p>`), "오탐 없음", t.slice(0, 18));
}

// ── ② 문단 4줄 초과 ────────────────────────────────────────────────────
//  실측: 69문단 중 9개가 4줄 초과(최대 7줄). 모바일 390px에서 벽돌이 된다.
{
  const 긴문단 = "<p>" + "가".repeat(120) + "</p>";
  const 짧은문단 = "<p>" + "가".repeat(40) + "</p>";
  ok(longParagraphs(긴문단).length === 1, "★4줄 초과 문단 검출", `${longParagraphs(긴문단)[0]?.lines}줄`);
  ok(longParagraphs(짧은문단).length === 0, "짧은 문단은 통과");
  // 표·리스트는 산문이 아니라 대상이 아니다(길어도 정상)
  ok(longParagraphs("<table><tr><td>" + "가".repeat(200) + "</td></tr></table>").length === 0, "표는 문단 판정 제외");
  ok(longParagraphs("<ul><li>" + "가".repeat(200) + "</li></ul>").length === 0, "리스트도 제외");
  ok(PARA_MAX_LINES === 4, "상한 4줄(check-article과 같은 기준)");
}

// ── ③ 이모지 하한 ──────────────────────────────────────────────────────
//  실측: 규격은 3~6인데 발행물이 0개였다. 상한만 코드에 있고 하한이 없었다(형광펜과 같은 병).
{
  ok(emojiCount("<p>글자만 있습니다</p>") === 0, "이모지 0개를 0으로 센다");
  ok(emojiCount("<p>📌 핵심 ✅ 확인</p>") === 2, "이모지 개수를 정확히 센다");
  ok(EMOJI_MIN >= 2, `하한 ${EMOJI_MIN}개 이상`);
}

// ── ④ 사진 슬롯 부족 ───────────────────────────────────────────────────
//  실측: 마커가 하한 3개에 딱 붙어 있었다. 섹션이 5개여도 3개만 나온다.
{
  const 섹션5_사진3 = "<h2>a</h2><h2>b</h2><h2>c</h2><h2>d</h2><h2>e</h2><p>[사진: 1][사진: 2][사진: 3]</p>";
  const r = photoSlotShortfall(섹션5_사진3);
  ok(r !== null && r.slots === 3 && r.want === 5, "★섹션 5개인데 사진 3개면 부족으로 잡는다", JSON.stringify(r));
  ok(photoSlotShortfall("<h2>a</h2><h2>b</h2><p>[사진: 1][사진: 2][사진: 3]</p>") === null, "섹션이 적으면 3개로 충분");
  ok(photoSlotShortfall("<h2>a</h2>".repeat(9) + "[사진: 1]".repeat(6)) === null, "상한 6에서 멈춘다(과다 요구 금지)");
}

// ── ⑤ 정렬 검사기가 설정을 따르는가 ────────────────────────────────────
//  ★실측: check-article이 왼쪽 정렬을 기대해 항상 실패로 떴다. 본문 정렬은 2026-07-10에 '중앙'으로 확정됐는데
//   검사기만 안 고쳤다. 항상 실패하는 검사는 정보를 주지 못하고 진짜 사고도 못 잡는다.
{
  const ca = fs.readFileSync(new URL("../app/api/admin/check-article/route.ts", import.meta.url), "utf-8");
  ok(/BODY_ALIGN/.test(ca), "★검사기가 설정값(BODY_ALIGN)을 읽는다");
  ok(!/missing_align_left/.test(ca), "'left 고정' 필드명이 제거됨");
  ok(/expected: wantAlign/.test(ca), "기대 정렬을 응답에 표시");
  ok(BODY_ALIGN === "center", `현재 설정은 ${BODY_ALIGN}(유저 A/B 실측 확정)`);
}

// ── ⑥ 생성 경로 배선 ───────────────────────────────────────────────────
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  for (const [fn, label] of [["spacingDefects", "띄어쓰기"], ["longParagraphs", "문단 길이"], ["emojiCount", "이모지 하한"], ["photoSlotShortfall", "사진 슬롯"]])
    ok(new RegExp(fn).test(gr), `★${label} 게이트가 생성 경로에 배선됨`);
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/띄어쓰기\(2026-08-02 실측 결함\)/.test(ap), "프롬프트에도 띄어쓰기 규격 명시");
  ok(/하한 2 — 실측으로 0개가 나갔다/.test(ap), "프롬프트에도 이모지 하한 명시");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 발행글 품질(띄어쓰기·문단·이모지·사진·정렬)");
process.exit(fail ? 1 : 0);
