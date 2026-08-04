// 썸네일 훅 연출 검증 — 실행: npx tsx scripts/check-thumb-hook.mjs
// ★유저 확정(2026-08-05): "키워드에 맞는 일러스트가 나오면 안 된다. 글 유형에 따라 결핍이면 결핍,
//  포모면 포모, 호기심 증폭 — 지나가면 '아 왜 안 눌렀지' 하고 되찾는 썸네일이어야 한다."
// ★핵심 원칙(제목의 '열린 고리'와 짝): 답을 그리지 마라 — 답 '직전'을 그려라.
import fs from "node:fs";
import { thumbHookOf, buildThumbPhotoBgPrompt } from "../lib/geminiImage.ts";

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log(`  !! ${m}`); } else console.log(`  OK ${m}`); };

console.log("① 유형 판정:");
{
  ok(thumbHookOf("오늘까지 신청 안 하면 소멸되는 지원금") === "closing", "마감·소멸 → 포모");
  ok(thumbHookOf("나만 못 받은 근로장려금") === "lack", "나만·못 받 → 결핍");
  ok(thumbHookOf("연금저축 vs IRP 어디가 유리할까") === "fork", "비교·vs → 선택");
  ok(thumbHookOf("숨어 있는 환급금 얼마나 받을 수 있나") === "gain", "환급·받을 → 이득");
  ok(thumbHookOf("전세보증금 반환대출 한도 기준") === "hidden", "★기본은 호기심 — 답을 감추는 쪽이 늘 안전하다");
}

console.log("\n② 연출이 프롬프트 최상위에 실리는가:");
{
  const p1 = buildThumbPhotoBgPrompt("근로장려금 신청", 3, false, { copyText: "나만 못 받은 그 돈" });
  ok(/HOOK = LACK/.test(p1), "★문구가 있을 때 결핍 연출이 실린다");
  ok(/MOMENT JUST BEFORE THE ANSWER/.test(p1), "★'답 직전을 그려라'가 최상위 규칙으로 박힌다");
  ok(p1.indexOf("HOOK =") < p1.indexOf("PALETTE"), "★훅이 팔레트·문법보다 앞에 온다(우선순위가 순서로 드러남)");

  // ★무문구가 진짜 승부처다 — 글자가 없으니 그림 하나가 훅을 통째로 져야 한다
  const p2 = buildThumbPhotoBgPrompt("오늘 마감되는 청년 지원금", 1, false);
  ok(/HOOK = CLOSING WINDOW/.test(p2), "★무문구에서도 유형 연출이 실린다");
  ok(/NO text on this image/.test(p2), "★무문구임을 모델에게 명시한다");
  ok(!/Flat vector illustration thumbnail for this topic/.test(p2), "★종전의 밋밋한 한 줄('이 주제를 그려라')이 사라졌다");
}

console.log("\n③ 금지 목록 — 스톡 티 나는 클리셰:");
{
  const p = buildThumbPhotoBgPrompt("연말정산 환급", 2, false, { copyText: "13월의 월급" });
  for (const w of ["credit cards", "coin stacks", "piggy banks", "robots"]) ok(new RegExp(w).test(p), `금지 명시: ${w}`);
  ok(/ABSOLUTELY NO text of any kind/.test(p), "★글자 금지는 그대로(유저 3회 지적 사항)");
}

console.log("\n④ 종전 규칙과의 충돌 정리:");
{
  const src = fs.readFileSync(new URL("../lib/geminiImage.ts", import.meta.url), "utf-8");
  // '결과를 그려라'(완료된 체크리스트·여유로운 커피)는 호기심을 죽인다 — 이득/해결 유형에만 남긴다
  ok(!/RESULT-FIRST RULE \(2026-07-17\): draw the RESULT this copy promises/.test(src), "★'끝난 장면을 그려라'가 훅 경로에서 빠졌다(궁금할 게 없어진다)");
  ok(/export function thumbHookOf/.test(src), "★유형 판정이 export돼 테스트로 고정된다");
  ok(!/function emotionOf/.test(src), "★정의만 되고 안 쓰이던 옛 함수가 제거됐다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 썸네일 훅 연출");
process.exit(fail ? 1 : 0);
