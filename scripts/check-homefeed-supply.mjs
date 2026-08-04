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
  // ★버전 숫자를 박지 않는다(2026-08-03) — v2를 박아뒀더니 정당한 버전업(v3)이 실패로 잡혔다.
  //  이 검사가 지켜야 할 것은 "버전이 2다"가 아니라 "버전 자리가 있다"이다.
  ok(/homebet:v\d+:/.test(hb), "★캐시 키에 버전 — 판정 규칙 변경 시 옛 캐시 무효화", (hb.match(/homebet:v\d+/) ?? [])[0] ?? "");
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
// ── ★홈판을 실데이터로(2026-08-03 유저 지적: "홈판도 트렌드 키워드로 만들어야 한다") ──
//  우리는 청약홈·보조금24·기업마당·DART를 이미 수확하는데 홈판은 하나도 안 쓰고 있었다.
//  일반 뉴스 검색만 보고, 그것도 일부 유형만 받아서 나머지는 일반론으로 흘렀다
//  (실측 카드: 환율·자산 격차·저축액·퇴직금 — 전부 '지금 일'이 아니다).
//  ★홈피드는 시의성이 노출 요인이고, 공고·공시는 '마감이 있는 지금 일'이라 그 축에서 가장 강하다.
{
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/getTrendTopics/.test(hb), "★홈판이 수확된 씨앗 풀을 읽는다");
  ok(/liveSeedBlock/.test(hb), "★실데이터 그라운딩 블록이 있다");
  ok(/const seedBlock = await liveSeedBlock/.test(hb), "★모든 유형에 주입된다(뉴스 그라운딩은 일부 유형뿐이었다)");
  ok(/actionEnd/.test(hb), "★행동 창(마감)이 살아 있는 공고를 우선한다");
  ok(/키워드를 그대로 베끼지 마라/.test(hb), "★홈판 keyword는 주제 앵커라 씨앗을 베끼지 않게 막는다");
  // ★씨앗 조회가 실패해도 홈판이 죽으면 안 된다 — 기존 뉴스 경로로 폴백
  ok(/return null; \/\/ 실데이터 실패/.test(hb), "★씨앗 조회 실패는 조용히 폴백(파이프 무영향)");
  // ★트렌드 레인과 같은 씨앗을 쓰면 한 보드에 중복이 뜬다 — 이미 쓴 것은 제외
  ok(/liveSeedBlock\(sub, usedKeywords\)/.test(hb), "★이미 쓴 키워드를 씨앗 후보에서 뺀다(트렌드 레인과 중복 방지)");
}

// ── ★출처 표기(2026-08-03 유저 요청: "출처 어디서 가져왔는지 써줘야 진짜구나 안다") ──
//  ★유저가 화면에서 확인할 수 없으면 우리가 뭘 고쳤는지 알 방법이 없다. 신뢰의 문제다.
//  그리고 출처가 '없다'는 것도 보여줘야 한다 — 실데이터 없이 만든 카드라는 사실이 판단 재료다.
{
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/sourceTitle\?: string;/.test(hb), "★출처 필드가 카드 타입에 있다");
  ok(/"src":"위 \[오늘 수확한 실제 이슈\]/.test(hb), "★모델이 실제로 쓴 항목을 보고하게 한다");
  ok(/정직하게 적는다/.test(hb), "★안 쓰고 적으면 거짓말이라고 못 박았다");

  // ★캐시 버전 — 안 올리면 24h 캐시가 옛 카드를 그대로 서빙한다(유저 실측: 카드 4장이 글자까지 동일했다)
  ok(/homebet:v4:/.test(hb), "★생성 규칙(보충 라운드)이 바뀌어 캐시 버전을 올렸다 — 안 올리면 미달이 굳는다");

  const tr = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok((tr.match(/sourceTitle: bet\.sourceTitle/g) ?? []).length === 2, "★홈판 카드 두 경로 모두 출처를 넘긴다");

  // ★화면까지 닿는가 — 홈판은 isTrend가 false라 기존 출처 분기를 못 탔다(고친 자리)
  const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
  ok(/topic\.tag === "홈판"/.test(home) && /근거 이슈:/.test(home), "★홈판 카드가 화면에서 출처를 렌더한다");
  ok(/실데이터 없이 만든 카드/.test(home), "★출처가 없으면 없다고 표시한다");
}

// ★결품의 이유가 화면에 보여야 한다(2026-08-04 유저 실측: 홈판 want 5 → 2장, homeDrop은 전부 0).
//  하류 탈락이 0인데 결품이면 원인은 생성 안쪽이다. 그런데 그 안쪽은 전부 console.error뿐이라
//  서버 로그를 뒤지지 않고는 '뉴스 없음'인지 '제목 규격'인지 '소재 중복'인지 알 수 없었다.
{
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/export let lastHomebetDiag/.test(hb), "★홈판 생성 진단을 남긴다");
  ok(/fail: "뉴스없음"/.test(hb) && /fail: `제목규격/.test(hb) && /fail: "JSON없음"/.test(hb), "★탈락 사유를 종류별로 센다");
  ok(/failBy\[r\.fail/.test(hb), "★사유별 집계가 진단에 담긴다");
  ok(/cached: true/.test(hb), "★캐시 히트도 남긴다('생성이 안 돌았다'와 '생성이 실패했다'는 다르다)");

  // ★보충 라운드 — 유형 8종을 한 번씩 쓰고 끝내면 절반이 떨어진 날은 그대로 결품이 된다
  ok(/보충 라운드/.test(hb) && /const r2 = await runRound\(retryTypes, used2\)/.test(hb), "★부족하면 떨어진 유형을 한 번 더 시도한다");
  ok(/\.\.\.deduped\.map\(\(b\) => b\.keyword\)/.test(hb), "★재시도엔 이번에 잡은 소재를 제외 목록에 얹는다(같은 소재 재생산 금지)");
  ok(!/while\s*\(/.test(hb.split("보충 라운드")[1] ?? ""), "★재시도는 한 번만(무한 루프 금지 — 유저가 기다리는 응답 안이다)");

  const tr = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/diag\.homeBet = lastHomebetDiag/.test(tr), "★debug 응답에 실린다(주소 하나로 판별)");
}

process.exit(fail ? 1 : 0);
