import { spacingDefects, hasSpacingDefect, longParagraphs, emojiCount, photoSlotShortfall, skeletonReport, hasFabricatedExperience, sectionBudgetReport, tailSummaryBullets, ensureHashtags, EMOJI_MIN, PARA_MAX_LINES } from "../lib/editorial.ts";
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
  for (const [fn, label] of [["spacingDefects", "띄어쓰기"], ["longParagraphs", "문단 길이"], ["emojiCount", "이모지 하한"], ["photoSlotShortfall", "사진 슬롯"], ["skeletonReport", "스켈레톤"]])
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
  ok(/1~2개는 고르는 것을 기본/.test(gr), "★내부링크 선별이 '1~2개 기본'으로 바뀜");
  ok(/ensureHashtags\(urlClean\.html/.test(gr), "★해시태그 보장이 생성 경로에 배선됨");

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
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 발행글 품질(띄어쓰기·문단·이모지·사진·정렬)");
process.exit(fail ? 1 : 0);
