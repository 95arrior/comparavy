import { endingReport, hasMonotoneEndings, isFlatTone, REACTION_MIN, ENDING_YO_MAX } from "../lib/editorial.ts";
import { TONE_ENDINGS } from "../lib/articlePrompt.ts";
import fs from "node:fs";

// ★말투 회귀(2026-08-02). 유저 레퍼런스 10장(실제 네이버 블로그)으로 기준을 다시 세웠다.
//  ★내가 처음 잡은 기준이 틀렸다 — '~인데요·~면서요'를 AI 신호로 보고 막았는데,
//   레퍼런스가 그걸 자연스럽게 쓴다("…에코프로비엠 주가인데요.", "공매도 치고 싶게 생겼는데요.").
//  ★진짜 AI 티는 어미가 아니라 '감정 반응이 없는 것'이다.
//   레퍼런스의 사람 냄새는 전부 반응에서 나온다 — "젠장", "후우", "이건 좀 아쉽습니다", "ㅎㅎ".
//   사실만 고르게 나열하면 어미를 아무리 섞어도 기계 글이다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// 레퍼런스에서 그대로 가져온 문장들(에코프로 글)
const 사람글 = "<p>한때 58만원까지 갔던 주가인데요.</p><p>역대 최대 영업이익을 내면서 어마어마하게 올랐죠.</p><p>지금은 끝없이 떨어지고 있네요. 후우</p><p>신저가에 근접해가고 있습니다.</p><p>차트만 보면 공매도 치고 싶게 생겼는데요.</p><p>생각보다 상황이 안 좋습니다.</p><p>이건 좀 아쉽네요. ㅎㅎ</p><p>더 떨어질 게 있나 싶기도 합니다.</p>";
const 기계글 = "<p>신청은 오늘부터 가능합니다.</p><p>조건은 두 가지입니다.</p><p>서류는 세 종류입니다.</p><p>기한은 이달 말입니다.</p><p>홈택스에서 처리됩니다.</p><p>수수료는 없습니다.</p><p>결과는 이달 안에 나옵니다.</p><p>대상은 무주택자입니다.</p>";
const 요폭탄 = "<p>신청은 오늘부터 가능해요.</p><p>조건은 두 가지예요.</p><p>서류는 미리 챙기면 좋아요.</p><p>기한을 넘기면 손해예요.</p><p>홈택스에서 바로 되고요.</p><p>수수료는 없어요.</p><p>결과는 이달 안에 나와요.</p><p>놓치면 내년으로 밀려요.</p><p>지금 확인해 보세요.</p>";

ok(!isFlatTone(사람글), "★레퍼런스 결의 글은 통과", `반응 ${endingReport(사람글).reactions}회`);
ok(isFlatTone(기계글), "★사실만 나열하면 잡힌다(진짜 AI 티)", `반응 ${endingReport(기계글).reactions}회`);
ok(hasMonotoneEndings(요폭탄), "★전부 '요'로 끝나면 단조로움", `요종결 ${Math.round(endingReport(요폭탄).yoRatio * 100)}%`);
ok(!hasMonotoneEndings(사람글), "어미가 섞이면 통과");

// ★'~인데요' 금지는 철회됐다 — 레퍼런스가 실제로 쓴다. 다시 막으면 이 테스트가 실패한다.
ok(!isFlatTone(사람글) && /인데요/.test(사람글), "★'~인데요'가 있어도 반려되지 않는다(금지 철회)");
{
  const src = fs.readFileSync(new URL("../lib/editorial.ts", import.meta.url), "utf-8");
  ok(!/BANNED_ENDINGS/.test(src), "★금지 어미 목록이 제거됨");
  ok(/REACTION_RE/.test(src), "★감정 반응을 재는 지표로 대체됨");
}

ok(REACTION_MIN >= 3 && ENDING_YO_MAX <= 0.8, "임계가 느슨해지지 않았다");
ok(endingReport("<p>짧은 글.</p>").monotone === false, "짧은 글은 판정하지 않는다");

// ★톤 규격에 레퍼런스 결이 박혀 있는가
for (const k of ["friendly", "persuasive", "professional", "informative"]) {
  const t = TONE_ENDINGS[k];
  ok(/사실 뒤에 '반응'을 붙여라/.test(t), `[${k}] ★사실 뒤 반응 의무`);
  ok(/혼잣말·감탄/.test(t), `[${k}] 혼잣말·감탄 허용`);
  ok(/편하게 써라/.test(t), `[${k}] 물결·느낌표·ㅎㅎ 자유(유저 확정)`);
  ok(/눈에 쏙쏙/.test(t), `[${k}] 짧게 끊어 읽기 편하게`);
  ok(/마무리 인사는 해도 된다/.test(t), `[${k}] 담백한 마무리 인사 허용`);
  ok(!/'~인데요'·'~면서요'/.test(t) || /써도 되지만/.test(t), `[${k}] ~인데요 금지가 아님`);
}

// ★생성 경로 배선
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/er\.flat/.test(gr), "★감정 부재가 재생성 지시에 실린다");
  ok(/기계 글로 읽힌다/.test(gr), "지적 문구가 원인을 설명한다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 말투(레퍼런스 기준)");
process.exit(fail ? 1 : 0);
