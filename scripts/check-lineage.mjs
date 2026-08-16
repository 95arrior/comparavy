// 혈통 검증 — 실행: npx tsx scripts/check-lineage.mjs
// ★유저 화면에서 두 번 잡힌 사고다:
//  ①씨앗 '2026년 65세 이상 꼭 받아야 할…' → 카드 '2026 정부지원금 놓치는 청년의 현실'
//  ②씨앗 '2026년 신규 1인 소상공인 육아지원금' → 카드 '충북출산육아지원금 기한'
// ★왜 치명적인가: 카드에는 씨앗의 뉴스 근거가 함께 붙는다. 근거가 다른 얘기를 하는데 그 근거로
//  본문까지 쓰면 글 전체가 틀린 출처 위에 선다.
import fs from "node:fs";
import { lineageConflict, lineageOverlap, lineageAttached } from "../lib/editorial.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 유저가 잡은 실물 두 건:");
{
  const c1 = lineageConflict("2026년 65세 이상 꼭 받아야 할 정부지원금", "2026 정부지원금 놓치는 청년의 현실");
  ok(c1 !== null, `★65세 씨앗 → 청년 카드는 버린다 (${c1})`);
  const c2 = lineageConflict("2026년 신규 1인 소상공인 육아지원금", "충북출산육아지원금 기한");
  ok(c2 !== null, `★근거에 없는 지역이 카드에 생기면 버린다 (${c2})`);
}

console.log("\n② 종전 방어(토큰 교집합)가 왜 못 잡았나 — 범용어를 빼면 겹침이 사라진다:");
{
  // '2026·정부지원금'만 겹쳤다 — 둘 다 범용어라 실질 겹침은 0이어야 한다
  ok(lineageOverlap("2026년 65세 이상 꼭 받아야 할 정부지원금", "2026 정부지원금 놓치는 청년의 현실") < 2,
    "★범용어(2026·정부지원금)를 빼면 실질 겹침이 기준 미달");
  ok(!lineageAttached("2026년 65세 이상 꼭 받아야 할 정부지원금", "2026 정부지원금 놓치는 청년의 현실"), "★범용어만 겹친 카드는 자식으로 인정하지 않는다");
  // ★혈통을 지키려다 결품을 만들면 그것도 사고다 — 4자 이상 주제 명사 1개면 인정한다
  ok(lineageAttached("전세보증금 반환보증 개편", "전세보증금 반환대출 한도"), "★'전세보증금'처럼 긴 주제 명사 1개면 같은 혈통으로 본다");
  ok(lineageAttached("연금저축 세액공제 한도", "연금저축 중도인출 불이익"), "★같은 주제의 다른 각도도 통과");
}

console.log("\n③ 정상 카드는 통과해야 한다(과교정 방어):");
{
  ok(lineageConflict("ISA 개편 절세혜택 어떻게 달라졌나", "삼성증권 ISA 계좌 개설 한도") === null, "같은 주제면 통과");
  ok(lineageConflict("서울시 청년 월세 지원 확대", "서울 청년 월세 지원 신청 조건") === null, "★씨앗에 있는 지역은 카드에 써도 된다");
  ok(lineageConflict("소상공인 정책자금 신청", "소상공인 대환대출 조건") === null, "같은 대상이면 통과");
}

console.log("\n④ 배타 축 — 서로 반대편이면 같은 얘기일 수 없다:");
{
  ok(lineageConflict("무주택 세입자 전세대출", "다주택자 보유세 계산") !== null, "무주택 ↔ 다주택");
  ok(lineageConflict("직장인 연말정산 환급", "소상공인 창업 지원금") !== null, "직장인 ↔ 소상공인");
  ok(lineageConflict("출산 육아휴직 급여", "실업급여 수급 조건") !== null, "육아 ↔ 실업");
}

console.log("\n⑤ 배선:");
{
  const amp = fs.readFileSync(new URL("../lib/amplifyTopics.ts", import.meta.url), "utf-8");
  ok(/lineageConflict\(/.test(amp) && /drop\.orphan\+\+/.test(amp), "★증식 경로에서 상충 카드를 버린다");
  ok(/!lineageAttached\(/.test(amp), "★재귀속 기준이 lineageAttached 한 곳에 있다");
  ok(/\[lineage\]/.test(amp), "★버린 이유를 로그로 남긴다(씨앗·카드 함께)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 혈통 검증");
process.exit(fail ? 1 : 0);
