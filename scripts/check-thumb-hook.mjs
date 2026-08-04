// 썸네일 훅 연출 검증 — 실행: npx tsx scripts/check-thumb-hook.mjs
// ★유저 확정(2026-08-05): "키워드에 맞는 일러스트가 나오면 안 된다. 글 유형에 따라 결핍이면 결핍,
//  포모면 포모, 호기심 증폭 — 지나가면 '아 왜 안 눌렀지' 하고 되찾는 썸네일이어야 한다."
// ★핵심 원칙(제목의 '열린 고리'와 짝): 답을 그리지 마라 — 답 '직전'을 그려라.
import fs from "node:fs";
import { thumbHookOf } from "../lib/thumbHook.ts";
import { buildThumbMetaphorPrompt } from "../lib/bannerPrompts.ts";
import { buildTextlessThumbPrompt } from "../lib/thumbSubject.ts";

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

console.log("\n② 살아 있는 두 경로에 실제로 실리는가(★오늘 여기서 한 번 헛돌았다):");
{
  // ★죽은 함수(buildThumbPhotoBgPrompt)에 먼저 넣었다가 화면이 그대로였다.
  //  살아 있는 경로는 둘뿐이다: 문구 일러스트(buildThumbMetaphorPrompt) · 무문구(buildTextlessThumbPrompt).
  const withCopy = buildThumbMetaphorPrompt("근로장려금 신청 조건", "나만 못 받은 그 돈", 3, { deepBg: true });
  ok(/HOOK = LACK/.test(withCopy), "★문구 일러스트 경로에 결핍 연출이 실린다");
  ok(/MOMENT JUST BEFORE THE ANSWER/.test(withCopy), "★'답 직전을 그려라'가 최상위 규칙");
  ok(withCopy.indexOf("HOOK =") < withCopy.indexOf("Palette"), "★훅이 팔레트보다 앞(우선순위가 순서로 드러남)");

  const textless = buildTextlessThumbPrompt("손해 공포 마감", "u1", 0, null, "오늘 마감되는 청년 지원금");
  ok(/HOOK = CLOSING WINDOW/.test(textless), "★무문구 경로에도 유형 연출이 실린다");
  ok(/flat vector editorial illustration/i.test(textless), "★토스피드 결 — 플랫 벡터 일러스트");
  ok(/NOT a 3D render/.test(textless) && /NO neon glow/.test(textless), "★종전 3D 네온·야경 규격을 명시적으로 배제한다");
  ok(/one flat saturated solid color/.test(textless), "★단색 배경(토스 카드 결)");
  ok(/NO TEXT of any kind/.test(textless), "★글자 금지는 스타일이 바뀌어도 그대로(유저 4회 지적)");
}

console.log("\n③ 죽은 프롬프트 빌더 제거:");
{
  const gi = fs.readFileSync(new URL("../lib/geminiImage.ts", import.meta.url), "utf-8");
  ok(!/export function buildThumbPhotoBgPrompt/.test(gi) && !/export function buildThumbBgPrompt/.test(gi),
    "★아무도 안 부르던 빌더 2개가 사라졌다 — 남겨두면 다음에도 같은 자리에서 시간을 잃는다");
  ok(!/function emotionOf/.test(gi), "★정의만 되고 안 쓰이던 감정 함수도 제거됐다");
  const th = fs.readFileSync(new URL("../lib/thumbHook.ts", import.meta.url), "utf-8");
  ok(/export const HOOK_DIRECTION/.test(th), "★훅 판정이 독립 모듈 — 경로마다 복붙하지 않는다");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 썸네일 훅 연출");
process.exit(fail ? 1 : 0);
