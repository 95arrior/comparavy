// 본문/배경 이미지 프롬프트 하드룰 단위 테스트 — AI 콜 없이 순수 함수만 검증.
//   npx tsx scripts/check-image-rules.mjs
import { buildBodyPrompt, buildThumbBgPrompt, IMAGE_HARD_RULES } from "../lib/geminiImage.ts";
import { buildThumbMetaphorPrompt } from "../lib/bannerPrompts.ts";
import { verdictFromRaw } from "../lib/imageVerify.ts";

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
  // ★2026-07-31 수리: 실사·토스이모지 계약을 검사하고 있었는데 2026-07-09(e6d8318)에 아테플로 플랫 벡터로
  //  전면 교체됐다. 그 뒤로 이 두 줄이 매번 실패해 스위트가 계속 빨간불이었다 — 죽은 계약을 검사하는 테스트는
  //  없느니만 못하다(진짜 실패를 가린다). 현재 계약(플랫 벡터 단일 스타일)으로 맞춘다.
  must(/premium editorial illustration/.test(p), `[seed${seed}] 스타일 지정(아테플로 플랫 벡터 일러스트)`);
  must(!/realistic lifestyle photograph/.test(p) && !/3d emoji/.test(p), `[seed${seed}] 스타일 순수성(폐기된 실사·이모지 혼입 금지)`);
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

// ★썸네일 소품 과잉(2026-07-31 유저 실측: "손이랑 돈만 있으면 되는데 서류·건물·돋보기가 다 배치돼서 다 비슷해 보인다").
//  2026-07-13에 금고·동전을 막았더니 모델이 다른 기본 소품 세트로 갈아탔다 — 개별 표기가 아니라 범주를 막아야 한다.
console.log("\n썸네일 은유 프롬프트 — 소품 예산·기본 소품 금지:");
{
  const BANNED = ["magnifying glass", "padlock", "clipboard", "classical bank building", "stacks of documents", "piggy bank", "calculator", "shield icon", "briefcase"];
  const seen = new Set();
  for (let seed = 0; seed < 24; seed++) {
    const p = buildThumbMetaphorPrompt("정기예금 특판 찾는 법", "160만원 손에 쥔다", seed);
    const low = p.toLowerCase();
    must(/object budget \(hard limit\): at most two/.test(low), `[seed${seed}] 오브젝트 예산 2개 상한`);
    must(/banned generic finance props/.test(low), `[seed${seed}] 기본 소품 금지`);
    for (const b of BANNED) must(low.includes(b.toLowerCase()), `[seed${seed}] 금지 목록에 '${b}' 포함`);
    must(/framing:/.test(low), `[seed${seed}] 앵글·스케일 변주 지정`);
    // ★모드 2가 소품 나열을 요구하지 않는지 — 진범이었던 문장
    must(!/miniature buildings, documents, objects as landscape/.test(low), `[seed${seed}] 잡동사니 요구 문장 제거됨`);
    const m = low.match(/framing: ([^.]+)\./);
    if (m) seen.add(m[1]);
  }
  // 다양성 축이 실제로 회전하는지 — 소품이 아니라 앵글·스케일로 갈린다
  must(seen.size >= 8, `앵글×스케일 조합이 ${seen.size}종 회전(8종 이상 기대)`);
}


// ★글자 검증 fail-closed(2026-07-31 4회차 사고: 썸네일 배경에 한글 '은행'이 박힌 카드가 그대로 나갔다).
//  통과시킨 경로가 하나가 아니라 넷이었고 전부 '조용히 통과'였다 —
//  API 오류 / JSON 파싱 실패 / 필드 누락 / press 모드 검증 스킵.
//  배경·배너는 떨어져도 코드 폴백이 있으므로 판정 불가는 불합격으로 본다.
console.log("\n이미지 글자 검증 — 판정 불가는 불합격(strict):");
{
  const strict = { bgOnly: true, strict: true };
  const loose = { bgOnly: true };
  // 정상 응답은 양쪽 동일
  must(verdictFromRaw('{"hasText":true}', strict).hasText === true, "글자 있음 → 검출");
  must(verdictFromRaw('{"hasText":false}', strict).hasText === false, "글자 없음 → 통과");
  // ★판정 불가 3종 — strict면 전부 불합격
  must(verdictFromRaw("응답이 JSON이 아님", strict).hasText === true, "JSON 없음 → 불합격(strict)");
  must(verdictFromRaw("{깨진 json", strict).hasText === true, "파싱 실패 → 불합격(strict)");
  must(verdictFromRaw("{}", strict).hasText === true, "hasText 필드 누락 → 불합격(strict) ★2번 사고 경로");
  must(verdictFromRaw('{"where":"카드 위"}', strict).hasText === true, "다른 필드만 있음 → 불합격(strict)");
  // strict가 아니면 종전대로 통과(대안 없는 경로 보호)
  must(verdictFromRaw("{}", loose).hasText === false, "strict 아니면 종전대로 통과");
  // 빈 객체를 '글자 없음'으로 읽지 않는다
  must(verdictFromRaw("{}", strict).ok === false, "빈 객체를 '글자 없음'으로 읽지 않음");
}

console.log(fail === 0 ? "\n통과: 이미지 하드룰 전부 강제됨" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);