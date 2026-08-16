// 답안지 파서 검증 — 실행: npx tsx scripts/check-answer-sheet.mjs
// ★출발점(2026-08-10): 어드바이저 붙여넣기는 UI 문구·순위 마커·뉴스 헤드라인이 섞여 온다.
//  파서가 검색어만 남기고, 유입순(수요 순)을 보존해야 아침 브리핑 판정이 성립한다.
import { parseAnswerSheet, daysSeenIn } from "../lib/answerSheet.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

// 실제 어드바이저 화면(2026-08-08 실물)을 본뜬 붙여넣기
const PASTE = `
2026. 08. 08.
검색 유입 트렌드
메인 유입 트렌드
주제별 비교
주제별 인기유입검색어
성별,연령별 인기유입검색어
블로그 게시글로 유입이 많이 된 검색어를 제공합니다. '클립' 콘텐츠로 유입된 경우는 포함하지 않습니다.
유입순 보기
설정순 보기
비즈니스·경제
케이뱅크 황금캡슐
-
로또
new
민생지원금 ▲5
ISA 계좌
▲1
서장훈, 서초 건물 450억 매물로
new
케이뱅크 황금캡슐
18k 금시세 ▲3
`;

console.log("① 파서:");
{
  const { keywords, droppedNewsy } = parseAnswerSheet(PASTE);
  ok(keywords[0] === "케이뱅크 황금캡슐", `첫 검색어=케이뱅크 황금캡슐 (실제: ${keywords[0]})`);
  ok(keywords.includes("민생지원금"), "꼬리 마커(▲5)가 떨어진다");
  ok(keywords.includes("18k 금시세"), "같은 줄 마커(▲3)도 떨어진다");
  ok(keywords.includes("로또") && keywords.includes("ISA 계좌"), "마커가 다음 줄로 온 검색어도 산다");
  ok(!keywords.some((k) => /유입|보기|제공|비즈니스/.test(k)), "UI 문구는 전부 걸러진다");
  ok(keywords.filter((k) => k === "케이뱅크 황금캡슐").length === 1, "중복은 한 번만");
  ok(droppedNewsy.length === 1 && droppedNewsy[0].startsWith("서장훈"), "쉼표 헤드라인은 뉴스형으로 뺀다");
  ok(!keywords.includes("new") && !keywords.includes("-"), "마커 단독 줄은 검색어가 아니다");
}

console.log("② 연속성:");
{
  const history = [
    { date: "2026-08-07", keywords: ["케이뱅크 황금캡슐", "ISA 계좌"] },
    { date: "2026-08-08", keywords: ["케이뱅크  황금캡슐"] }, // 공백 변형도 같은 키워드
  ];
  ok(daysSeenIn("케이뱅크 황금캡슐", history) === 2, "이틀 등장 = 2");
  ok(daysSeenIn("로또", history) === 0, "처음 보면 0(호출측이 +1 해서 '신규')");
}

if (fail) { console.log(`\n${fail}건 실패`); process.exit(1); }
console.log("\n전부 통과");
