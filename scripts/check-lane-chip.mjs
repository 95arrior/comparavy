import fs from "node:fs";

// ★글감 칩 회귀(2026-08-01 유저 요청: "혹여나 이상한 거 안 나오게 다시 한번 체크").
//  실측 사고: 칩이 '안정 수요 / 실시간 급상승' 2종뿐이라 홈판 카드와 헤드 배팅 카드가
//  전부 '안정 수요'로 표시됐다. 사장님이 카드만 보고 종류를 알 수 없는 상태였다.
//  칩 판정은 서버가 붙인 tag/demandBadge에 의존하므로, 그 두 값이 바뀌면 칩이 조용히 틀어진다.
//  → 서버가 실제로 넣는 문자열과 화면 판정 조건이 같은지 파일에서 직접 대조한다.
const ui = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
const srv = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");

let fail = 0;
const ok = (cond, label, extra = "") => { if (!cond) fail++; console.log(cond ? "OK " : "FAIL", "|", label, extra); };

// ── 네 레인이 전부 있고, 유저 확정 문구 그대로인가 ──────────────────────────
const EXPECT = [
  ["homefeed", "홈판용", "네이버 홈 화면에 뜨는 걸 노리는 글"],
  ["golden", "쉬운 검색 키워드", "지금 체급으로 1등 할 수 있는 것"],
  ["trend", "유행 키워드", "지금 뜨는 것"],
  ["head", "어려운 키워드", "지금은 안 되지만 나중에 일할 것"],
];
for (const [key, label, mean] of EXPECT) {
  ok(new RegExp(`${key}:\\s*\\{[^}]*label:\\s*"${label}"`).test(ui), `${key} 칩 이름 = "${label}"`);
  ok(ui.includes(mean), `${key} 뜻풀이 = "${mean}"`);
}

// ── 옛 2종 칩이 남아 있지 않은가(남아 있으면 어딘가에서 아직 쓰고 있다) ──────
ok(!ui.includes("실시간 급상승</span>"), "옛 칩 '실시간 급상승' 제거됨");
ok(!ui.includes("안정 수요</span>"), "★옛 칩 '안정 수요' 제거됨(홈판·헤드가 이걸로 나오던 버그)");

// ── 화면 판정 조건 == 서버가 실제로 넣는 값 ────────────────────────────────
// 홈판: 서버가 tag: "홈판" 을 넣는다
ok(/tag:\s*"홈판"/.test(srv), "서버가 홈판 카드에 tag='홈판'을 넣음");
ok(/topic\.tag === "홈판"/.test(ui), "화면이 tag='홈판'으로 홈판을 판정");

// 헤드: 서버 demandBadge가 '헤드 배팅'으로 시작한다
ok(/demandBadge:\s*"헤드 배팅/.test(srv), "서버가 헤드 카드 demandBadge에 '헤드 배팅'을 넣음");
ok(/includes\("헤드 배팅"\)/.test(ui), "화면이 '헤드 배팅' 문구로 헤드를 판정");

// 홈판 카드의 demandBadge가 '헤드 배팅'을 포함하면 안 된다(두 판정이 충돌한다)
{
  const homeBadge = srv.match(/tag:\s*"홈판"[\s\S]{0,400}?demandBadge:\s*"([^"]+)"/)?.[1] ?? "";
  ok(homeBadge.length > 0, "홈판 카드 demandBadge를 찾음", `→ ${homeBadge.slice(0, 24)}…`);
  ok(!homeBadge.includes("헤드 배팅"), "★홈판 배지가 헤드 판정과 충돌하지 않음");
}

// 트렌드: 서버가 실제로 내보내는 트렌드 계열 tag를 화면이 전부 트렌드로 본다
//  ('issue'는 서버가 더 이상 만들지 않는 옛 tag — 화면에 남아 있어도 무해하므로 요구하지 않는다)
const serverTags = [...new Set([...srv.matchAll(/tag:\s*"([^"]+)"/g)].map((m) => m[1]))];
ok(serverTags.includes("trend") && serverTags.includes("followup"), "서버 트렌드 tag(trend·followup) 확인", `→ ${serverTags.join(", ")}`);
for (const t of ["trend", "followup"]) {
  ok(ui.includes(`topic.tag === "${t}"`), `화면이 '${t}'를 트렌드로 판정`);
}

// ★근거 없는 주장 방지: '쉬운 검색 키워드'는 검색량이 있을 때만.
//  서버는 series·steady 같은 tag도 내보낸다. 그런 카드가 기본값으로 golden이 되면
//  "지금 체급으로 1등 할 수 있는 것"이라는 거짓 주장이 화면에 뜬다.
{
  const fn = ui.match(/function laneOf\([\s\S]*?\n}/)?.[0] ?? "";
  ok(/vol[^\n]*>\s*0\s*\?\s*"golden"/.test(fn), "★검색량 0이면 '쉬운 검색 키워드'를 붙이지 않음");
  ok(/"other"/.test(fn), "그 외 카드는 중립 칩으로 떨어짐");
  ok(/other:\s*\{[^}]*label:\s*"글감"/.test(ui), "중립 칩 이름 = '글감'");
  ok(/other:\s*\{[^}]*mean:\s*""/.test(ui), "중립 칩은 뜻풀이를 주장하지 않음");
}

// ── 판정 우선순위: 홈판이 트렌드보다 먼저 걸려야 한다 ──────────────────────
// (홈판 카드는 ssak:true 등 트렌드 계열 필드를 함께 갖고 있어서 순서가 뒤집히면 '유행 키워드'로 표시된다)
{
  const fn = ui.match(/function laneOf\([\s\S]*?\n}/)?.[0] ?? "";
  const iHome = fn.indexOf('"홈판"');
  const iTrend = fn.indexOf("isTrend)");
  ok(iHome >= 0 && iTrend >= 0 && iHome < iTrend, "★홈판 판정이 트렌드 판정보다 먼저");
  const iHead = fn.indexOf("헤드 배팅");
  ok(iHead >= 0 && iHead < iTrend, "헤드 판정도 트렌드보다 먼저");
}

// ── 뜻풀이는 열마다 한 번만(카드마다 반복하면 지저분하다) ──────────────────
ok(/LEGEND_LANES\s*=\s*\{\s*short:\s*\["homefeed", "trend"\]/.test(ui), "지금뜨는 열 = 홈판용·유행 키워드 안내");
ok(/long:\s*\["golden", "head"\]/.test(ui), "꾸준한수요 열 = 쉬운·어려운 키워드 안내");

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 글감 칩");
process.exit(fail ? 1 : 0);
