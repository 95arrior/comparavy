import { spacingDefects, hasSpacingDefect, longParagraphs, emojiCount, photoSlotShortfall, skeletonReport, hasFabricatedExperience, sectionBudgetReport, tailSummaryBullets, ensureHashtags, hardTrimToLimit, HARD_CHAR_LIMIT, eligibilityTableIssues, EMOJI_MIN, PARA_MAX_LINES } from "../lib/editorial.ts";
import { BODY_ALIGN } from "../config/publish.ts";
import fs from "node:fs";
import { capFaq } from "../lib/publishHtml.ts";
import { ensureRelatedLinks } from "../lib/editorial.ts";

// ★발행글 감사 회귀(2026-08-02) — 실제 발행물 「퇴사 전날까지 받을 수 있는 돈」을 검사해 나온 결함들.
//  이 다섯은 전부 '규격은 있는데 코드가 안 재던' 것들이다. 프롬프트만으로는 지켜지지 않는다는 게 실측으로 확인됐다.
const fin2 = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");   // 마감 조립(두 경로 공용)
const rp = fs.readFileSync(new URL("../lib/relatedPosts.ts", import.meta.url), "utf-8");     // 관련글 후보(두 경로 공용)
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
  // ★하한 3 → 5(2026-08-05 유저: "5개 이상 이미지 넣어야 하지 않을까요") — 섹션이 적어도 5장은 요구한다
  ok(photoSlotShortfall("<h2>a</h2><h2>b</h2>" + "[사진: x]".repeat(5)) === null, "섹션이 적어도 5장이면 충분");
  ok(photoSlotShortfall("<h2>a</h2><h2>b</h2>" + "[사진: x]".repeat(3)) !== null, "★3장은 이제 부족");
  ok(photoSlotShortfall("<h2>a</h2>".repeat(12) + "[사진: x]".repeat(8)) === null, "상한 8에서 멈춘다(과다 요구 금지)");
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
  // ★문단 길이는 2026-08-06부터 게이트가 아니라 마감(splitMultiSentenceParagraphs)이 보장한다.
  //  경고로 두면 재생성 예산이 없을 때 그대로 발행되고(유저가 본 13줄이 그 경로),
  //  게다가 규격을 지킨 90자 한 문장이 4줄 상한에 영구히 걸린다. 보장 자리의 주인은 하나여야 한다.
  ok(/splitMultiSentenceParagraphs/.test(fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8")), "★문단 길이는 마감이 보장한다");
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

// ── ⑥-3 ★상위 글 4편 실측에서 뒤집은 규격(2026-08-03) ────────────────
//  유저 제공 레퍼런스(삼성전자 배당·엔비디아 시총·비트코인·서울 재산세) 공통 구조:
//  본문은 1,100~1,300자인데 정보량은 우리보다 많다. 차이는 '정보를 무엇이 나르는가'였다 —
//  표·캡처가 정보를 나르고 텍스트는 해석만 한다. 우리는 정보를 문장으로 날라서 7,000자가 됐다.
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");

  // ① 표 재서술 금지 — 종전 규칙("표 내용은 본문 텍스트로도 서술한다")이 표를 넣어도 분량이 안 줄게 만들었다
  ok(!/표 내용은 본문 텍스트로도 서술한다/.test(ap), "★'표를 본문으로 다시 서술' 규칙이 제거됨");
  ok(/핵심 한 행'?만 골라/.test(ap), "★표 뒤에는 핵심 한 행만 해석한다");

  // ② 관점 섹션 — 정보 섹션만 쌓이면 길어지고 '그래서 어쩌라고'가 남는다
  ok(/관점 섹션/.test(ap), "★소제목 중 최소 1개는 관점 섹션");

  // ③ FAQ 조건부 — 레퍼런스 4편 중 FAQ가 있는 글이 0편이었다
  ok(/신청·절차·자격·기한이 있는 글감일 때만/.test(ap), "★FAQ가 조건부로 전환됨");

  // ④ 1인칭 판단 허용 / 경험 날조 금지 — 이 둘을 같이 눌러서 정보 나열만 남았다
  ok(/1인칭 판단·반응은 쓴다/.test(ap), "★1인칭 판단·반응 허용이 명시됨");
  ok(/경험 서술은 어느 경우든 금지/.test(ap), "★경험 날조 금지선은 유지됨");

  // ★가드가 판단까지 잡으면 안 된다 — 허용하기로 한 문장이 실제로 통과하는지 확인
  const 판단문 = "<p>솔직히 이 금액은 좀 아쉽습니다. 저라면 자격 조회부터 먼저 하겠습니다.</p>";
  const 경험문 = "<p>제가 직접 신청해 보니 3일 걸렸습니다.</p>";
  ok(!hasFabricatedExperience(판단문), "★판단·반응 문장은 경험 가드를 통과한다");
  ok(hasFabricatedExperience(경험문), "★경험 서술은 여전히 잡힌다");
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
  for (const [fn, label] of [["spacingDefects", "띄어쓰기"], ["emojiCount", "이모지 하한"], ["photoSlotShortfall", "사진 슬롯"], ["skeletonReport", "스켈레톤"]])
    ok(new RegExp(fn).test(gr), `★${label} 게이트가 생성 경로에 배선됨`);
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/띄어쓰기\(2026-08-02 실측 결함\)/.test(ap), "프롬프트에도 띄어쓰기 규격 명시");
  ok(/하한 2 — 실측으로 0개가 나갔다/.test(ap), "프롬프트에도 이모지 하한 명시");
}


// ── ⑥-4 ★분량 예산 한계선(2026-08-03 유저 실측: 목표 1,800인데 2,603자) ──
//  프롬프트로만 예산을 줬더니 섹션마다 1.3~1.7배로 넘겼다.
//  '프롬프트는 방향, 코드는 한계선'(CLAUDE.md)을 분량에만 안 지키고 있었다.
{
  const BUDGET = 330; // 네이버: (1800 - 고정블록 480) / 소제목 4
  // ★유저가 잡은 실물 그대로 — 2금융권 섹션이 546자였다(예산의 1.7배)
  const 실측 = "<h2>2금융권 진입 기준</h2>" + "<p>소득 증빙이 어렵다면 저축은행과 캐피탈이 현실적인 경로입니다.</p>".repeat(20)
    + "<h2>짧은 섹션</h2><p>여기는 예산 안에 들어온다.</p>";
  const r = sectionBudgetReport(실측, BUDGET);
  ok(r.sections.length === 2, "소제목 단위로 글자수를 센다", `${r.sections.length}개`);
  ok(r.issues.length === 1, "★예산 초과 섹션만 지적한다(짧은 섹션은 통과)", `${r.issues.length}건`);
  ok(/2금융권/.test(r.issues[0] ?? ""), "★어느 섹션이 부풀었는지 이름으로 짚는다");

  // ★1.3배까지는 봐준다 — 1.0배로 조이면 매번 걸려서 재생성만 돈다(품질 심사가 아니라 최소선)
  const 경계 = `<h2>경계</h2><p>${"가".repeat(Math.round(BUDGET * 1.2))}</p>`;
  ok(sectionBudgetReport(경계, BUDGET).issues.length === 0, "★1.2배는 통과(최소선이지 품질 심사가 아니다)");

  // ★FAQ는 섹션 예산이 아니라 자기 예산(≈100자)으로 잰다 — 같은 자로 재면 안 된다
  const faq = `<h2>자주 묻는 질문</h2><p>${"가".repeat(300)}</p>`;
  const fr = sectionBudgetReport(faq, BUDGET);
  ok(fr.issues.some((i) => /자주 묻는 질문/.test(i)), "★FAQ 초과는 따로 잡는다", fr.issues[0] ?? "");
}

// ── ⑥-5 ★폐기 블록이 이름을 바꿔 되살아나는 것 ────────────────────────
//  실측: '오늘의 3줄 요약'을 폐기했더니 소제목 없이 글 끝 불릿 5개로 돌아왔다.
//  이름(<h2>요약</h2>)으로 찾던 검사를 우회한 것이라, 모양으로 잡는다.
{
  const 본문 = "<p>본문 문단이 길게 이어지는 상황을 만든다</p>".repeat(40); // ★불릿이 글 뒷부분(70% 이후)에 오게 — 문턱을 실제로 넘겨야 검사가 의미가 있다
  const 요약부활 = 본문 + "<ul>"
    + ["1금융권, DSR 40% 규제로 소득 없으면 한도 0", "LTV 한도 계산, 감정가 곱하기 한도 빼기 선순위 잔액",
       "2금융권, 저축은행과 캐피탈이 현실적 경로입니다", "대체 소득 증빙, 임대차 계약서가 있으면 조건이 달라짐",
       "신청 순서, 신용 이력 확인 후 연체 정리 순서로"].map((t) => `<li>${t}</li>`).join("") + "</ul>";
  ok(tailSummaryBullets(요약부활) === 5, "★소제목 없는 끝 요약 불릿을 잡는다", `${tailSummaryBullets(요약부활)}개`);

  // ★허용된 뒷부분 목록과 구분해야 한다 — 규격이 명시적으로 허용한 것들이다
  const 체크리스트 = 본문 + "<ul><li>□ 한전ON에서 신청</li><li>□ 정부24 조회</li><li>□ 계좌 확인</li><li>□ 서류 준비하기</li></ul>";
  ok(tailSummaryBullets(체크리스트) === 0, "★체크박스 점검 리스트는 허용(저장률 장치)");
  const 도움 = 본문 + "<ul><li>이사 예정이라면 도움 돼요</li><li>전세 계약 앞두면 도움 돼요</li><li>보증금 올랐다면 해당돼요</li><li>재계약을 앞두고 있다면 해당됩니다</li></ul>";
  ok(tailSummaryBullets(도움) === 0, "★'이런 분께 도움 돼요' 목록은 허용");
  const 짧은목록 = 본문 + "<ul><li>가</li><li>나</li><li>다</li></ul>";
  ok(tailSummaryBullets(짧은목록) === 0, "3개 이하 짧은 목록은 요약이 아니다");
}

// ★게이트가 생성 경로에 실제로 배선됐는가 — 만들어놓고 안 부르면 아무 일도 안 일어난다
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/sectionBudgetReport\(a\.body_html/.test(gr), "★섹션 예산 게이트가 결함 수집에 배선됨");
  ok(/tailSummaryBullets\(a\.body_html\)/.test(gr), "★끝 요약 불릿 게이트가 결함 수집에 배선됨");
  ok(/targetMaxFor\(channel\)/.test(gr), "★목표 상한이 단일 진실원(targetMaxFor)에서 온다");
}


// ── ⑥-6 ★'읽는 분량'만 센다(2026-08-03 유저: "이거 글자수 거짓 같던데") ──
//  화면엔 2,917자인데 실제 본문은 2,603자였다. 종전 카운터는 태그·공백만 빼고 나머지를 전부 셌다:
//  [사진:] 슬롯 마커(발행 시 이미지가 된다)·해시태그(네이버는 본문 분량으로 안 친다)·URL(링크 버튼).
//  이걸 같이 세면 목표 1,800이 실제로는 '본문 1,500 + 부속물 300'이 되어 의도와 달라진다.
{
  const BUDGET = 330;
  const 본문만 = "<h2>섹션</h2><p>" + "가".repeat(200) + "</p>";
  const 부속물포함 = "<h2>섹션</h2><p>" + "가".repeat(200) + "</p>"
    + "<p>[사진: 은행 창구 앞 대기 의자와 번호표 뽑는 손]</p>"
    + "<p>[전편 링크 자리]</p>"
    + "<p>https://blog.naver.com/rider95-/224364896745</p>"
    + "<p>#무직자주택담보대출 #무직자대출 #주택담보대출한도 #LTV기준 #후순위담보대출</p>";
  const a = sectionBudgetReport(본문만, BUDGET).sections[0].chars;
  const b = sectionBudgetReport(부속물포함, BUDGET).sections[0].chars;
  ok(a === 200, "본문 글자수를 정확히 센다", `${a}자`);
  ok(b === a, "★슬롯 마커·해시태그·URL은 분량에 안 넣는다", `부속물 포함 ${b}자 (본문만 ${a}자)`);

  // ★총량 게이트와 섹션 게이트가 같은 자를 써야 한다 — 다르면 '섹션 합은 예산 안인데 총량 초과'가 생긴다
  const hum = fs.readFileSync(new URL("../lib/humanizer.ts", import.meta.url), "utf-8");
  ok(/export function countBodyChars/.test(hum), "★'읽는 분량' 카운터가 있다");
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(!/countKoreanChars\(/.test(gr), "★생성 경로가 옛 카운터를 안 쓴다(분량 판정은 읽는 분량으로)");
  const art = fs.readFileSync(new URL("../app/api/articles/[id]/route.ts", import.meta.url), "utf-8");
  ok(/countBodyChars\(/.test(art), "★화면에 표시되는 char_count도 같은 자로 잰다");
}


// ── ⑥-7 ★해시태그·내부링크는 분량 예산 밖이다(2026-08-03 유저 제보) ────
//  실측: 분량을 조였더니 모델이 해시태그를 곁가지로 보고 통째로 버렸다.
//  ★이건 내가 만든 부작용이다 — '곁가지를 버려라'가 노출 장치까지 쓸어갔다.
//  해시태그·링크 카드는 네이버 편집기에서 본문 글자로 안 들어간다. 버려도 분량은 안 줄고
//  노출·회유 장치만 잃는다. 즉 없을 이유가 전혀 없다.
{
  const 없음 = "<p>무기명채권은 소지인이 곧 소유자입니다.</p>";
  const r = ensureHashtags(없음, "무기명채권 세금", "재테크");
  ok(/#/.test(r), "★해시태그가 없으면 코드가 채운다", r.replace(/<[^>]+>/g, " ").trim().slice(0, 40));

  // ★지어내지 않는다 — 키워드에서 파생한 것만(해시태그는 사실 주장이 아니라 분류 라벨이다)
  const tags = (r.match(/#[^\s#<]+/g) ?? []).map((t) => t.slice(1));
  ok(tags.every((t) => "무기명채권세금재테크".includes(t.replace(/\s/g, ""))), "★키워드 파생만 쓴다(없는 말 금지)", tags.join(","));

  // ★이미 있으면 손대지 않는다(모델이 잘 쓴 태그를 덮지 않는다)
  const 있음 = "<p>본문</p><p>#무기명채권 #채권투자 #세금 #금융소득</p>";
  ok(ensureHashtags(있음, "무기명채권") === 있음, "★이미 있으면 그대로 둔다");

  // ★핵심: 해시태그를 붙여도 분량이 안 늘어야 한다 — 늘면 예산 게이트가 애먼 걸 자르게 된다
  const a = sectionBudgetReport("<h2>s</h2>" + 없음, 330).sections[0].chars;
  const b = sectionBudgetReport("<h2>s</h2>" + r, 330).sections[0].chars;
  ok(a === b, "★해시태그는 분량에 안 잡힌다(예산 중립)", `${a}자 → ${b}자`);

  // ★프롬프트에도 '예산 밖'이라고 적혀 있는가 — 코드만 고치면 모델은 계속 버리려 든다
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/예산 밖\(줄이지 마라\)/.test(ap), "★분량 예산 블록에 '예산 밖' 항목이 명시됨");
  ok(/해시태그[\s\S]{0,80}생략 금지/.test(ap), "★해시태그 생략 금지가 명시됨");

  // ★내부링크도 같은 이유로 살린다 — 0개로 흐르던 선별 규칙을 '1~2개 기본'으로
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  // ★2026-08-04 개정: LLM 심리 판정을 폐기하고 '판정 없이 최근 글 2~3개'로 바꿨다(유저 확정).
  ok(/판정은 하지 않는다/.test(rp), "★내부링크는 판정 없이 최근 글에서 뽑는다(lib/relatedPosts)");
  ok(/ensureHashtags\(withLinks/.test(fin2), "★해시태그 보장이 마감에 배선됨(내부링크 뒤에 붙는다)");

  // ★모델이 만든 태그를 1순위로 쓴다(2026-08-03 유저 화면에서 확인) —
  //  모델은 tags 필드에는 잘 넣고 본문 하단에만 안 썼다. 그 태그가 키워드 파생보다 훨씬 낫다:
  //  '리딩방 사기'·'불공정거래 신고'는 키워드에서 절대 못 뽑는 말이다.
  const 모델태그 = ["주식방", "리딩방 사기", "불법투자자문", "불공정거래 신고", "주식 피해"];
  const withModel = ensureHashtags("<p>주식 리딩방 피해가 늘고 있습니다.</p>", "주식 리딩방", "재테크", 모델태그);
  ok(/#리딩방사기/.test(withModel), "★모델 태그를 본문 하단에 그대로 쓴다", withModel.replace(/<[^>]+>/g, " ").trim().slice(-40));
  ok(!/#주식리딩방/.test(withModel), "★모델 태그가 충분하면 키워드 파생을 섞지 않는다");

  const noModel = ensureHashtags("<p>본문입니다.</p>", "주식 리딩방", "재테크", []);
  ok(/#주식리딩방/.test(noModel), "★모델 태그가 없을 때만 키워드에서 파생한다(폴백)");

  ok(/\(article as \{ tags\?: unknown \}\)\.tags/.test(gr), "★모델 태그가 생성 경로에서 실제로 전달된다");

  // ★'이미 있다' 오판 방어(2026-08-04 유저: "아직도 본문에 안 붙는다").
  //  종전엔 태그만 벗기고 /#[^\\s#]+/로 셌다 — HTML 엔티티(&#39; 결)의 '#39;'과 본문의 '#1'이
  //  해시태그로 세어졌고, 셋만 오인되면 '이미 있다'로 보고 통째로 건너뛰었다.
  const 엔티티 = "<p>&#39;신청&#39; 절차입니다.</p><p>&#39;확인&#39;이 먼저입니다.</p><p>&#39;마감&#39; 주의.</p>";
  ok(ensureHashtags(엔티티, "주식 리딩방", "재테크", 모델태그) !== 엔티티, "★HTML 엔티티를 해시태그로 오인하지 않는다");
  const 번호 = "<p>#1 순위는 이것.</p><p>#2 는 저것.</p><p>#3 도 있음.</p><p>마무리.</p>";
  ok(ensureHashtags(번호, "주식 리딩방", "재테크", 모델태그) !== 번호, "★본문의 '#1' 표기를 해시태그로 오인하지 않는다");
  const 진짜 = "<p>본문</p><p>#주식방 #리딩방사기 #불법투자자문 #주식피해</p>";
  ok(ensureHashtags(진짜, "주식 리딩방", "재테크", 모델태그) === 진짜, "★진짜 해시태그가 있으면 건너뛴다(중복 방지)");
}


// ── ⑥-8 ★분량 하드컷(2026-08-04 유저: "최대 2500자를 넘지 마세요") ──────
//  ★지금까지 분량 게이트는 전부 '경고 → 재생성'이었다. 재생성이 실패하거나 예산이 없으면 그냥 통과했고,
//   그래서 유저가 네 번 연속 긴 글을 받았다. 부탁이 아니라 실행이어야 한다.
{
  const cnt = (h) => h.replace(/<[^>]+>/g, "").replace(/\s/g, "").length;
  // ★2,500 → 3,200 상향(2026-08-05 유저 확정: "분량 필요하다면 더 늘려도 돼요. 체류시간에 도움이 되니깐.
  //  대신 너무 길게 오바하지만 않게"). 종전 값은 '노출' 하나만 보고 정했는데,
  //  애드포스트 수익은 노출 × 체류 × 슬롯이라 짧은 글은 슬롯도 체류도 함께 잃는다.
  //  ★상한이 사라진 게 아니다 — 자르는 장치는 그대로 살아 있어야 한다(이게 없으면 7,000자 글이 다시 나온다).
  ok(HARD_CHAR_LIMIT === 3200, "★하드 상한 3,200자(2026-08-05 상향)", String(HARD_CHAR_LIMIT));

  const sec = (t, n) => `<h2>${t}</h2><p>${"가".repeat(n)}</p>`;
  const 긴글 = sec("첫 섹션", 1000) + sec("둘째 섹션", 1000) + sec("자주 묻는 질문", 900) + sec("셋째 섹션", 1000) + "<p>마무리 문장</p>";
  const r = hardTrimToLimit(긴글, cnt);
  ok(cnt(r.html) <= HARD_CHAR_LIMIT, "★상한 안으로 줄인다", `${cnt(긴글)}자 → ${cnt(r.html)}자`);
  ok(r.removed.includes("자주 묻는 질문"), "★FAQ부터 뺀다(본문이 이미 답한 것이라 손실이 가장 적다)", r.removed.join(","));
  ok(/마무리 문장/.test(r.html), "★클로징은 보존한다(뚝 끊긴 글이 되면 안 된다)");

  // ★과교정 방어 — 상한 안이면 손대지 않는다
  const 짧은글 = sec("가", 300) + sec("나", 300);
  ok(hardTrimToLimit(짧은글, cnt).removed.length === 0, "★상한 안이면 그대로 둔다");
  // ★소제목 2개 이하로는 줄이지 않는다(글이 아니게 된다)
  const 두섹션 = sec("가", 2000) + sec("나", 2000);
  ok(hardTrimToLimit(두섹션, cnt).removed.length === 0, "★소제목 2개 미만으로는 안 줄인다");

  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/hardTrimToLimit\(/.test(fin2), "★마감에 배선됨(압축 재생성 실패해도 상한은 지켜진다)");
  ok(/\[hard-trim\]/.test(gr), "★자를 때 무엇을 뺐는지 로그로 남긴다");

  // ★리스트 → 표(유저: "리스트가 많은 부분은 표로")
  const ph = fs.readFileSync(new URL("../lib/publishHtml.ts", import.meta.url), "utf-8");
  ok(/function listToTable/.test(ph), "★리스트를 표로 바꾸는 변환이 있다");
  ok(/listToTable\(capFaq/.test(ph), "★발행 파이프라인에 배선됨");
  ok(/체크리스트는 그대로 둔다/.test(ph), "★체크리스트는 표로 바꾸지 않는다(저장률 장치)");
  // ★표는 '저장물'에도 있어야 한다(2026-08-04 유저 실측: 데이터 카드가 안 만들어졌다).
  //  인포그래픽 API는 body_html의 <table>·☐를 재료로 쓴다 — 화면에만 표면 카드가 안 나온다.
  //  그리고 화면과 저장이 다르면 그 자체로 사고다(같은 글이 두 모습이 된다).
  ok(/listToTable\(src\)/.test(fin2), "★리스트→표가 저장 시점에도 적용된다");
  ok(/export function listToTable/.test(ph), "★변환 함수가 export돼 두 경로가 같은 것을 쓴다");

  // ★데이터 카드 자동 생성 — 화면이 "자동으로 만들어져요"라고 약속하는데 호출부가 없었다
  const am = fs.readFileSync(new URL("../components/dashboard/ArticleModal.tsx", import.meta.url), "utf-8");
  ok(/void makeInfographic\(i, sl\.desc\)/.test(am), "★카드 슬롯을 보면 자동으로 만든다(약속한 UI 문구는 명세다)");
  ok(/if \(st\?\.url \|\| st\?\.busy \|\| st\?\.err\) continue/.test(am), "★이미 있거나 도는 중이거나 실패한 건 다시 안 부른다(무한 루프 방지)");
  ok(/다시<\/button>/.test(am), "★실패했을 때 유저가 다시 시도할 길이 있다");

  // ★함께 보면 좋은 글 2~3개 고정(유저: "핏한 게 없어도 넣어라")
  // ★보강 로직은 ensureRelatedLinks로 옮겼다 — 모델이 안 써도 코드가 붙인다(더 확실한 자리).
  ok(/ensureRelatedLinks\(clean\.html/.test(fin2), "★내부링크를 코드가 보장한다");

  // ★이미지 설명 상세화 + AI 인용 구조
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  // ★규칙이 뒤집혔다(2026-08-05 유저: "주저리 부저리 쓰지 마세요, 그냥 대충 툭 '서울 아파트 단지'").
  //  종전 '상세하게'는 AI가 그려 주던 시절 것이고, 지금은 유저가 그 문장을 검색창에 넣는다.
  ok(/설명은 짧게, 검색어처럼 쓴다/.test(ap), "★사진 설명은 짧은 검색어형");
  ok(/AI 인용 구조/.test(ap), "★수치는 표나 '라벨: 값'으로 세우게 한다");
  ok(/하드 상한 3,200자/.test(ap), "★프롬프트에도 하드 상한이 명시됨");
  const md = fs.readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf-8");
  // ★숫자를 박아두면 상한을 올릴 때마다 이 검사만 깨진다(2026-08-05 실측).
  //  지켜야 할 건 '2,500'이 아니라 '코드와 문서가 같은 값을 본다'다 — 상수에서 읽어 대조한다.
  const mdNum = /하드 상한 ([\d,]+)자/.exec(md)?.[1]?.replace(/,/g, "");
  ok(Number(mdNum) === HARD_CHAR_LIMIT, "★CLAUDE.md와 코드가 같은 숫자를 본다", `문서 ${mdNum} · 코드 ${HARD_CHAR_LIMIT}`);
}


// ── ⑥-9 ★자격 요건 표(2026-08-04 유저 실측: 데이터 카드가 틀린 연령을 박았다) ──
//  실물: '만 18~34세 | 청년미래적금, 청년월세지원, 국민취업지원제도 청년특례'
//  ★셋의 실제 하한이 19·19·15로 다르다 — 묶는 순간 어떤 숫자를 써도 틀린다.
//   그리고 청년기본법 기준이 19세라 '18세'는 어느 제도에도 안 맞는 숫자였다.
//  ★이 표가 그대로 이미지 카드가 된다: 이미지는 발행 뒤 고치기 어렵고, 자격이 틀리면
//   독자가 실제로 신청 손해를 본다(3원칙의 법적 안전).
{
  const T = (rows) => `<table>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;

  // ★유저가 잡은 실물 그대로
  const 실물 = T([["나이 구간", "주요 해당 제도", "유의사항"],
    ["만 18~34세", "청년미래적금, 청년월세지원, 국민취업지원제도 청년특례", "대부분 제도의 기본 기준"],
    ["만 35~39세", "국민취업지원제도 일반형, 청년형 ISA 일부", "청년 특례 적용 안 되는 제도 많음"]]);
  const r = eligibilityTableIssues(실물);
  ok(r.length > 0, "★유저가 잡은 실물 표를 잡는다", r[0]?.why.slice(0, 40) ?? "못 잡음");
  ok(/한 행에 묶고/.test(r[0]?.why ?? ""), "★'제도를 묶었다'는 진짜 원인을 짚는다");

  ok(eligibilityTableIssues(T([["대상", "연령"], ["청년월세지원", "만 19~34세"]])).length > 0,
     "★자격 수치인데 출처가 없으면 잡는다");

  // ★과교정 방어 — 이 셋이 막히면 이 게이트는 못 쓴다
  ok(eligibilityTableIssues("<p>출처: 국토교통부 · 2026년 1월 기준</p>" + T([["대상", "연령"], ["청년월세지원", "만 19~34세"]])).length === 0,
     "★출처가 있으면 통과");
  ok(eligibilityTableIssues(T([["보유 수량", "세전", "세후"], ["100주", "37,400원", "31,600원"]])).length === 0,
     "★자격 수치 없는 표는 손대지 않는다");
  ok(eligibilityTableIssues("<p>만 19~34세 청년이라면 신청할 수 있습니다.</p>").length === 0,
     "★산문의 연령 언급은 보지 않는다(표만 본다)");

  // ★두 층 다 배선됐는가 — 한 층만 막으면 다른 경로로 샌다(오늘 다섯 번 겪은 일)
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/eligibilityTableIssues\(a\.body_html\)/.test(gr), "★층1: 생성 시 결함으로 올린다");
  const ig = fs.readFileSync(new URL("../app/api/infographic/route.ts", import.meta.url), "utf-8");
  ok(/eligibilityTableIssues\(html\)/.test(ig), "★층2: 카드 생성 자체를 거부한다(재생성에 의존하지 않는다)");
  ok(/status: 422/.test(ig), "★거부 이유를 유저에게 보여준다");
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/자격 요건 표 규칙/.test(ap), "★프롬프트에도 규칙이 있다(애초에 안 만드는 게 낫다)");
}


// ── ⑥-10 ★★글이 FAQ에서 뚝 끝나던 치명적 버그(2026-08-04 유저 실측) ──────
//  capFaq 1차 구현이 '3번째 Q부터 다음 h2 전까지'를 잘랐다. 그런데 FAQ는 보통 마지막 섹션이고
//  클로징엔 h2가 없다 — 그래서 cutTo가 문서 끝이 되어 ★클로징이 통째로 삭제됐다.
//  ★교훈: '어디까지 지울지'를 문서 끝으로 잡으면 안 된다. 지울 것의 경계로 잡아야 한다.
{
  const html = "<h2>본문 섹션</h2><p>내용입니다.</p>"
    + "<h2>자주 묻는 질문</h2>"
    + "<p>Q. 첫째 질문인가요?</p><p>첫째 답변입니다.</p>"
    + "<p>Q. 둘째 질문인가요?</p><p>둘째 답변입니다.</p>"
    + "<p>Q. 셋째 질문인가요?</p><p>셋째 답변입니다.</p>"
    + "<p>Q. 넷째 질문인가요?</p><p>넷째 답변입니다.</p>"
    + "<ul><li>□ 체크 하나</li><li>□ 체크 둘</li></ul>"
    + "<p>조건은 기관마다 다르니 공식 안내를 확인하세요.</p>"
    + "<p>오늘은 자격 조회부터 해보세요.</p>";
  const out = capFaq(html);
  ok((out.match(/Q[.．]/g) ?? []).length === 2, "Q&A가 2개로 줄었다");
  ok(/체크 하나/.test(out), "★클로징 체크리스트가 살아 있다");
  ok(/공식 안내를 확인하세요/.test(out), "★신뢰 문구가 살아 있다");
  ok(/자격 조회부터 해보세요/.test(out), "★마지막 CTA가 살아 있다 — 글이 FAQ에서 끝나면 안 된다");
  ok(!/셋째 질문|넷째 질문/.test(out), "3~4번째 Q&A만 지워졌다");

  const two = "<h2>FAQ</h2><p>Q. 하나</p><p>답</p><p>Q. 둘</p><p>답</p><p>클로징</p>";
  ok(capFaq(two) === two, "★Q&A 2개면 손대지 않는다(과교정 방어)");

  // ★데이터 카드 끊김 — 구분자 노출·항목 뭉침·글자 잘림
  const ig = fs.readFileSync(new URL("../app/api/infographic/route.ts", import.meta.url), "utf-8");
  ok(/<\\\/\(p\|li\|td\|tr\|h\[1-6\]\|div\)>/.test(ig) || /li\|td\|tr/.test(ig), "★<li>·<td>도 줄바꿈으로 바꾼다(항목이 한 줄로 뭉치던 원인)");
  ok(/split\(\/\\s\*\[\|;·\]\\s\*\/\)/.test(ig) || /\[\|;·\]/.test(ig), "★구분자가 섞인 줄은 쪼갠다");
  ok(/length <= 40/.test(ig), "★긴 항목은 버린다(렌더러가 잘라 말이 끊긴다)");
}


// ── ⑥-11 ★함께 보면 좋은 글 — 코드가 보장한다(2026-08-04 유저 확정) ──────
//  유저: "설명 하지 말고 그냥 2-3개씩 넣자. 함께보는 글도 적지 말고. 꼭 연관 없어도 될 것 같다."
//  ★종전엔 ①모델이 마커를 써야 링크가 나왔고(안 쓰면 0개) ②하이쿠가 심리 연속성으로 판정했는데
//   규칙이 "확신 없으면 0개"라 링크가 통째로 빠지는 날이 잦았다. 부탁이 아니라 실행으로 바꾼다.
//  ★근거: 링크 카드는 네이버 편집기에서 본문 분량을 안 먹는다 — 넣어서 잃을 게 없다.
//   그리고 재테크 블로그의 최근 글은 어차피 대부분 재테크라 판정 없이 뽑아도 크게 안 어긋난다.
{
  const posts = [
    { title: "연말정산 환급 조건", url: "https://blog.naver.com/x/1?tr=1" },
    { title: "신용카드 고르는 기준", url: "https://blog.naver.com/x/2" },
    { title: "전세대출 한도", url: "https://blog.naver.com/x/3" },
    { title: "중복 글", url: "https://blog.naver.com/x/1" },
  ];
  const body = "<p>본문</p><p>마무리 문장</p>";
  const r = ensureRelatedLinks(body, posts);
  ok((r.match(/\[마무리관련글:/g) ?? []).length === 3, "★없으면 3개를 붙인다(모델에 맡기지 않는다)");
  ok(!/\| 중복 글/.test(r), "★같은 URL은 한 번만 — 트래킹 파라미터 달라도 같은 글이다");
  ok(!/연결 이유|유리합니다/.test(r), "★설명 문장을 넣지 않는다");
  ok(ensureRelatedLinks(body, []) === body, "★후보가 없으면 그대로 둔다");

  // ★2026-08-04 실측 재발 — 모델이 URL 없는 껍데기를 3개 써 놓자 '이미 있음'으로 세어 코드가 손을 뗐고,
  //  주소 없는 마커는 렌더 변환도 못 통과해 대괄호 원문이 독자 화면에 그대로 노출됐다.
  const husk = body + "<p>[마무리관련글: | 출산지원금 타임라인]</p><p>[마무리관련글: | 배달 라이더 수입]</p><p>[마무리관련글: | 정부지원금 대출]</p>";
  const r3 = ensureRelatedLinks(husk, posts);
  ok(!/\[마무리관련글:\s*\|/.test(r3), "★URL 없는 껍데기 마커는 남지 않는다(실측 사고)");
  ok((r3.match(/\[마무리관련글: https/g) ?? []).length === 3, "★껍데기를 걷어내고 진짜 주소 3개를 붙인다");
  const modelMade = body + "<p>[마무리관련글: https://a/1 | 제목1]</p><p>[마무리관련글: https://a/2 | 제목2]</p>";
  const r4 = ensureRelatedLinks(modelMade, posts);
  ok(!/https:\/\/a\/1/.test(r4) && (r4.match(/\[마무리관련글:/g) ?? []).length === 3, "★모델이 쓴 마커는 유효해도 버리고 코드가 다시 만든다(자리의 주인은 하나)");
  ok(!/<p>\s*<\/p>/.test(r4), "★마커만 있던 문단은 문단째 걷어낸다(빈 여백 금지)");

  // ★배선 — 만들어놓고 안 부르면 아무 일도 안 일어난다(오늘 다섯 번 겪었다)
  // ★2026-08-04 2차 검거: 경로가 둘이었다. /api/generate엔 마감이 다 있었는데 /api/pregen(카드에서 바로
  //  열리는 글)엔 URL 정화까지만 있어 링크도 해시태그도 없는 글이 유저에게 갔다. 마감은 한 함수로만 한다.
  const fin = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/ensureRelatedLinks\(clean\.html, related\)/.test(fin) && /ensureHashtags\(withLinks/.test(fin), "★마감 함수가 관련글·해시태그를 붙인다");
  ok(/listToTable\(src\)/.test(fin) && /hardTrimToLimit\(/.test(fin), "★리스트→표·분량 하드컷도 같은 마감 안에 있다");
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  const pg = fs.readFileSync(new URL("../app/api/pregen/route.ts", import.meta.url), "utf-8");
  ok(/finalizeArticleBody\(\{/.test(gr), "★생성 경로가 마감 함수를 부른다");
  ok(/finalizeArticleBody\(\{/.test(pg), "★사전생성(pregen) 경로도 같은 마감 함수를 부른다");
  ok(/relatedPostsFor\(/.test(gr) && /relatedPostsFor\(/.test(pg), "★관련글 후보도 두 경로가 같은 함수를 쓴다");
  ok(!/ensureRelatedLinks/.test(gr) && !/ensureHashtags/.test(gr), "★라우트가 마감 단계를 따로 복붙하지 않는다(드리프트 원천 차단)");
  // ★사전 생성분은 '미리' 만들어진다 — 마감 규칙을 고쳐도 대기 중이던 글은 옛 몸이다(2026-08-05 유저 재제보).
  //  여는 순간 한 번 더 태운다. finalizeArticleBody는 멱등이라 두 번 걸어도 같은 결과다.
  const cl = fs.readFileSync(new URL("../app/api/pregen/claim/route.ts", import.meta.url), "utf-8");
  ok(/finalizeArticleBody\(\{/.test(cl), "★열람(claim) 시점에도 마감을 다시 태운다");
  ok(/if \(fin\.html !== updated\.body_html\)/.test(cl), "★바뀐 게 있을 때만 저장한다(불필요한 쓰기 없음)");
  ok(/열람 자체를 막지 않는다/.test(cl), "★마감 재적용이 실패해도 글은 열린다");
  ok(!/심리 연속성 기준/.test(gr), "★LLM 심리 판정이 제거됨(0개로 흐르던 원인)");
  const ph = fs.readFileSync(new URL("../lib/publishHtml.ts", import.meta.url), "utf-8");
  ok(!/\$\{reason\.trim\(\)\}/.test(ph), "★렌더에서 설명 문장이 제거됨");
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/마무리 관련글은 시스템이 붙인다/.test(ap), "★프롬프트가 '네가 쓰지 마라'로 바뀜(두 곳이 다투지 않게)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 발행글 품질(띄어쓰기·문단·이모지·사진·정렬)");

// ★가독성 게이트(2026-08-06 유저 화면: 한 문단 13줄 + 강조 0곳).
//  ★재는 자와 그리는 자가 다른 숫자를 보면 게이트는 통과인데 화면은 벽돌이 된다.
{
  const { longSentences, emphasisShortfall, SENT_MAX_CHARS } = await import("../lib/editorial.ts");
  const real = "<p>국토교통부는 2026년 5월 발표에서 도시형생활주택 인허가 인센티브 확대, 상가·오피스·지식산업센터의 주거용 전환 지원, 주택도시기금 대출 한도 확대(도시형생활주택 건설 시 최대 1억 2,000만 원·3%대 금리, 2027년까지)를 핵심으로 제시했습니다.</p>";
  const ls = longSentences(real);
  ok(ls.length === 1 && ls[0].chars > 100, "★유저 화면의 실물 문장을 잡는다", `${ls[0]?.chars}자`);
  ok(longSentences("<p>짧은 문장입니다. 이것도 짧습니다.</p>").length === 0, "짧은 문장은 통과");
  ok(SENT_MAX_CHARS === 90, "한 문장 상한 90자(18자 × 5줄)");

  // ★한 줄 글자수 — 게이트가 실제 렌더(18자)와 같은 숫자를 봐야 한다
  const ed = fs.readFileSync(new URL("../lib/editorial.ts", import.meta.url), "utf-8");
  ok(/const CHARS_PER_LINE = 18/.test(ed), "★한 줄 18자(종전 23자는 실제보다 28% 적게 셌다)");
  ok(/재는 자와 그리는 자가 다른 숫자를 보면/.test(ed), "왜 맞춰야 하는지가 코드에 적혀 있다");

  // ★강조 하한 — 상한만 있고 하한이 없어서 0개로 나가도 아무도 몰랐다
  const plain = "<p>" + "가".repeat(600) + "</p>";
  const em = emphasisShortfall(plain);
  ok(em !== null && em.bold === 0 && em.mark === 0, "★강조가 0인 글을 잡는다");
  ok(emphasisShortfall("<p>짧은 글</p>") === null, "짧은 글은 강조가 없어도 통과");
  const rich = "<p>" + "가".repeat(600) + "<b>핵심</b></p><p><b>결론</b> <mark>중요</mark></p>";
  ok(emphasisShortfall(rich) === null, "굵은 글씨 2곳 + 형광 1곳이면 통과");
  // 형광펜은 표기가 바뀐다 — 결과(배경색)로 센다(게이트 중앙화 원칙)
  const styled = "<p>" + "가".repeat(600) + "<b>가</b></p><p><b>나</b> <b style=\"background:#ff0\">다</b></p>";
  ok(emphasisShortfall(styled) === null, "★<mark> 대신 배경색을 써도 형광으로 센다");

  const gr2 = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/emphasisShortfall\(a\.body_html\)/.test(gr2), "★생성 경로에 강조 게이트가 물려 있다");
  ok(/longSentences\(a\.body_html\)/.test(gr2), "★긴 문장 게이트도 물려 있다");
}


// ★문단 쪼개기 — 게이트(경고)만으로는 안 잡혔다. 재생성 예산이 없으면 그대로 발행된다.
//  유저가 본 13줄 문단이 그 경로였다. 그래서 마감에서 코드가 무조건 나눈다.
{
  const { splitMultiSentenceParagraphs, longParagraphs } = await import("../lib/editorial.ts");
  const { finalizeArticleBody } = await import("../lib/finalizeBody.ts");
  const many = "<p>국토교통부는 2026년 5월 발표에서 도시형생활주택 인허가 인센티브를 확대한다고 밝혔습니다. 상가와 오피스, 지식산업센터의 주거용 전환도 지원합니다. 주택도시기금 대출 한도는 최대 1억 2,000만 원까지 늘어납니다. 금리는 3%대이며 2027년까지 적용됩니다.</p>";
  const r = splitMultiSentenceParagraphs(many);
  ok(r.split >= 1 && longParagraphs(r.html).length === 0, "★여러 문장 문단은 문장 경계에서 나뉜다", `${r.split}회`);
  ok(!/[.!?]<\/p>\s*<p>[^가-힣<]/.test(r.html), "문장 중간에서 자르지 않는다");

  // ★한 문장짜리는 코드가 못 고친다 — 건드리면 문장이 깨진다. 게이트가 모델에 돌려보내는 몫이다.
  const one = "<p>국토교통부는 2026년 5월 발표에서 도시형생활주택 인허가 인센티브 확대, 상가·오피스·지식산업센터의 주거용 전환 지원, 주택도시기금 대출 한도 확대(최대 1억 2,000만 원)를 핵심으로 제시했습니다.</p>";
  ok(splitMultiSentenceParagraphs(one).split === 0, "★한 문장짜리 문단은 건드리지 않는다");

  const short = "<p>짧은 문단입니다.</p>";
  ok(splitMultiSentenceParagraphs(short).html === short, "짧은 문단은 그대로");

  // 태그가 문장을 가로지르면 쪼갤 때 태그가 깨진다 — 그런 문단은 손대지 않는다
  const crossing = "<p><b>국토교통부는 2026년 5월 발표에서 도시형생활주택 인허가 인센티브를 확대한다고 밝혔습니다. 상가와 오피스의 주거용 전환도</b> 함께 지원합니다. 대출 한도는 최대 1억 2,000만 원입니다.</p>";
  const rc = splitMultiSentenceParagraphs(crossing);
  ok((rc.html.match(/<b>/g) ?? []).length === (rc.html.match(/<\/b>/g) ?? []).length, "★태그 짝이 깨지지 않는다");

  // ★마감 라인에 배선됐는가 — 여기 빠지면 pregen 경로만 조용히 안 나뉜다(경로 둘 사고의 재발)
  const fin3 = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/splitMultiSentenceParagraphs\(tabled\)/.test(fin3), "★마감에 배선됨(generate·pregen 공통)");
  // ★리터럴 인자로 순서를 검사하면 마감에 단계가 하나 낄 때마다 깨진다 — 순서 자체를 본다.
  ok(fin3.indexOf("splitMultiSentenceParagraphs(") < fin3.indexOf("hardTrimToLimit("),
    "★분량 하드컷보다 먼저 나눈다(나중에 하면 잘려나갈 섹션을 헛되이 쪼갠다)");
  const out = finalizeArticleBody({ bodyHtml: many, keyword: "도시형생활주택", isReview: false });
  ok(out.paragraphsSplit >= 1 && longParagraphs(out.html).length === 0, "★마감을 거치면 긴 문단이 남지 않는다");

  // ★상한 두 개가 서로 모순이면 안 된다: 규격을 지킨 90자 한 문장은 영구 결함이 되면 안 된다
  const gr3 = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(!/longParagraphs\(a\.body_html\)/.test(gr3), "★문단 길이는 경고하지 않는다(코드가 보장하는 몫)");
}


// ★경고 빨강(2026-08-06 유저: "폰트 색상도 경고·긴박·긴급·중요한 거·함정 이런 건 레드로").
{
  const { normalizeAlertColor, ALERT_RED, ALERT_MAX } = await import("../lib/editorial.ts");
  const one = (c) => normalizeAlertColor(`<p><span style="color:${c}">x</span></p>`, 9);
  for (const c of ["red", "crimson", "#e74c3c", "#ff0000", "#f00", "rgb(229,52,43)"])
    ok(one(c).kept === 1 && one(c).html.includes(ALERT_RED), `빨강 계열 통일: ${c}`);

  // ★'앞자리로 붉은지 판정'하면 회색 구분선이 빨개진다 — 처음 그렇게 짰다가 잡았다.
  //  아래는 전부 publishHtml이 실제로 쓰는 색이다. 하나라도 오판하면 발행본 색이 망가진다.
  for (const c of ["#d9dde3", "#d5d9df", "#8b95a1", "#4e5968", "#191919", "#0073e9", "#1D75F7", "#33363d", "#e5e8eb"])
    ok(one(c).kept === 0 && one(c).html.includes(c), `★빨강 아님(발행 팔레트 보존): ${c}`);

  ok(/background-color:#fff3a8/.test(normalizeAlertColor('<span style="background-color:#fff3a8">x</span>').html), "★형광펜(배경색)은 건드리지 않는다");

  // ★남발 상한 — 빨강이 여러 곳이면 어느 것도 경고로 안 읽힌다(볼드 남발과 같은 병)
  const many = "<p>" + Array.from({ length: 6 }, (_, i) => `<span style="color:red">${i}</span>`).join(" ") + "</p>";
  const r = normalizeAlertColor(many);
  ok(r.kept === ALERT_MAX && r.demoted === 3, `★상한 ${ALERT_MAX}곳 초과분은 색을 뺀다`, `살림 ${r.kept}/뺌 ${r.demoted}`);
  ok(!/color:red/.test(r.html) && /font-weight:700/.test(r.html), "초과분은 굵기만 남는다");

  const fin4 = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/normalizeAlertColor\(para\.html\)/.test(fin4), "★마감에 배선됨(generate·pregen 공통)");
  const ap4 = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/위험 신호는 빨강으로/.test(ap4) && ap4.includes(ALERT_RED), "★프롬프트의 빨강 값이 코드 상수와 같다");
  ok(/최대 3곳/.test(ap4), "프롬프트에도 상한 명시");
}

process.exit(fail ? 1 : 0);
