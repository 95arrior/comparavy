import { spacingDefects, hasSpacingDefect, longParagraphs, emojiCount, photoSlotShortfall, skeletonReport, EMOJI_MIN, PARA_MAX_LINES } from "../lib/editorial.ts";
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

// ── ⑥ 스켈레톤 준수(2026-08-02 전문 감사) ──────────────────────────────
//  실측 「주식창, 처음 열면…」: FAQ 4개(규격 2), 3줄 요약이 5줄, 도입 인용구 훅 없음.
//  고정 스켈레톤은 "좋은 폼이 추첨되지 않게" 못 박은 건데 개수가 조용히 늘어나 있었다.
{
  const 실측 = "<p>도입 문장</p><blockquote>핵심 요약</blockquote><h2>a</h2><p>Q. 하나</p><p>Q. 둘</p><p>Q. 셋</p><p>Q. 넷</p><h2>오늘의 3줄 요약</h2><ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li></ul>";
  // ★규격 개정(2026-08-03 유저 확정) — '오늘의 3줄 요약' 블록 폐기. 글 앞 '바쁘면 이것만'과 하는 일이 같고,
  //  그 중복이 분량 예산을 밀어내고 있었다(목표 1,800에 실측 7,000~8,000자). 이제 요약 블록은 '있으면 위반'이다.
  const 규격 = "<blockquote>세금이 먼저 빠져나갑니다</blockquote><h2>a</h2><p>Q. 하나</p><p>Q. 둘</p>";
  const r = skeletonReport(실측);
  ok(r.faq === 4 && r.summaryLines === 5 && !r.hasOpeningQuote, "실측 글의 결함을 그대로 재현", `FAQ ${r.faq}·요약 ${r.summaryLines}줄·인용구 ${r.hasOpeningQuote}`);
  ok(r.issues.length === 3, "★세 결함을 모두 지적", `${r.issues.length}건`);
  ok(skeletonReport(규격).issues.length === 0, "규격을 지키면 통과");

  // ★폐기된 블록이 살아 돌아오면 잡는가 — 3줄이어도(종전 '정답') 이제는 위반이다.
  const 폐기블록 = "<blockquote>훅</blockquote><h2>a</h2><p>Q. 하나</p><p>Q. 둘</p><h2>오늘의 3줄 요약</h2><ul><li>1</li><li>2</li><li>3</li></ul>";
  const dep = skeletonReport(폐기블록);
  ok(dep.issues.some((i) => /폐기/.test(i)), "★폐기된 '3줄 요약' 블록을 지적", dep.issues.join(" / ") || "지적 없음");

  // ★자동 삽입도 같이 죽었는가 — 프롬프트에서만 빼고 이걸 남기면 발행 때 소제목이 되살아난다.
  const ph = fs.readFileSync(new URL("../lib/publishHtml.ts", import.meta.url), "utf-8");
  ok(!/export function ensureSummaryHeading/.test(ph), "★'3줄 요약' 자동 삽입 함수가 제거됨");
  ok(!/ensureSummaryHeading\(/.test(ph), "★발행 파이프라인에서도 호출이 제거됨");

  // ★프롬프트 목차에서도 빠졌는가(세 곳이 따로 놀면 또 되살아난다)
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(!/"9\. '오늘의 3줄 요약'/.test(ap), "★프롬프트 목차에서 제거됨");
}

// ── ⑥-2 ★분량 예산(2026-08-03 유저 실측: 목표 1,800인데 7,000~8,000자) ───
//  원인은 모델이 아니라 우리였다: 규격 총합이 이미 목표를 넘고 있었고(규칙 수십 개 vs 숫자 하나),
//  분량 게이트는 재생성 예산을 가드 7개와 나눠 쓰느라 사실상 발동하지 못했다.
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/◎분량 예산/.test(ap), "★블록별 예산이 프롬프트에 있다(총량 숫자 하나로는 안 지켜졌다)");
  ok(/const sectionBudget/.test(ap), "섹션 예산을 코드가 계산한다(채널별로 갈린다)");
  ok(!/280자가 상한/.test(ap), "★섹션 상한 숫자를 목차에 중복해 박지 않는다(드리프트 방지)");
  ok(/쪼개지' 말고 '줄여라|쪼개지'? 말고/.test(ap), "★'넘으면 쪼개라'(길수록 더 길어지는 되먹임)를 제거했다");

  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/LEN_REGEN_CAP/.test(gr), "★분량 게이트가 전용 재생성 예산을 가진다");
  ok(!/charCount > lenCap && regenSpent < REGEN_CAP/.test(gr), "★공용 예산(REGEN_CAP) 경쟁에서 빠졌다 — 앞선 가드가 다 써도 발동한다");
  ok(/dropSections/.test(gr), "★초과폭에 비례해 '버릴 소제목 수'를 코드가 계산해 준다");
  ok(/\[length\]/.test(gr), "★초과·정상 모두 로그로 남긴다(문턱을 감으로 옮기지 않기 위해)");
}

// ── ⑦ ★게이트가 실제로 발동하는가(2026-08-02 검거) ─────────────────────
//  ★가장 중요한 회귀다. 검사를 만들어놓고 발동 조건(deficits)에 안 넣어서
//   띄어쓰기·문단·이모지·사진 결함이 경고 문구만 만들어지고 한 번도 전달되지 않았다.
//   실측: 게이트 배포 29분 뒤 생성된 글이 사진 0·이모지 0·문단 24% 초과로 그냥 통과했다.
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/const specDefects/.test(gr), "결함을 배열로 모은다");
  ok(/const deficits = \(a: \{ body_html: string; title\?: string \}\): number => specDefects\(a\)\.length/.test(gr),
     "★재생성 발동 조건이 결함 배열 길이로 통일됨(새 검사가 자동으로 발동한다)");
  ok(!/lacksKeywordFloor\(a\.body_html, floorTarget\) \? 1 : 0\) \+ headingMismatches/.test(gr),
     "★옛 발동 조건(키워드·소제목 둘만 세던 것)이 제거됨");
}

// ── ⑧ 검사 엔드포인트의 구멍 ───────────────────────────────────────────
//  실측: 마커 0·이미지 0인데 slot_image_synced=true, pass=true로 통과했다.
//  0<=3 이고 0<=0 이라 참이 된 것이다 — '사진이 아예 없는 글'을 정상으로 봤다.
{
  const ca = fs.readFileSync(new URL("../app/api/admin/check-article/route.ts", import.meta.url), "utf-8");
  ok(/markerCount >= 3 && imageCount <= markerCount/.test(ca), "★사진 0개를 통과시키던 조건 수정");
  ok(/markerCount >= 3 && emojiHit >= 2/.test(ca), "★pass 조건에 사진·이모지 하한 반영");
  ok(!/emojiHit === 0/.test(ca), "이모지 0을 통과 조건으로 두던 것 제거");
}

// ── ⑨ 생성 경로 배선 ───────────────────────────────────────────────────
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  for (const [fn, label] of [["spacingDefects", "띄어쓰기"], ["longParagraphs", "문단 길이"], ["emojiCount", "이모지 하한"], ["photoSlotShortfall", "사진 슬롯"], ["skeletonReport", "스켈레톤"]])
    ok(new RegExp(fn).test(gr), `★${label} 게이트가 생성 경로에 배선됨`);
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/띄어쓰기\(2026-08-02 실측 결함\)/.test(ap), "프롬프트에도 띄어쓰기 규격 명시");
  ok(/하한 2 — 실측으로 0개가 나갔다/.test(ap), "프롬프트에도 이모지 하한 명시");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 발행글 품질(띄어쓰기·문단·이모지·사진·정렬)");
process.exit(fail ? 1 : 0);
