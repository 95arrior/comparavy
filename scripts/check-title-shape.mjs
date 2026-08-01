import { isOverusedTitleShape, titleShapeClashes } from "../lib/editorial.ts";
import fs from "node:fs";

// ★제목 뼈대 수렴 회귀(2026-08-01 유저 실측) — WP 31편 중 7편이 '~ 전 확인할 N가지'였다.
//  2026-07-16에 '~하는 법/정리: 부제' 콜론형 수렴을 한 번 잡았는데 다른 형태로 재발했다.
//  로테이션만으로는 못 막는다 — 한 형식 안에서 예시 뼈대를 그대로 베끼기 때문이다.
let fail = 0;
const ok = (c, l, e = "") => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "|", l, e); };

// 실제 발행된 제목들(pigtong.com에서 그대로 가져옴)
const 수렴 = [
  "중국주식 시작 전 확인할 5가지",
  "미국금리 확인 전 알아야 할 5가지",
  "저축은행 종류 선택 전 확인할 5가지",
  "금융기관 이용 전 확인할 5가지",
  "온투업 투자 전 확인할 5가지",
  "앱테크 시작 전 확인할 5가지 기준",
  "모의주식 시작 전 확인할 5가지",
  "퇴직연금 세액공제 챙기기 전 확인할 4가지",
];
const 정상 = [
  "조선관련주, 지금 사도 되는 걸까요?",
  "2차전지주, 지금 들어가도 되는지 판단하는 법",
  "로또 당첨되면 세금 얼마나 내나요?",
  "연말정산 환급금, 언제 어디서 얼마나 받나요?",
  "CMA통장 추천: 유형별로 골라야 이자가 다릅니다",
  "코인 종류 정리: 비트코인부터 RWA·스테이블코인까지 한눈에",
];
for (const t of 수렴) ok(isOverusedTitleShape(t), "과다 뼈대 검출", `→ ${t}`);
for (const t of 정상) ok(!isOverusedTitleShape(t), "정상 제목은 통과", `→ ${t}`);

// 옛 수렴(2026-07-16)도 계속 막혀 있어야 한다
ok(isOverusedTitleShape("정기예금특판 고르는 법: 신협 금리 정리"), "옛 콜론형 수렴도 검출");

// 문형 충돌 판정
ok(titleShapeClashes("베트남주식 투자 전 확인할 5가지", 수렴.slice(0, 3)), "★같은 문형이 여럿이면 충돌 판정");
ok(!titleShapeClashes("조선관련주, 지금 사도 되는 걸까요?", 수렴), "다른 문형은 충돌 아님");

// ★프롬프트에서 예시 뼈대가 제거됐는지(예시를 남기면 모델이 그대로 베낀다)
{
  const ap = fs.readFileSync(new URL("../lib/articlePrompt.ts", import.meta.url), "utf-8");
  ok(!/예: '정기예금특판 가입 전 확인할 5가지'/.test(ap), "★수렴을 부른 예시가 프롬프트에서 제거됨");
  ok(/금지 뼈대/.test(ap), "금지 뼈대가 프롬프트에 명시됨");
  ok(/이미 이 블로그에 있는 최근 제목들이다/.test(ap), "최근 제목을 보여주고 피하게 함");
  const wp = fs.readFileSync(new URL("../app/api/cron/wp-autopublish/route.ts", import.meta.url), "utf-8");
  ok(/isOverusedTitleShape/.test(wp), "★자동발행 경로에 코드 게이트가 붙음");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 제목 뼈대");
process.exit(fail ? 1 : 0);
