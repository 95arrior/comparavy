// 본문 즉답·말투 검증 — 실행: npx tsx scripts/check-answer-first.mjs
// ★①퀵백 대응(2026-08-04): 제목을 '답을 숨기고 궁금하게'로 강하게 만든 만큼 본문 첫 화면이 답을 줘야 한다.
//  안 그러면 클릭을 올리는 장치가 그대로 감점 장치가 된다. 프롬프트엔 있었지만 재는 사람이 없었다.
// ★②말투(유저: "말투 허참. 이런 쓰지마요 이상해요") — 요즘 안 쓰는 감탄사 한 번이면 글 전체가 기계 글로 읽힌다.
import fs from "node:fs";
import { answerFirstDefects, lacksAnswerFirst, stiltedInterjections, stripStilted, INTRO_MAX_CHARS } from "../lib/editorial.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 즉답 이행 — 통과해야 하는 글:");
{
  const good = `<blockquote>전기차, 싸다고만 알고 계셨나요?</blockquote><p>결론부터 말하면 급속 충전만 쓰면 월 4만 원이 더 나갑니다.</p><p><b>완속 위주면 유지비 우위는 그대로입니다.</b></p><h2>왜 그런가</h2><p>본문</p>`;
  ok(!lacksAnswerFirst(good), "판결+수치가 도입부에 있으면 통과");
  const figureOnly = `<p>7월부터 지원금이 월 30만 원으로 오릅니다.</p><h2>조건</h2><p>본문</p>`;
  ok(!lacksAnswerFirst(figureOnly), "수치만 있어도 통과(결론이 숫자로 온 글)");
}

console.log("\n② 즉답 이행 — 걸러야 하는 글:");
{
  const meta = `<p>오늘은 전기차 충전비에 대해 알아보겠습니다. 많은 분들이 궁금해하시죠.</p><h2>본론</h2><p>내용</p>`;
  ok(answerFirstDefects(meta).some((d) => d.includes("메타 안내")), "★'~알아보겠습니다'로 시작하면 잡는다(답이 아니라 예고다)");
  const noAnswer = `<blockquote>충전비가 왜 이럴까요?</blockquote><p>요즘 전기차 타는 분들 많으시죠. 저도 그렇습니다. 그래서 오늘 이 주제를 골랐어요.</p><h2>본론</h2><p>내용</p>`;
  ok(answerFirstDefects(noAnswer).some((d) => d.includes("결론")), "★공감만 하고 답이 없으면 잡는다");
  const late = `<p>${"전기차를 타면서 느낀 점이 정말 많았습니다. ".repeat(30)}</p><h2>본론</h2><p>내용</p>`;
  ok(answerFirstDefects(late).some((d) => d.includes("늦다")), `★첫 소제목까지 ${INTRO_MAX_CHARS}자를 넘으면 잡는다`);
}

console.log("\n③ 인용구는 답 신호로 세지 않는다(그 자리는 아픔만 찌르는 자리):");
{
  const quoteOnly = `<blockquote>세금 15.4%가 먼저 빠져나갑니다.</blockquote><p>많은 분들이 이 부분을 지나칩니다. 저도 그랬어요.</p><h2>본론</h2><p>내용</p>`;
  ok(lacksAnswerFirst(quoteOnly), "★인용구에만 숫자가 있고 리드가 비면 미달로 본다");
}

console.log("\n④ 어색한 감탄사:");
{
  const s = `<p>허참, 이게 무슨 일인가요.</p><p>내용입니다. 어이쿠 놀랐습니다.</p>`;
  ok(stiltedInterjections(s).length === 2, "검출: 허참·어이쿠");
  const cleaned = stripStilted(s);
  ok(!/허참|어이쿠/.test(cleaned), "★문장 첫머리 감탄사를 걷어낸다");
  ok(/이게 무슨 일인가요/.test(cleaned) && /놀랐습니다/.test(cleaned), "★문장 자체는 살린다(내용 훼손 금지)");
  ok(stiltedInterjections("<p>허리 통증에 좋은 자세</p>").length === 0, "★'허리' 같은 정상 단어를 오검출하지 않는다");
}

console.log("\n⑤ 배선:");
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/answerFirstDefects\(a\.body_html\)/.test(gr), "★즉답 검사가 specDefects에 들어갔다(재생성이 자동 발동)");
  ok(/stiltedInterjections\(a\.body_html\)/.test(gr), "★감탄사 검사도 같은 자리에 있다");
  const fin = fs.readFileSync(new URL("../lib/finalizeBody.ts", import.meta.url), "utf-8");
  ok(/stripStilted\(src0\)/.test(fin), "★마감에서 감탄사를 실제로 지운다(재생성이 실패해도 독자에겐 안 간다)");
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(/퀵백 감점/.test(ap), "★프롬프트에도 이유가 적혀 있다(방향과 한계선이 같은 말을 한다)");
  ok(!/#지역명 #업종 #지역업종/.test(ap), "★해시태그 규격에서 자영업 시절 잔재가 빠졌다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 즉답 이행·말투");
process.exit(fail ? 1 : 0);
