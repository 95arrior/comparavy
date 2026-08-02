import fs from "node:fs";

// ★2026-08-02 실측 로그가 원점:
//   [lane-quota:short] 홈판 미달 0/4 — 하류 탈락(이미쓴 4·게이트 0·중복 0)
//   [lane-quota:short] ★열 결품 0/5 — 홈판 0 + 트렌드 재고 0
//  유저 질문: "지금 홈판 0으로 뜨는건 내가 오늘 발행해서 그른가?" → 맞다. 그리고 내가 증폭시켰다.
//
//  ★사고의 구조: 거르는 자리와 캐시하는 자리가 어긋났다.
//   생성 4장 → 캐시 저장 → 호출측이 4장 전부 '이미 쓴'으로 탈락 → 홈판 0장
//   → 다시 뽑아도 같은 캐시가 나와 또 0장 → 내일까지 복구 불가.
//   캐시는 성공을 아끼는 장치인데, 필터가 캐시 뒤에 있으면 '실패를 굳히는 장치'가 된다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
const rt = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");

// ── ① 유사 판정이 캐시보다 앞에 있는가 ─────────────────────────────────
{
  const dupAt = hb.indexOf("opts?.isDup");
  const cacheAt = hb.lastIndexOf("api_cache").valueOf();
  ok(dupAt > 0, "★생성 함수가 유사 판정을 받는다");
  ok(dupAt < cacheAt, "★유사 판정이 캐시 저장보다 앞", `dup@${dupAt} < cache@${cacheAt}`);
  ok(/isDup: \(title, keyword\) => usedForbidden/.test(rt), "★호출측이 발행글 대조를 넘긴다");
}

// ── ② 빈 결과·부분 결과를 하루 종일 물지 않는가 ────────────────────────
{
  ok(/if \(out\.length\) \{/.test(hb), "★빈 결과는 캐시하지 않는다(0장이 굳지 않게)");
  ok(/full \? 24 \* 3600_000 : 1 \* 3600_000/.test(hb), "부분 결과는 1시간만");
}

// ── ③ 규칙이 바뀌면 옛 캐시를 못 믿는다 ────────────────────────────────
{
  ok(/homebet:v2:/.test(hb), "★캐시 키에 버전 — 판정 규칙 변경 시 옛 캐시 무효화");
}

// ── ④ 모델에게 '이미 쓴 제목'을 보여주는가 ─────────────────────────────
//  ★키워드만 주면 모델은 주제만 피하고 같은 각도·문장 틀로 돌아온다(실측: 4장 전부 탈락).
{
  ok(/recentTitles/.test(hb), "★생성 프롬프트가 최근 제목을 받는다");
  ok(/이미 쓴 제목들/.test(hb), "프롬프트에 실제 제목 목록이 들어간다");
  ok(/recentTitles,/.test(rt) || /recentTitles\b/.test(rt), "★호출측이 최근 제목을 넘긴다");
  ok(/recent14\.map/.test(rt), "최근 14일 발행분에서 뽑는다");
}

// ── ⑤ 하류 이중 방어는 남아 있는가 ─────────────────────────────────────
//  ★1차가 생겼다고 2차를 지우면, 규칙 이전에 저장된 캐시가 그대로 통과한다.
{
  ok(/usedForbidden\(`\$\{bet\.title\} \$\{bet\.keyword\}`\)/.test(rt), "★하류 방어 유지(옛 캐시 소진 전까지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 홈판 공급(캐시가 실패를 굳히지 않게)");
process.exit(fail ? 1 : 0);
