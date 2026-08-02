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
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 공모주 수확기(절차 정보 경계)");
process.exit(fail ? 1 : 0);
