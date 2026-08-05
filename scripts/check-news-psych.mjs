// 아침 뉴스 → 검색 심리 → 자동완성 확정 — 실행: npx tsx scripts/check-news-psych.mjs
// ★유저 지시(2026-08-05): "오전 9시 10시에 모든 뉴스 크롤링해서 이슈 될 만한, 검색하는 사람의
//  심리를 파악해서 '이건 검색하겠는데?' 라는 거... 뉴스 보고 검색하는 사람이 많으니까."
// ★기존 뉴스 경로가 만든 사고: "부동산 공급"(월 0회·문서 36,988편)이 기사 말투 그대로 키워드가 됐다.
import fs from "node:fs";
const src = fs.readFileSync(new URL("../lib/newsPsych.ts", import.meta.url), "utf-8");
const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
const vc = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf-8"));

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 넓게 쓸어담는가:");
{
  ok(/SWEEP_QUERIES/.test(src), "질의 목록이 있다");
  const n = (/const SWEEP_QUERIES[\s\S]*?\];/.exec(src)?.[0].match(/"/g)?.length ?? 0) / 2;
  ok(n >= 25, `질의 ${n}개 — 경제면만 보면 생활·정책에서 터지는 걸 놓친다`);
  ok(/지원금/.test(src) && /상품권/.test(src) && /전기요금/.test(src), "★6/27 실물(온누리상품권·냉방지원금) 부류가 질의에 있다");
  ok(/minutesAgo > windowMin\) continue/.test(src), "★창 밖은 안 본다(뒷북 차단)");
}

console.log("\n② 검색 심리 — 대부분은 검색창을 안 연다:");
{
  ok(/내 일이 되는 순간/.test(src), "★'내 일이 되는 순간'만 검색한다는 기준");
  ok(/남의 일: 기업 실적·주가 전망/.test(src), "★남의 일은 버린다");
  ok(/이미 끝난 일/.test(src) && /감상과 논평/.test(src), "끝난 일·논평 제외");
  ok(/일반명사 두 개를 붙이지 마라/.test(src) && /부동산 공급/.test(src), "★실제로 나왔던 오답을 프롬프트에 박아둔다");
  ok(/빈 배열이 잘못된 글감보다 낫다/.test(src), "★확신 없으면 안 넣는다");
}

console.log("\n③ 합성 금지 — 최종 키워드는 자동완성이 준다:");
{
  ok(/fetchNaverAutocomplete\(p\.anchor\)/.test(src), "★앵커를 자동완성에 물어본다");
  ok(/if \(!keyword\) continue;/.test(src) && /증명 못 하면 안 내보낸다/.test(src), "★자동완성에 없으면 버린다");
  ok(/상상으로 만든 조합은 한 개도 안 나간다/.test(src), "★합성 금지 원칙이 코드에 적혀 있다");
  // ★실호출에서 잡은 결함: IRP '이전 이벤트' 기사에서 "IRP 계좌 해지"가 나왔다(정반대 의도)
  ok(/intentToks/.test(src) && /score\(b\) - score\(a\)/.test(src), "★기사가 만든 궁금증과 맞는 제안을 고른다(최단이 아니라)");
  ok(/정반대 의도다/.test(src), "★그 실측 결함이 코드에 기록돼 있다");
  ok(/란\|이란\|뜻\|무엇\|의미/.test(src), "★정의형 제외(AI 요약으로 끝나 클릭이 안 남는다)");
}

console.log("\n④ 깨져도 안 죽는가:");
{
  ok(/JSON 깨짐 — 항목 단위로/.test(src), "★기사 제목의 따옴표로 JSON이 깨져도 살릴 건 건진다");
  ok(/큰따옴표를 쓰지 마라/.test(src), "모델에게도 미리 일러둔다");
}

console.log("\n⑤ 브리프:");
{
  ok(/기사 요약을 반복하면 바로 나간다. 기사는 이미 읽고 왔다/.test(src), "★기사 재탕 금지(독자는 기사를 보고 왔다)");
  ok(/지어내지 마라/.test(src), "없는 금액·기간 지어내기 금지");
  ok(/투자 판단을 부추기는 서술 금지/.test(src), "투자권유 선 유지");
}

console.log("\n⑥ 배선:");
{
  ok(/harvestNewsPsych\(/.test(tt), "★수확 파이프가 부른다");
  ok(/source: "newspsych"/.test(tt) && /\| "newspsych"/.test(tt), "★자기 칸을 갖는다");
  ok(/\[news-psych\] 수집 실패/.test(tt), "★원천이 죽으면 로그에 남는다");
  ok(/newspsych: "아침뉴스"/.test(rt), "서버 칸 이름");
  ok(/"아침뉴스"/.test(home) && /newspsych: "아침 뉴스"/.test(home), "★화면 칸 + 출처 이름");
  ok(/srcKey === "newspsych"/.test(home), "근거 문구가 있다");
  // ★유저가 지정한 시간: 오전 9시·10시. */4는 09 KST를 포함하고, 10 KST를 따로 더한다.
  const sch = vc.crons.filter((c) => c.path === "/api/cron/trend-refresh").map((c) => c.schedule);
  ok(sch.includes("0 */4 * * *"), "4시간 주기(09 KST 포함)");
  ok(sch.includes("0 1 * * *"), "★10시 KST 추가 수확(유저 지정 시간대)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 아침 뉴스 검색 심리");
process.exit(fail ? 1 : 0);
