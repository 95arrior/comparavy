// 글감 박스 규격 + 거짓 금지 — 실행: npx tsx scripts/check-card-truth.mjs
// ★유저 지시(2026-08-05): "절대 글감 박스 콘텐츠 내용들은 거짓이 있으면 안 됨 절대로."
//  카드에 적히는 모든 것은 측정·수확 실값이어야 한다. 채우려고 지어낸 문장은 하나도 없어야 한다.
// ★규격(유저 목업): 상단 칩 3개(키워드:/출처:/문서:) → 제목 → 근거: → 우측 하단 ⚡지금 뜨는 / 🌱꾸준한 수요
import fs from "node:fs";
const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
const route = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 상단 칩 3개 — 항상, 접두어까지:");
{
  ok(/: \{\(topic as \{ seedKeyword/.test(home), "★'키워드 : ' 접두어");
  ok(/출처 : \{srcLabel\}/.test(home), "★'출처 : ' 접두어");
  ok(/문서 : \{bt\.toLocaleString/.test(home), "★'문서 : ' 접두어");
  // ★빈칸 금지 — 못 쟀으면 못 쟀다고 적는다(0으로 적으면 선점 최적으로 오해한다)
  ok(/문서 : 못 쟀어요/.test(home), "★문서 수를 못 쟀을 때도 칸을 비우지 않는다");
  ok(/0편이라는 뜻이 아닙니다/.test(home), "★'못 쟀음'과 0을 구분한다");
}

console.log("\n② 출처는 지어내지 않는다:");
{
  ok(/const SOURCE_LABEL/.test(home), "★원천 → 이름 표가 있다");
  ok(/dart: "DART 공시"/.test(home) && /community: "커뮤니티\(뽐뿌\)"/.test(home) && /gov: "정책브리핑 보도자료"/.test(home), "★실제 상류 이름을 쓴다");
  ok(/모르면 지어내지 않는다/.test(home), "★모르는 출처를 만들어 붙이지 않는다");
  // ★여러 상류가 섞이는 칸은 '전부에 대해 참인 이름'만 — rising은 구글 트렌드+자동완성이라 "DART"라고 쓰면 거짓
  ok(/rising: "실시간 급상승"/.test(home), "★섞이는 칸은 모두에게 참인 이름으로");
  // 서버 원천 목록과 이름표가 어긋나면 '기타'로 새어 출처가 사라진다
  const slotBlock = /const SLOT_LABEL[^=]*=\s*\{([\s\S]*?)\};/.exec(route)?.[1] ?? "";
  const srcBlock = /const SOURCE_LABEL[^=]*=\s*\{([\s\S]*?)\};/.exec(home)?.[1] ?? "";
  const serverKeys = [...slotBlock.matchAll(/(\w+):\s*"/g)].map((m) => m[1]).filter((k) => !["series", "followup"].includes(k));
  const missing = serverKeys.filter((k) => !new RegExp(`\\b${k}:`).test(srcBlock));
  ok(missing.length === 0, `★서버 원천이 전부 이름을 갖는다. 누락: ${missing.join(", ") || "없음"}`);
}

console.log("\n③ 근거 — 수확 사실 + 활용 계획:");
{
  ok(/근거 : \{evidence\}/.test(home), "★'근거 : ' 접두어");
  ok(/usePlan \? ` → \$\{usePlan\}`/.test(home), "★어떻게 쓸 것인지가 근거 뒤에 붙는다");
  ok(/const usePlan = \(\(\) => \{/.test(home), "활용 계획이 코드로 만들어진다");
  // ★핵심: 활용 계획은 있는 값에서만 나온다
  ok(/할 말이 없으면 안 쓴다/.test(home) && /return null; \/\/ ★할 말이 없으면/.test(home), "★근거가 없으면 문장을 만들지 않는다(빈칸이 거짓보다 낫다)");
  ok(/actionEnd/.test(home) && /마감이라 지금 쓰면 마감 전에 색인돼요/.test(home), "★마감 문구는 실제 actionEnd가 있을 때만");
  // ★확인 못 한 걸 단정하지 않는다(2026-08-05 3차 검토에서 잡은 과장 두 개)
  ok(!/급상승·자동완성에서 함께 잡혔어요/.test(home), "★'함께 잡혔다'는 확인 못 한 단정 — 제거됨");
  ok(/모든 보도자료가 '일정'은 아니다/.test(home), "★일정 없는 보도자료를 '일정'이라 부르지 않는다");
  ok(/가짜 근거는 없는 근거보다 나쁘다/.test(home), "★가짜 근거 금지 원칙이 코드에 남아 있다");
  // 종전 사고 재발 방지 — 배치 공통 뉴스뭉치에서 카드 근거를 추측하지 않는다
  ok(/newsContext는 '배치 공통 뭉치'다/.test(home), "★뉴스 뭉치에서 카드별 근거를 추측하지 않는다");
}

console.log("\n④ 레인 배지 — 우측 하단:");
{
  ok(/ml-auto flex shrink-0 items-center gap-1 rounded-full/.test(home), "★우측 하단 정렬");
  ok(/topic\.tag === "홈판" \? "🏠" : isTrend \? "⚡" : "🌱"/.test(home), "★🏠홈 노출용 / ⚡지금 뜨는 / 🌱꾸준한 수요");
  // ★홈판을 '꾸준한 수요'로 적던 오류 — 홈판은 검색 수요로 가는 글이 아니다
  ok(/홈 노출용/.test(home) && /틀린 배지는 잘못된 기대를 만든다/.test(home), "★홈판이 '꾸준한 수요'로 표시되지 않는다");
  ok(/topic\.tag === "홈판" \? "주제" : "키워드"/.test(home), "★홈판의 앵커를 '키워드'라고 부르지 않는다(검색어가 아니다)");
  ok(/bg-\[#FFECEC\] text-\[#F04452\]/.test(home) && /bg-\[#E7F7EF\] text-\[#0B8C4E\]/.test(home), "목업과 같은 색 계열");
}

console.log("\n⑤ 두 열 머리말 폐기 + 한 판 섞기:");
{
  ok(!/현재 실시간 인기 키워드 글감이에요/.test(home), "★'지금 뜨는' 머리말 제거");
  ok(!/지속적으로 수요가 있는 글감이에요/.test(home), "★'꾸준한 수요' 머리말 제거");
  ok(/그냥 랜덤으로 박스 나오게/.test(home), "★폐기 근거가 코드에 적혀 있다");
  ok(/function shuffleStable/.test(home), "★섞는다");
  // ★유저 규칙(레이아웃 안정성): 리렌더마다 순서가 바뀌면 읽는 중에 자리가 튄다
  ok(/hash32\(a\.t\.keyword\) - hash32\(b\.t\.keyword\)/.test(home), "★동점일 때 해시 정렬 — 같은 목록이면 항상 같은 순서");
  // ★기회 큰 글감이 먼저(2026-08-05): 수요÷공급은 둘 다 실측이라 '예측 금지' 원칙과 충돌하지 않는다
  ok(/function opportunity/.test(home) && /opportunity\(b\.t\) - opportunity\(a\.t\)/.test(home), "★수요÷공급으로 좋은 글감을 앞에 세운다");
  ok(/미측정 — 중간 자리/.test(home), "★못 잰 카드를 맨 뒤로 밀지 않는다(새 원천이 영원히 안 보인다)");
  // ★범위는 섞기 함수 안으로 — 파일 전체를 훑으면 무관한 1회 추첨(교체 글감 뽑기)까지 걸린다
  const shuf = /function shuffleStable[\s\S]*?\n\}/.exec(home)?.[0] ?? "";
  ok(shuf && !/Math\.random/.test(shuf), "★섞기에 Math.random 금지(리렌더마다 순서가 흔들린다)");
  ok(/key=\{`\$\{mode\}:\$\{t\.keyword\}`\}/.test(home), "섞여도 어느 재고에서 왔는지 잃지 않는다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 글감 박스 규격 + 거짓 금지");
process.exit(fail ? 1 : 0);
