// 합성 금지 검증 — 실행: npx tsx scripts/check-no-synthesis.mjs
// ★출발점(2026-08-05 유저): 8월 4일 네이버 경제 인기유입검색어 20개(ISA·세제개편안·민생지원금·
//  근로장려금 지급일·케이뱅크 황금캡슐…)가 우리 글감에 단 1개도 없었다.
// ★원인은 원천이 아니라 합성이었다 — 뉴스는 들어왔는데 LLM이 원어를 조합어로 바꿔 검색어가 아니게 됐다.
//   실제 뉴스: "2026 세제개편안 발표… ISA 비과세 한도 상향"
//   우리 합성: "ISA 비과세 한도 조건"   ← 아무도 안 치는 말
//   실제 검색: "세제개편안" / "isa 개편" ← 뉴스에 나온 말 그대로
import fs from "node:fs";
import { isExtractedFromSource } from "../lib/trendTopics.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

const SRC = [
  "2026 세제개편안 발표… ISA 비과세 한도 상향 검토",
  "케이뱅크, 황금캡슐 이벤트 진행",
  "국세청, 근로장려금 지급일 앞당긴다",
  "정부 민생지원금 2차 지급 결정",
].join(" ");

console.log("① 원문에 있는 말은 통과(이게 사람들이 실제로 치는 말이다):");
{
  for (const kw of ["세제개편안", "ISA", "isa 비과세", "황금캡슐", "케이뱅크 황금캡슐", "근로장려금 지급일", "민생지원금"]) {
    ok(isExtractedFromSource(kw, SRC), `통과: ${kw}`);
  }
}

console.log("\n② 만든 말은 폐기(원문에 없는 단어가 섞인 것):");
{
  for (const kw of ["ISA 비과세 한도 조건", "세제개편 절세 전략", "민생지원금 수령 노하우", "근로장려금 환급 방법"]) {
    ok(!isExtractedFromSource(kw, SRC), `폐기: ${kw}`);
  }
}

console.log("\n③ 표기 흔들림은 살린다(과교정 방어):");
{
  ok(isExtractedFromSource("케이뱅크황금캡슐", SRC), "★띄어쓰기 차이는 같은 말로 본다");
  ok(isExtractedFromSource("세제개편안은", SRC), "★조사가 붙어도 같은 말로 본다");
  ok(isExtractedFromSource("ISA", SRC), "★대소문자 무시");
  ok(isExtractedFromSource("아무말", ""), "★대조할 원문이 없으면 판정하지 않는다(수확을 막지 않는다)");
}

console.log("\n④ 배선:");
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/keyword는 만들지 마라/.test(tt), "★프롬프트가 '만들지 말고 뽑아라'로 바뀌었다");
  ok(/원문에 없는 단어를 keyword에 넣으면 그 글감은 폐기된다/.test(tt), "★코드가 검증한다는 사실을 모델에게 알린다");
  ok(/isExtractedFromSource\(kw, sourceCorpus\)/.test(tt), "★합성 결과가 실제로 검증된다");
  ok(/reason: "synthesized"/.test(tt), "★폐기 사유가 남는다(몇 개가 만들어진 말이었는지 보인다)");
  ok(/const sourceCorpus = heads\.map/.test(tt), "★대조 원문은 합성에 넣어 준 헤드라인 전체다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 합성 금지");
process.exit(fail ? 1 : 0);
