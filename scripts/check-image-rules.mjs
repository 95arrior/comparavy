// 본문/배경 이미지 프롬프트 하드룰 단위 테스트 — AI 콜 없이 순수 함수만 검증.
//   npx tsx scripts/check-image-rules.mjs
import { buildBodyPrompt, buildThumbBgPrompt, IMAGE_HARD_RULES } from "../lib/geminiImage.ts";

let fail = 0;
const must = (cond, label) => { if (!cond) { fail++; console.log(`  !! ${label}`); } else console.log(`  OK ${label}`); };

console.log("본문 이미지 프롬프트 하드룰:");
for (let seed = 0; seed < 40; seed += 7) {
  const p = buildBodyPrompt("동전과 저금통이 놓인 책상", "고유가 지원금 신청", seed).toLowerCase();
  must(/no text of any kind/.test(p), `[seed${seed}] 텍스트 금지 문구`);
  must(/no human faces/.test(p), `[seed${seed}] 얼굴 금지`);
  must(/no close-up of hands/.test(p), `[seed${seed}] 손 클로즈업 금지`);
  must(/no brand logos/.test(p), `[seed${seed}] 브랜드/UI 금지`);
  must(/no front close-up of banknotes/.test(p), `[seed${seed}] 지폐 정면 금지`);
  must(/realistic.*photograph/.test(p), `[seed${seed}] 실사 사진 톤`);
  must(!/\billustration\b/.test(p), `[seed${seed}] 일러스트 아님`);
}

console.log("\n대표이미지 배경 프롬프트:");
for (let seed = 0; seed < 24; seed += 8) {
  const p = buildThumbBgPrompt("soft-gradient", "warm coral, cream", seed).toLowerCase();
  must(/no text of any kind/.test(p), `[seed${seed}] 배경 텍스트 금지`);
  must(/top 35% a clean empty area/.test(p), `[seed${seed}] 상단 여백(합성 자리)`);
  must(/3d abstract objects/.test(p), `[seed${seed}] 말랑한 3D 오브젝트`);
  must(/1:1/.test(p), `[seed${seed}] 1:1`);
}

console.log("\n하드룰 상수 자체:");
must(IMAGE_HARD_RULES.includes("bankbook"), "지폐 대체(bankbook/coins/piggy bank)");
must(/behind or cropped/.test(IMAGE_HARD_RULES), "인물 뒷모습/크롭만");

console.log(fail === 0 ? "\n통과: 이미지 하드룰 전부 강제됨" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
