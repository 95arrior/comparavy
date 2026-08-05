import fs from "node:fs";
import { judgeHomefeed, RIPE_DAYS } from "../lib/homefeedVerdict.ts";

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
  // ★제목 전문 60개를 주니 모델 출력이 길어져 JSON이 잘렸다(2026-08-05 실측 failBy JSON없음:2).
  //  피해야 할 건 문장이 아니라 소재다 — 앞 24자만 준다.
  ok(/이미 쓴 소재들/.test(hb), "프롬프트에 이미 쓴 소재 목록이 들어간다");
  ok(/t\.slice\(0, 24\)/.test(hb), "★제목 전문이 아니라 소재만(입력이 길면 출력이 산만해진다)");
  ok(/recentTitles,/.test(rt) || /recentTitles\b/.test(rt), "★호출측이 최근 제목을 넘긴다");
  ok(/recent14\.map/.test(rt), "최근 14일 발행분에서 뽑는다");
}

// ── ⑤ 하류 이중 방어는 남아 있는가 ─────────────────────────────────────
//  ★1차가 생겼다고 2차를 지우면, 규칙 이전에 저장된 캐시가 그대로 통과한다.
{
  ok(/usedForbidden\(`\$\{bet\.title\} \$\{bet\.keyword\}`\)/.test(rt), "★하류 방어 유지(옛 캐시 소진 전까지)");
}


// ★결품의 진짜 원인이 진단에 없었다(2026-08-05 유저 진단: failBy {} 인데 round1 1, out 0).
//  8장을 만들어 7장이 호출측 중복검사에서 조용히 죽었는데 어디에도 안 적혔다.
{
  const rt2 = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/dupWithUsed/.test(hb), "★발행글 유사 탈락 수를 진단에 남긴다");
  ok(/결품의 진짜 원인이 진단에 없으면/.test(hb), "왜 남겨야 하는지가 코드에 적혀 있다");
  // ★생성기가 피할 목록 = 판정에 쓰는 목록. 어긋나면 눈 가리고 만들게 한 뒤 버리는 셈이다.
  ok(/눈을 가려놓고 만들게 한 뒤 못 맞혔다고 버린 셈이다/.test(rt2), "★피할 목록과 판정 목록을 맞춘다");
  ok(/\.\.\.\[\.\.\.usedTexts\],/.test(rt2), "★판정에 쓰는 발행 이력을 생성기에도 준다");
  // ★넘긴 목록을 프롬프트가 다시 15개로 잘라 무효화하고 있었다(2026-08-05 실측)
  ok(!/recentTitles \?\? \[\]\)\.slice\(0, 15\)/.test(hb), "★프롬프트가 회피 목록을 다시 자르지 않는다");
  ok(/넓힌 게 무효였다/.test(hb), "왜 자르면 안 되는지가 코드에 적혀 있다");
  ok(/백지에서 주제를 떠올리지 마라/.test(hb), "★씨앗 안에서 고르게 한다(백지에서 만들면 반드시 겹친다)");
  ok(/억지로 만든 카드는 어차피 중복으로 죽는다/.test(hb), "★마땅한 게 없으면 포기하게 한다");
  // ★회피용과 차단용을 나눈다(2026-08-05 실측: out 0, dupDropped 4 — 8장 전멸).
  //  프롬프트 회피 목록을 15 → 60으로 넓혔더니 그게 차단 토큰으로도 쓰여
  //  '3글자 하나만 겹쳐도 탈락'하는 벽이 60개 제목만큼 두꺼워졌다 — 내가 만든 악화였다.
  ok(/blockTitles/.test(hb), "★차단용 목록이 따로 있다");
  ok(/차단 토큰\(코드\) — 넓으면 아무것도 못 만든다/.test(hb), "왜 나눠야 하는지가 코드에 적혀 있다");
  const rt3 = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  const bt = (rt3.match(/blockTitles: recent14/g) ?? []).length;
  const pk = (rt3.match(/pickHomefeedBets\(/g) ?? []).length;
  ok(bt === pk, `★모든 호출이 차단 목록을 좁게 넘긴다 (호출 ${pk} · 전달 ${bt})`);
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
  ok(/homebet:v7:/.test(hb), "★생성 규칙이 바뀌면 캐시 버전을 올린다 — 안 올리면 발행한 소재가 하루 종일 남는다");

  const tr = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok((tr.match(/sourceTitle: bet\.sourceTitle,/g) ?? []).length === 2, "★홈판 카드 두 경로 모두 출처를 넘긴다");
  // ★선별 맥락(sel)에도 실어야 발행 위저드의 '글감(뉴스)' 안내가 그 기사를 짚어 준다(2026-08-04)
  ok((tr.match(/sourceTitle: bet\.sourceTitle \?\? null/g) ?? []).length === 2, "★출처가 selection_meta로도 넘어간다(발행 안내가 기사를 짚는다)");

  // ★화면까지 닿는가 — 홈판은 isTrend가 false라 기존 출처 분기를 못 탔다(고친 자리)
  const home = fs.readFileSync(new URL("../components/dashboard/Home.tsx", import.meta.url), "utf-8");
  ok(/topic\.tag === "홈판"/.test(home) && /수확 씨앗:/.test(home), "★홈판 카드가 화면에서 씨앗(키워드)을 렌더한다");
  ok(/실데이터 없이 만든 카드/.test(home), "★출처가 없으면 없다고 표시한다");
}

// ★결품의 이유가 화면에 보여야 한다(2026-08-04 유저 실측: 홈판 want 5 → 2장, homeDrop은 전부 0).
//  하류 탈락이 0인데 결품이면 원인은 생성 안쪽이다. 그런데 그 안쪽은 전부 console.error뿐이라
//  서버 로그를 뒤지지 않고는 '뉴스 없음'인지 '제목 규격'인지 '소재 중복'인지 알 수 없었다.
{
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/export let lastHomebetDiag/.test(hb), "★홈판 생성 진단을 남긴다");
  ok(/fail: "뉴스없음"/.test(hb) && /fail: `제목규격/.test(hb) && /fail: cut \? "출력잘림" : "JSON없음"/.test(hb), "★탈락 사유를 종류별로 센다");
  // ★'JSON이 아예 없다'와 '길어서 잘렸다'는 원인이 다르다 — 뭉치면 다음 사람이 또 헤맨다
  ok(/res\.stop_reason === "max_tokens"/.test(hb), "★출력 잘림을 따로 센다");
  ok(/max_tokens: 700/.test(hb), "출력 예산을 올렸다");
  ok(/failBy\[r\.fail/.test(hb), "★사유별 집계가 진단에 담긴다");
  ok(/cached: true/.test(hb), "★캐시 히트도 남긴다('생성이 안 돌았다'와 '생성이 실패했다'는 다르다)");

  // ★보충 라운드 — 유형 8종을 한 번씩 쓰고 끝내면 절반이 떨어진 날은 그대로 결품이 된다
  ok(/보충 라운드/.test(hb) && /const r2 = await runRound\(retryTypes, used2\)/.test(hb), "★부족하면 떨어진 유형을 한 번 더 시도한다");
  ok(/\.\.\.deduped\.map\(\(b\) => b\.keyword\)/.test(hb), "★재시도엔 이번에 잡은 소재를 제외 목록에 얹는다(같은 소재 재생산 금지)");
  ok(!/while\s*\(/.test(hb.split("보충 라운드")[1] ?? ""), "★재시도는 한 번만(무한 루프 금지 — 유저가 기다리는 응답 안이다)");

  const tr = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  ok(/diag\.homeBet = lastHomebetDiag/.test(tr), "★debug 응답에 실린다(주소 하나로 판별)");
}


// ★익음 게이트(2026-08-04 유저 관찰: "지금 홈판에 노출되는 건 홈판 전략 전 옛 글이고, 지금 글은 아직 노출 전").
//  홈피드 순환은 발행 즉시가 아니다. 갓 낸 글을 표본에 넣고 '안 터졌다'며 배합을 되돌리면 그게 오판이다.
{
  const days = Array.from({ length: 14 }, (_, i) => ({ day: `2026-07-${String(i + 10).padStart(2, "0")}`, visitors: 100 }));
  const posts = Array.from({ length: 10 }, (_, i) => `2026-07-${String(i + 12).padStart(2, "0")}`);
  const 덜익음 = judgeHomefeed({ days, homefeedPublishDays: posts, otherPublishDays: [], ripeHomefeedPosts: 2 });
  ok(덜익음.verdict === "insufficient", "★표본은 찼어도 덜 익었으면 판정하지 않는다");
  ok(덜익음.notes.some((n) => n.includes("반응이 쌓인 뒤")), "★이유를 남긴다(노출은 즉시가 아니다)");
  ok(덜익음.notes.some((n) => n.includes("이전 글들의 몫")), "★옛 글 유입과 섞어 보지 말라고 못 박는다");

  const 익음 = judgeHomefeed({ days, homefeedPublishDays: posts, otherPublishDays: [], ripeHomefeedPosts: 9 });
  ok(익음.verdict !== "insufficient", "★익으면 정상 판정으로 넘어간다(게이트가 영구 보류가 되지 않는다)");
  ok(RIPE_DAYS === 7, "익음 기준 = 발행 D+7");

  const rt = fs.readFileSync(new URL("../app/api/health/homefeed-bet/route.ts", import.meta.url), "utf-8");
  ok(/ripeHomefeedPosts \+= 1/.test(rt) && /ripeness:/.test(rt), "★엔드포인트가 익음 분포를 계산해 함께 보여준다");
}

// ★쓴 카드는 캐시에서도 빠지고 빈 자리는 다시 채운다(2026-08-05 유저 실측: 홈판 2장을 다 발행했는데 그대로 남아 있었다)
{
  const hb = fs.readFileSync(new URL("../lib/homefeedBet.ts", import.meta.url), "utf-8");
  ok(/alive = cached\.filter\(/.test(hb), "★캐시에서 꺼낼 때 '이미 쓴 것'을 걸러낸다");
  ok(/if \(alive\.length >= want\)/.test(hb), "★남은 게 충분하면 그대로 쓴다(불필요한 재생성 없음)");
  ok(/const aliveTypes = new Set\(alive\.map/.test(hb), "★부족분만 새로 만들되 이미 있는 유형은 다시 안 뽑는다");
  ok(/const got = \[\.\.\.alive, \.\.\.r1\.cards\]|let got = \[\.\.\.alive, \.\.\.r1\.cards\]/.test(hb), "★살아남은 카드를 앞에 세워 합친다");
  ok(/부족분 \$\{want - alive\.length\}장을 새로 만든다/.test(hb), "★몇 장을 왜 새로 만드는지 로그로 남긴다");

  // ★2026-08-05 유저 실측: "12시 지났는데 엔화·전기차가 그대로다"
  ok(/Math\.floor\(\(Date\.now\(\) \+ 9 \* 3600_000\) \/ 86400_000\)/.test(hb), "★유형 회전이 KST 자정 기준이다(UTC면 오전 9시에 회전한다)");
  ok(/opts\?\.recentKeywords/.test(hb) && /seededCores/.test(hb), "★최근 쓴 소재를 미리 차단한다");
  // ★핵심어 한 개로는 못 막는다(2026-08-05 재발: 엔화 글 쓴 다음 날 또 엔화) —
  //  coreKeywordOf는 가장 긴 토큰을 고르므로 '엔화 오를수록 통장'에서 '오를수록'이 뽑힌다.
  // ★한 개 겹침으로 전부 막았더니 홈판이 전멸했다(2026-08-05 실측: round1 4 → dupDropped 4 → out 0).
  //  중복을 막으려던 규칙이 생산 자체를 막았다. 발행한 글과 보여만 준 카드를 다르게 다룬다.
  ok(/const repeatsRecent =/.test(hb) && /publishedTokens\.has\(w\)/.test(hb), "★발행한 글과 겹치면 하나라도 막는다");
  ok(/shownHits\.length >= 2/.test(hb), "★보여만 준 카드는 두 개 이상 겹쳐야 같은 소재로 본다(재고가 마르지 않게)");
  ok(/\[\.\.\.w\]\.length >= 3 && publishedTokens/.test(hb), "★두 글자 흔한 말은 우연히 겹친다 — 세 글자부터");
  // ★엔화가 세 번 떴다(2026-08-05). 앞선 두 수리가 다 뚫린 이유 두 가지를 같이 막는다.
  ok(/homebet:recent:/.test(hb) && /3 \* 86400_000/.test(hb), "★보여준 카드를 3일 기억한다(발행 안 해도 이미 보여준 소재다)");
  ok(/const TOPIC_AXES/.test(hb) && /엔화\|엔·원\|엔원\|환율/.test(hb), "★주제 축 — 표기가 흔들려도(엔화→엔·원→환율) 같은 소재로 본다");
  ok(/const cacheRepeat = \(b: HomefeedBet\): boolean => repeatsRecent\(b\) !== null/.test(hb), "★캐시 경로와 생성 경로가 같은 판정을 쓴다");
  ok(/새 반복이 관측되면 그때 추가한다/.test(hb), "★축 사전을 미리 크게 만들지 않는다(과교정 방어)");
  ok(/최근 소재 반복 — 제외/.test(hb), "★겹친 말이 무엇인지 로그로 남긴다");
  // ★필터는 '꺼내는 자리'에도 있어야 한다(2026-08-05 재발: 엔화 글을 발행했는데 캐시의 엔화 카드가 살아남았다)
  ok(/const cacheRepeat =/.test(hb) && /&& !cacheRepeat\(b\)/.test(hb), "★캐시에서 꺼낼 때도 최근 소재 반복을 거른다");
  const tr2 = fs.readFileSync(new URL("../app/api/topics/route.ts", import.meta.url), "utf-8");
  // ★고정 개수로 재면 호출 지점이 늘 때마다 테스트가 깨지기만 하고 정작 '빠진 곳'은 못 잡는다.
  //  실제로 지켜야 할 건 '모든 호출이 최근 키워드를 넘기는가'다 — 그걸 센다.
  const calls = (tr2.match(/pickHomefeedBets\(/g) ?? []).length;
  const withRecent = (tr2.match(/recentKeywords: recent14/g) ?? []).length;
  ok(calls >= 2 && withRecent === calls, `★모든 홈판 호출이 최근 키워드를 넘긴다 (호출 ${calls} · 전달 ${withRecent})`);
}

process.exit(fail ? 1 : 0);
