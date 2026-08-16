import {
  keywordOccurrences, lacksKeywordFloor, keywordOverstuffed, KEYWORD_FLOOR,
  headingMismatches, hasHeadingMismatch,
} from "../lib/editorial.ts";
import fs from "node:fs";

// ★노출 규격 회귀(2026-08-02 유저 확정) — ①메인 키워드 본문 5회 이상 ②소제목-본문 일치.
//  배경: 그동안 키워드는 '상한'만 있었다(억지 반복 금지). 하한이 없어 몇 번 나오는지 아무도 몰랐다.
//  이 테스트가 지키는 것: 하한과 상한이 동시에 살아 있는가, 소제목 정합이 오탐 없이 진짜 어긋남만 잡는가.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 키워드 카운트 ─────────────────────────────────────────────────────
{
  const kw = "연말정산 환급금";
  const 충분 = `<p>연말정산 환급금은 언제 들어올까요.</p><h2>연말정산 환급금 지급일</h2>
    <p>연말정산환급금은 보통 2월 급여에 포함됩니다.</p><p>연말정산 환급금 조회는 홈택스에서 됩니다.</p>
    <p>올해 연말정산 환급금 평균은 낮아졌습니다.</p>`;
  ok(keywordOccurrences(충분, kw) === 5, `띄어쓰기 차이를 같은 것으로 센다 (실제 ${keywordOccurrences(충분, kw)}회)`);
  ok(!lacksKeywordFloor(충분, kw), "5회면 하한 통과");

  const 부족 = `<p>연말정산 환급금은 언제 들어올까요.</p><p>이것은 보통 2월에 나옵니다.</p><p>조회는 홈택스에서 하면 됩니다.</p>`;
  ok(lacksKeywordFloor(부족, kw), "★2회 이하면 하한 미달 검출");
  ok(keywordOccurrences(부족, kw) === 1, "지시어로 뭉갠 본문은 1회로 센다");

  // ★상한도 살아 있어야 한다 — 하한을 넣으면서 도배를 열어주면 저품질로 간다
  const 도배 = `<p>${"연말정산 환급금 ".repeat(20)}</p>`;
  ok(keywordOverstuffed(도배, kw), "★20회 도배는 상한 초과로 검출");
  ok(!keywordOverstuffed(충분, kw), "정상 밀도는 상한에 안 걸린다");

  // 짧은 키워드·빈 키워드는 판정 대상 아님(오탐 방지)
  ok(!lacksKeywordFloor(부족, ""), "빈 키워드는 판정하지 않는다");
  ok(!lacksKeywordFloor(부족, "돈"), "1글자 키워드는 판정하지 않는다");
}

// ── ② 소제목-본문 정합 ──────────────────────────────────────────────────
{
  const 일치 = `<p>도입</p><h2>근로장려금 신청 방법</h2><p>근로장려금 신청은 홈택스에서 합니다.</p>
    <h2>지급일은 언제인가요</h2><p>지급일은 9월 말입니다.</p>`;
  ok(!hasHeadingMismatch(일치), "소제목 핵심어가 본문에 있으면 통과");

  const 어긋남 = `<p>도입</p><h2>근로장려금 신청 방법</h2><p>올해 물가가 많이 올랐습니다. 장바구니 부담이 큽니다.</p>`;
  const mm = headingMismatches(어긋남);
  ok(mm.length === 1 && mm[0].includes("근로장려금"), "★소제목과 딴 얘기인 섹션을 검출", `→ ${mm.join("|")}`);

  // 스켈레톤 고정 소제목은 판정 제외(FAQ·3줄 요약은 내용 소제목이 아니다)
  const 스켈레톤 = `<h2>자주 묻는 질문</h2><p>Q. 언제 나오나요</p><h2>오늘의 3줄 요약</h2><ul><li>짧게</li></ul>`;
  ok(!hasHeadingMismatch(스켈레톤), "스켈레톤 소제목(FAQ·3줄 요약)은 정합 판정 제외");

  // 핵심어가 없는 소제목은 판정 대상 아님(오탐 방지)
  ok(!hasHeadingMismatch(`<h2>어떻게 해야 하나요</h2><p>상황마다 다릅니다.</p>`), "핵심어 없는 소제목은 통과(오탐 방지)");
  ok(!hasHeadingMismatch(`<p>h2가 없는 글</p>`), "소제목 없는 글은 판정 대상 아님");
}

// ── ③ 배선 확인 ────────────────────────────────────────────────────────
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/메인 키워드 원형 5회 이상/.test(ap), "★키워드 하한이 네이버 프롬프트에 명시됨");
  ok(/소제목-본문 일치/.test(ap), "★소제목 정합이 프롬프트에 명시됨");
  // 하한을 넣으면서 상한 문구가 사라지면 도배로 간다 — 둘 다 남아 있어야 한다
  ok(/도배는 여전히 금지|과최적화/.test(ap), "★도배 금지(상한) 문구가 살아 있음");

  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/lacksKeywordFloor/.test(gr) && /headingMismatches/.test(gr), "★생성 경로에 게이트가 배선됨");
  ok(/keywordFloorApplies\s*=\s*channel === "naver"/.test(gr), "★키워드 하한은 네이버 전용(WP는 구글 규격이라 반복 금지)");
  ok(/specWarnings\(article\)/.test(gr), "★앞선 가드의 재생성에도 규격 경고가 함께 실린다(예산 선착순 방지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 노출 규격(키워드 하한·소제목 정합)");
process.exit(fail ? 1 : 0);
