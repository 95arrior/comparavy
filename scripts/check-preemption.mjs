import { preemptionScore, preemptWindow, demandScore, timingScore, preemptionNote } from "../lib/preemption.ts";
import fs from "node:fs";

// ★선점 큐 회귀(2026-08-02 유저 확정: "지원금·청약·주식 이슈 — 더 연결해서 선점하는 거").
//  종전엔 공고 씨앗을 '도착 순서대로' 상한 4건까지 태웠다 — 청약홈이 먼저 4건을 먹으면
//  그 뒤 보조금24에 아무리 큰 게 있어도 자리가 없었다. 가치가 아니라 순서가 결정했다.
//  이 테스트가 지키는 것: ①큰 게 이긴다 ②임박한 게 이긴다 ③지역명은 판정에 안 들어간다
//  ④마감 지난 건 제외된다 ⑤수요 못 잰 건 통과하지 않는다(추정 금지).
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

const 오늘 = new Date("2026-08-02T09:00:00+09:00");
// ★KST 날짜 문자열 생성 — +9h를 더한 뒤 잘라야 한다.
//  처음엔 KST 자정의 UTC 표현을 그대로 slice해서 하루씩 밀렸다(D-0이 D-1로 계산됨).
const d = (offsetDays) => {
  const t = Date.parse("2026-08-02T00:00:00+09:00") + offsetDays * 86400_000 + 9 * 3600_000;
  return new Date(t).toISOString().slice(0, 10);
};
const S = (monthly, startOff, endOff) => preemptionScore({ monthly, actionStart: d(startOff), actionEnd: d(endOff), now: 오늘 });

// ── ① 접수 창 판정 ────────────────────────────────────────────────────
{
  const W = (so, eo) => preemptWindow({ monthly: 1000, actionStart: d(so), actionEnd: d(eo), now: 오늘 });
  ok(W(3, 10) === "prime", "D-3 = prime(아직 아무도 안 썼고 곧 터진다)");
  ok(W(7, 20) === "prime", "D-7 = prime");
  ok(W(14, 30) === "early", "D-14 = early");
  ok(W(40, 60) === "early", "D-40 = early(캘린더 트랙의 몫)");
  ok(W(0, 10) === "today", "D-0 = today");
  ok(W(-3, 10) === "open", "접수 중 = open");
  ok(W(-3, 1) === "closing", "마감 임박 = closing(마감 훅)");
  ok(W(-30, -1) === "passed", "★마감 지남 = passed(죽은 글감)");
}

// ── ② 큰 게 이긴다 ────────────────────────────────────────────────────
{
  const 큰거 = S(20_000, 3, 20);   // 전국 청약급
  const 작은거 = S(150, 3, 20);    // 지역 지원사업급
  ok(큰거 > 작은거, `같은 시각이면 큰 수요가 이긴다 (${큰거} > ${작은거})`);
}

// ── ③ 임박한 게 이긴다 ────────────────────────────────────────────────
{
  const 임박 = S(3_000, 3, 20);
  const 먼거 = S(3_000, 40, 60);
  ok(임박 > 먼거, `같은 수요면 임박한 쪽이 이긴다 (${임박} > ${먼거})`);
}

// ── ④ ★핵심: 큰 지역 청약이 작은 전국 공고를 이긴다 ─────────────────────
//  종전엔 '지역명이 있으면 컷'이라 동탄 줍줍 같은 전국 관심 청약이 지역명 때문에 죽었다.
//  이제 지역명은 판정에 안 들어간다 — 검색량과 시각만 본다.
{
  const 동탄줍줍 = S(15_000, 2, 5);    // 지역명 있지만 전국이 검색
  const 전국소액 = S(200, 10, 30);     // 지역명 없지만 아무도 안 찾음
  ok(동탄줍줍 > 전국소액, `★지역명 있어도 큰 수요가 이긴다 (${동탄줍줍} > ${전국소액})`);
}

// ── ⑤ 자격 미달 ───────────────────────────────────────────────────────
{
  ok(S(null, 3, 20) < 0, "★수요를 못 재면 후보 자격 없음(추정으로 통과시키지 않는다)");
  ok(S(50, 3, 20) < 0, "월 50회는 후보 자격 없음");
  ok(S(50_000, -30, -1) < 0, "★수요가 아무리 커도 마감 지났으면 제외");
  ok(demandScore(null) < 0 && timingScore("passed") < 0, "두 축 모두 자격 컷을 갖는다");
}

// ── ⑥ 배선 확인 ───────────────────────────────────────────────────────
{
  const tt = fs.readFileSync(new URL("../lib/trendTopics.ts", import.meta.url), "utf-8");
  ok(/preemptionScore/.test(tt), "★수확 경로에 선점 점수가 배선됨");
  ok(/ranked\.slice\(0, NOTICE_CAP\)/.test(tt), "★점수 내림차순 상위 N만 채택(도착 순서 폐기)");
  ok(!/const demandOk = async/.test(tt), "★도착 순서로 상한을 채우던 demandOk가 제거됨");
  ok(/\[preempt\]/.test(tt), "선점 큐 로그가 남는다(무엇이 왜 뽑히고 밀렸는지)");
  ok(/Promise\.all\(alive\.map/.test(tt), "수요 측정이 병렬(종전 순차 await 루프)");
}

console.log("\n  예시 —", preemptionNote({ monthly: 15_000, actionStart: d(2), actionEnd: d(5), now: 오늘 }));
console.log("  예시 —", preemptionNote({ monthly: 800, actionStart: d(30), actionEnd: d(45), now: 오늘 }));
console.log(fail ? `\n실패 ${fail}건` : "\n통과: 선점 큐");
process.exit(fail ? 1 : 0);
