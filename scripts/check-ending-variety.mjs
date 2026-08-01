import { endingReport, hasMonotoneEndings, ENDING_YO_MAX, ENDING_TOP_MAX } from "../lib/editorial.ts";
import { TONE_ENDINGS } from "../lib/articlePrompt.ts";
import fs from "node:fs";

// ★어미 단조로움 회귀(2026-08-02 유저: "요요요 면서요 거든요 말투가 왜이럼, 더 AI같음").
//  종전엔 톤 규격이 '해요체를 쓰라'고만 했고 변주 지시는 프롬프트 깊숙한 variantInstruction에만 있었다.
//  그래서 모든 문장이 '~요'로 끝나 읽는 순간 기계 글이 됐다.
//  ★유저 불만의 정체는 '요 종결 비율'이다 — 세부 어미가 달라도 전부 요로 끝나면 같은 소리로 읽힌다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const 요폭탄 = "<p>신청은 오늘부터 가능해요.</p><p>조건은 두 가지예요.</p><p>서류는 미리 챙기면 좋아요.</p><p>기한을 넘기면 손해예요.</p><p>홈택스에서 바로 되고요.</p><p>수수료는 없어요.</p><p>결과는 이달 안에 나와요.</p><p>놓치면 내년으로 밀려요.</p><p>지금 확인해 보세요.</p>";
const 섞임 = "<p>신청은 오늘부터 가능합니다.</p><p>조건은 두 가지예요.</p><p>여기까지가 기본.</p><p>서류는 미리 챙기는 편이 낫죠.</p><p>기한을 넘기면 손해입니다.</p><p>결과는 이달 안에 나오네요.</p><p>문제는 시점.</p><p>지금 확인해 보세요.</p>";
const 금지 = "<p>이건 이런데요.</p><p>저건 저러면서요.</p><p>그래서 이렇게 됩니다.</p><p>확인이 필요합니다.</p><p>서류를 챙기세요.</p><p>기한은 이달까지죠.</p><p>수수료는 없습니다.</p><p>결과는 곧 나옵니다.</p>";

ok(hasMonotoneEndings(요폭탄), "★전부 '요'로 끝나면 단조로움으로 잡힌다", `요종결 ${Math.round(endingReport(요폭탄).yoRatio * 100)}%`);
ok(!hasMonotoneEndings(섞임), "★어미를 섞으면 통과", `요종결 ${Math.round(endingReport(섞임).yoRatio * 100)}%`);
ok(hasMonotoneEndings(금지), "★금지 연결어미가 섞이면 잡힌다", endingReport(금지).banned.join(","));
ok(endingReport(금지).banned.includes("면서요"), "'면서요'를 검출");
ok(endingReport("<p>짧은 글.</p>").monotone === false, "짧은 글은 판정하지 않는다(표본 부족)");
ok(ENDING_YO_MAX <= 0.8 && ENDING_TOP_MAX <= 0.6, "임계가 느슨해지지 않았다");

// ★톤 규격 자체에 변주가 박혀 있는가 — variantInstruction에만 있으면 또 새어나간다
for (const k of ["friendly", "persuasive", "professional", "informative"]) {
  const t = TONE_ENDINGS[k];
  ok(/3문장 연속으로 쓰지 마라/.test(t), `[${k}] 3연속 금지가 어미 규격에 있다`);
  ok(/명사·체언으로 끊어라/.test(t), `[${k}] 명사 종결 지시`);
  ok(/'~인데요'·'~면서요'/.test(t), `[${k}] 금지 어미 명시`);
}

// ★생성 경로 배선
{
  const gr = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  ok(/endingReport/.test(gr), "★생성 경로에 어미 게이트가 배선됨");
  ok(/문장 종결이 단조롭다/.test(gr), "단조로우면 재생성 지시에 실린다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 어미 다양성");
process.exit(fail ? 1 : 0);
