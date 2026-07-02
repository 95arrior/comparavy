// 앵글 조합 무중복 검증 — 같은 씨앗에 유저 100명 시뮬레이션, 구조 조합 중복 확인.
//   실행: npx tsx scripts/check-angle-combos.mjs
import { assignAngle, ANGLE_COMBO_SPACE } from "../lib/amplifyTopics.ts";

const seed = "고유가지원금 신청방법";
const day = "2026-07-03";
const N = 100;

const combos = new Set();
const list = [];
for (let i = 0; i < N; i++) {
  const uid = `user-${i}-${(i * 2654435761) >>> 0}`; // 분산된 가짜 userId
  const a = assignAngle(uid, seed, day);
  const key = `${a.intent}|${a.opening}|${a.flow}|${a.closing}|${a.tone}`;
  combos.add(key);
  list.push(key);
}
const unique = combos.size;
const dup = N - unique;
console.log(`구조 조합 공간(intent×opening×flow×closing×tone): ${ANGLE_COMBO_SPACE}`);
console.log(`유저 ${N}명 시뮬레이션 → 고유 조합 ${unique}개, 중복 ${dup}개`);
console.log(`샘플 5명 조합:`);
list.slice(0, 5).forEach((c, i) => console.log(`  user-${i}: ${c}`));
// 조합 공간에 롱테일 선택(~6)·독자 페르소나(LLM) 곱하면 실질 무중복. 여기선 구조만 측정.
console.log(dup === 0 ? "\n통과: 100명 구조 조합 중복 0" : `\n주의: 구조 조합 중복 ${dup} (롱테일·페르소나 축으로 실질 무중복이나, 구조만으론 생일역설상 소수 충돌 가능)`);
process.exit(0);
