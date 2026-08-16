import { ipoAdviceLeak, shortCorpName, fetchDartIPOSeeds } from "../lib/dartIPO.ts";
import fs from "node:fs";

// ★공모주 수확기 회귀(2026-08-02, 유저 키 발급).
//  ★이 파일에서 가장 중요한 건 수확이 아니라 '멈추는 선'이다.
//   공모주는 홈판 클릭이 가장 잘 나오는 소재축인데, 한 발만 더 나가면 자본시장법 문제가 된다.
//   우리가 쓰는 건 절차 정보다 — 청약 방법, 증거금·배정 제도, 일정 확인처까지.
//   '유망하다·따상 간다·넣어라'는 투자권유고, 공모가·경쟁률도 판단을 부추기는 숫자라 먼저 꺼내지 않는다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// ── ① 투자권유가 새면 잡히는가 ─────────────────────────────────────────
for (const t of [
  "○○ 공모주 청약하세요", "이번 공모주 따상 갑니다", "올해 최고 기대주",
  "무조건 넣어야 하는 공모주", "목표 주가 5만 원", "놓치면 후회하는 청약",
  "공모가 밴드 1만~1만2천 원", "수요 예측 결과 정리", "경쟁률 1200대 1",
  "수익률 보장", "지금 매수 추천",
]) ok(ipoAdviceLeak(t) !== null, "★투자권유·판단 유도 검거", t);

// ── ② 절차 안내는 통과하는가(오탐 0) ───────────────────────────────────
for (const t of [
  "오로라테크 공모주 청약, 일정과 방법 정리",
  "공모주 청약 증거금은 어떻게 계산되나요",
  "균등배정과 비례배정 차이",
  "청약 일정은 DART 공시 원문에서 확인하세요",
  "미성년자 공모주 청약 가능한가요",
  "공모 일정 정정 공시, 달라진 점",
]) ok(ipoAdviceLeak(t) === null, "절차 안내는 통과", t);

// ── ③ 회사명 정리 ──────────────────────────────────────────────────────
for (const [raw, want] of [
  ["주식회사 오로라테크", "오로라테크"], ["(주)한빛소재", "한빛소재"],
  ["케이엠씨 주식회사", "케이엠씨"], ["넥스트칩", "넥스트칩"],
]) ok(shortCorpName(raw) === want, "법인격 접미어 제거", `${raw} → ${shortCorpName(raw)}`);

// ── ④ 키 없으면 조용히 통과하지 않는가 ─────────────────────────────────
//  ★'조용히 통과'가 이 저장소의 반복 사고다(이미지 글자 4회차 사고의 원인이 전부 그것이었다).
{
  const saved = process.env.DART_API_KEY;
  delete process.env.DART_API_KEY;
  let threw = false;
  try { await fetchDartIPOSeeds(); } catch (e) { threw = /DART_API_KEY_MISSING/.test(String(e.message)); }
  ok(threw, "★키 없으면 throw(빈 배열로 조용히 넘어가지 않는다)");
  if (saved) process.env.DART_API_KEY = saved;
}

// ── ④-2 실호출로 확인된 것(2026-08-02, 최근 14일 39건) ────────────────
//  ★필드명은 추측이 아니라 실측이다:
//   corp_code, corp_name, stock_code, corp_cls, report_nm, rcept_no, flr_nm, rcept_dt, rm
//  미상장 14 / 상장사 25로 갈렸고, stock_code 유무가 실제로 그 경계였다.
{
  const src = fs.readFileSync(new URL("../lib/dartIPO.ts", import.meta.url), "utf-8");

  // ★스팩 — 실호출에서 '엔에이치기업인수목적34호'가 씨앗으로 올라왔다.
  //  껍데기 법인이라 쓸 내용이 없고 검색 수요도 없는데, 숫자만 바꿔 매달 쏟아진다.
  ok(/SPAC_RE/.test(src), "★스팩 제외 규칙 존재");
  const SPAC = /기업인수목적|스팩|제\s*\d+\s*호\s*(?:기업인수|스팩)/;
  for (const n of ["엔에이치기업인수목적34호", "하나금융25호스팩", "IBKS제27호기업인수목적"])
    ok(SPAC.test(n), "★스팩 검거", n);
  for (const n of ["딜리셔스", "케이앤에스아이앤씨", "스카이랩스", "와이즈플래닛컴퍼니", "글로벌테크놀로지"])
    ok(!SPAC.test(n), "실제 사업회사는 통과", n);

  // ★[발행조건확정] = 공모가·청약일이 확정된 시점(실호출에서 딜리셔스가 이 상태였다). 선점 가치 최고.
  ok(/발행조건확정/.test(src), "★발행조건 확정 건을 식별한다");
  ok(/Number\(b\.priced\) - Number\(a\.priced\)/.test(src), "★확정 건이 정렬 1순위");

  // 실측된 보고서명들이 실제로 IPO 문서로 인식되는가
  const REPORT = /증권신고서\s*\(\s*지분증권\s*\)|투자설명서/;
  for (const r of ["[발행조건확정]증권신고서(지분증권)", "[기재정정]투자설명서", "[첨부정정]증권신고서(지분증권)", "투자설명서"])
    ok(REPORT.test(r), "실측 보고서명 인식", r);
  for (const r of ["분기보고서", "주요사항보고서(유상증자결정)"])
    ok(!REPORT.test(r), "무관한 보고서는 제외", r);
}

// ── ④-3 게이트가 자기 규칙문을 위반으로 읽지 않는가 ────────────────────
//  ★실측 사고: 진단 스크립트가 newsContext까지 검사했더니, 거기 적힌 금지어 목록
//   ('유망·기대주·따상…')을 스스로 잡아 멀쩡한 씨앗 5건이 전부 누출로 찍혔다.
//   규칙문과 위반문은 다르다 — 프로덕션은 keyword+title만 본다.
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/ipoAdviceLeak\(`\$\{p\.keyword\} \$\{p\.title\}`\)/.test(tt), "★검사 범위는 keyword+title(지시문 제외)");
  const dg = fs.readFileSync(new URL("./diagnose-dart.mjs", import.meta.url), "utf-8");
  ok(!/ipoAdviceLeak\(`\$\{s\.keyword\} \$\{s\.title\}\\n\$\{s\.newsContext\}`\)/.test(dg), "★진단기도 같은 범위로 정렬됨");
}

// ── ⑤ 소스 코드가 지켜야 할 선 ─────────────────────────────────────────
{
  const src = fs.readFileSync(new URL("../lib/dartIPO.ts", import.meta.url), "utf-8");
  ok(/if \(\(it\.stock_code \?\? ""\)\.trim\(\)\) continue;/.test(src), "★상장사 유상증자 제외(검색자=독자 정합)");
  ok(/j\.status !== "000"/.test(src), "★DART가 200에 실은 실패 status를 본다");
  ok(/j\.status === "013"/.test(src), "'데이터 없음'만 정상 처리");
  ok(/원문에 있으니/.test(src) && /지어내지 마라/.test(src), "원문 외 수치 금지 지시");
  ok(/절차 안내다/.test(src), "★절차 정보까지만이라는 경계가 프롬프트에 명시");

  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/fetchDartIPOSeeds/.test(tt), "★씨앗 풀에 배선됨");
  ok(/ipoAdviceLeak\(/.test(tt), "★수확 시점에도 투자권유 게이트가 돈다");
  ok(/actionStart\?: string/.test(tt), "★행동 창을 모르면 비워 둔다(날짜 날조 금지)");

  // ★비워 둔 행동 창이 저장 행에서 어떻게 쓰이는가 — 위 규칙의 나머지 반쪽(2026-08-02 2차 사고).
  //  종전: expires_at: `${m.c.actionEnd}T23:59:59+09:00` → 공모주는 마감일이 없으니
  //  "undefinedT23:59:59+09:00"이 들어갔고, timestamp 파싱 실패로 배치 전체가 죽었다.
  //  강등 재시도(action 컬럼 제거·source 제거)는 expires_at을 안 벗기니 세 번 다 같은 이유로 실패했다.
  //  밖에서 보이는 얼굴은 '채택 로그는 찍히는데 풀은 0건' — 중복키 사고와 구분이 안 됐다.
  ok(/expires_at: m\.c\.actionEnd \? `\$\{m\.c\.actionEnd\}T23:59:59\+09:00` : expires/.test(tt),
    "★★마감일 없는 씨앗도 유효한 만료값을 갖는다(한 건이 배치 전체를 죽이지 않게)");
  ok(!/expires_at: `\$\{m\.c\.actionEnd\}T/.test(tt), "무조건 조립 금지(undefined 문자열 방지)");
}

// ── ⑥ 저장 실패를 성공으로 위장하지 않는가 ─────────────────────────────
//  ★이 저장소의 반복 사고: 조용한 실패. 수확 로그만 보고 '됐다'고 판단하면 며칠을 날린다.
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/console\.error\(`\[trend-upsert\]/.test(tt), "★저장 실패는 error로 남긴다");
  ok(/generated: uniqRows\.length/.test(tt), "★보고 건수 = 실제로 넣은 건수(중복 제거 후)");
  // 넣고 나서 지운다 — 실패해도 옛 씨앗은 남는다
  const upsertAt = tt.indexOf("const upsert = async (list");
  const deleteAt = tt.indexOf('.delete().eq("category", category)');
  ok(upsertAt > 0 && deleteAt > upsertAt, "★파괴는 저장 성공 이후에만(순서 반전 유지)");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 공모주 수확기(절차 정보 경계)");
process.exit(fail ? 1 : 0);
