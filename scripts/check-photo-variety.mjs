import { stockPropSlots, photoSceneShortfall, photoSlotShortfall } from "../lib/editorial.ts";
import fs from "node:fs";

// ★본문 사진 다양성 회귀(2026-08-02).
//  유저: "본문 사진으로도 재미 좀 주자, 체류시간도 늘리게. 매번 계산기와 급여명세서
//   클로즈업 이런거만 넣지마. 그냥 이런 유형은 빼자."
//  ★원인이 둘이었다:
//   ① 프롬프트에 '원천징수영수증과 계산기'를 예시로 박아둬서 모델이 베꼈다(썸네일과 같은 사고).
//   ② 슬롯 2번 역할이 '실제 물건·서류·화면'이라 서류 클로즈업으로 유도했다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 진부한 소품이 걸리는가 ───────────────────────────────────────────
for (const d of ["계산기와 급여명세서", "원천징수영수증 계산기 안경", "서류 뭉치와 도장", "건강보험 고지서 클로즈업", "통장 두 권"])
  ok(stockPropSlots(`<p>[사진: ${d}]</p>`).length === 1, "진부한 소품 검거", d);

// ── ② 멀쩡한 소재는 통과하는가(오탐 0) ─────────────────────────────────
for (const d of ["창문 열린 방의 에어컨 실외기", "아파트 단지를 올려다보는 시선", "정리된 책상 위 사원증 줄",
                 "은행 창구 앞 빈 대기 의자", "늦은 밤 식탁 위 노트북", "출근길 지하철 손잡이"])
  ok(stockPropSlots(`<p>[사진: ${d}]</p>`).length === 0, "멀쩡한 소재는 통과", d);

// ── ③ 전부 물건 클로즈업이면 걸리는가 ──────────────────────────────────
{
  const 물건만 = "<p>[사진: 파란 저금통]</p><p>[사진: 노란 우산]</p><p>[사진: 화분 하나]</p>";
  ok(photoSceneShortfall(물건만) !== null, "★물건 나열만 있으면 결함(스크롤이 안 멈춘다)");

  const 장면섞임 = "<p>[사진: 파란 저금통]</p><p>[사진: 창구 앞에서 기다리는 뒷모습]</p><p>[사진: 화분 하나]</p>";
  ok(photoSceneShortfall(장면섞임) === null, "★한 장이라도 장면이면 통과");

  ok(photoSceneShortfall("<p>[사진: 저금통]</p>") === null, "사진 1장짜리는 판정하지 않는다");
}

// ── ④ 프롬프트에서 베낄 예시가 사라졌는가 ──────────────────────────────
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(!/원천징수영수증과 계산기|원천징수영수증 계산기/.test(ap), "★모델이 베끼던 예시가 제거됨");
  ok(/뻔한 소품 금지/.test(ap), "진부 소품 금지 지시 존재");
  ok(/사물 클로즈업을 반복하지 마라/.test(ap), "★슬롯 역할이 '서류·화면'에서 '장면'으로 바뀜");
  ok(!/②2번\(자료\) = 그 섹션이 다루는 '실제 물건·서류·화면'/.test(ap), "★서류로 유도하던 옛 역할 제거");
  ok(/스크롤을 멈추는 건 '물건'이 아니라 '장면'/.test(ap), "체류시간 근거 명시");
}

// ── ⑤ 재생성이 실제로 발동하는가 ───────────────────────────────────────
//  ★게이트를 만들어놓고 발동 조건에 안 넣어 조용히 죽어 있던 사고가 오늘 있었다. 같은 실수 방지.
{
  const rt = fs.readFileSync(new URL("../app/api/generate/route.ts", import.meta.url), "utf-8");
  const spec = rt.slice(rt.indexOf("const specDefects"), rt.indexOf("const deficits"));
  ok(/stockPropSlots/.test(spec), "★진부 소품이 재생성 발동 목록 안에 있다");
  ok(/photoSceneShortfall/.test(spec), "★장면 부족이 재생성 발동 목록 안에 있다");
  ok(/const deficits = [\s\S]{0,120}specDefects/.test(rt), "발동 조건이 결함 목록 길이로 통일되어 있다");
}

// ── ⑥ 사진 개수 하한은 그대로인가(회귀) ────────────────────────────────
ok(photoSlotShortfall("<h2>a</h2><h2>b</h2><h2>c</h2><h2>d</h2><p>[사진: x]</p>")?.want === 4, "섹션 4개면 사진 4장 요구");

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 본문 사진 다양성");
process.exit(fail ? 1 : 0);
