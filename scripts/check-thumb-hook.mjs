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

  // ★무문구 경로에서는 훅 은유를 뺐다(2026-08-05 3차 규격 — 유저 레퍼런스).
  //  그 규격의 핵심은 '주제의 실물을 정중앙에 크게'인데, 훅은 '답 직전의 순간'을 은유로 그리라고 한다 —
  //  둘을 같이 주면 모델이 아파트 대신 '열리는 뚜껑'을 그린다. ★상충하는 지시는 나쁜 쪽이 이긴다.
  //  ★훅은 문구가 있는 경로가 계속 맡는다(위 withCopy 검사) — 거기선 서사가 먹힌다.
  const textless = buildTextlessThumbPrompt("손해 공포 마감", "u1", 0, null, "오늘 마감되는 청년 지원금");
  ok(!/HOOK = /.test(textless), "★무문구 경로에는 훅 은유를 넣지 않는다(실물 규격과 상충)");
  ok(/Render the actual thing, not a metaphor/i.test(textless), "★대신 '은유 말고 실물'이 최상위 규칙");
  ok(/radial sunburst rays/i.test(textless), "★방사 배경(3차 규격)");
  ok(/one vivid saturated color filling the whole frame/i.test(textless), "★단색 배경은 유지(색만 고채도로)");
  ok(/no night city, no bokeh/i.test(textless), "★야경·보케 배제는 그대로");
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


// ★썸네일 문구 규격 반전(2026-08-06 유저: "글의 제목을 임팩트 있게 팩트만 짧게").
//  종전 규칙은 '제목과 다른 말을 하라'(2026-07-17 역할 분리)였는데,
//  유저가 준 레퍼런스 썸네일이 전부 제목의 핵심을 그대로 쓰고 있었다 — ★실물이 규칙을 이긴다.
{
  const tc = fs.readFileSync(new URL("../app/api/thumb-copy/route.ts", import.meta.url), "utf-8");
  ok(/글 제목의 핵심을 임팩트 있게 압축한 것이다/.test(tc), "★문구는 제목의 핵심을 압축한다");
  ok(/팩트만 담는다/.test(tc), "★팩트만(수식·감상 금지)");
  ok(/윗줄은 '무엇에 대한 글인지'/.test(tc), "★2줄 구조가 명시됐다");
  ok(!/역할 분리\(절대 조항\)/.test(tc), "★'제목 반복 실격' 조항이 폐기됐다");
  ok(!/repeatsTitle\(c,/.test(tc), "★그 게이트도 제거됨(두면 정답이 전멸한다)");
  ok(/cn\.length >= tn\.length \* 0\.75/.test(tc), "★다만 제목 통째 복사는 여전히 실격");
  // ★유저 레퍼런스가 쓰는 말을 우리가 금지하고 있었다
  ok(!/모르면\\s\?손해/.test(tc), "★'모르면 손해'가 금지어에서 빠졌다(레퍼런스가 쓰는 문구)");

  const ir = fs.readFileSync(new URL("../lib/infographicRenderer.ts", import.meta.url), "utf-8");
  // ★데이터 카드 잘림(유저 화면: '생애최초 LTV 80%(최대 4.' 에서 끊김)
  ok(/const longest = Math\.max/.test(ir), "★가장 긴 값을 기준으로 글자 크기를 정한다");
  ok(/satori는 넘친 글자를 조용히 자른다/.test(ir), "왜 재야 하는지가 코드에 적혀 있다");
  ok(/const fsAfter/.test(ir), "★'변경 후' 강조 +4가 잘림의 마지막 한 방이 되지 않게");
}

console.log(fail ? `\n실패 ${fail}건` : "\n통과: 썸네일 훅 연출");
process.exit(fail ? 1 : 0);
