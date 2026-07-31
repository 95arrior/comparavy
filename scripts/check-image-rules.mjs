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

// ★썸네일 배경 글자 혼입(2026-08-01 유저 실측: "썸네일 제작이 잘 안 되네요").
//  원인은 예시 자체였다 — '도장 찍힌 증서', '장부 위의 새싹', '청구서 더미'는 글자가 본질인 물건이다.
//  그래놓고 "종이는 비워라"라고 하면 모델이 모순을 텍스트로 해소한다.
{
  const fs3 = await import("node:fs");
  const bp = fs3.readFileSync(new URL("../lib/bannerPrompts.ts", import.meta.url), "utf-8");
  const cp = fs3.readFileSync(new URL("../lib/composeThumbnail.ts", import.meta.url), "utf-8");
  const t = (c, label) => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "| thumb  |", label); };

  // 기본 예시에 글자 물건이 되살아나면 안 된다
  for (const bad of ["invoice papers", "stamped certificate", "on a ledger", "calendar page"]) {
    t(!bp.includes(bad), `예시에 글자 물건 없음 — ${bad}`);
  }
  // 글자 없는 소재로 바뀌었는지
  t(/oversized key|heavy lock|coin jar/.test(bp), "글자 없는 소재 예시로 교체됨");
  // textSafe 모드가 존재하고 금지 범주를 갖는다
  t(/TEXT_FREE_BAN/.test(bp) && /certificates, contracts, ledgers/.test(bp), "textSafe 금지 범주 정의됨");
  t(/opts\?\.textSafe/.test(bp), "textSafe 옵션이 프롬프트에 반영됨");
  // 재시도가 실제로 붙어 있는가(1회 생성 후 바로 폴백이면 실패)
  t(/textSafe: true/.test(cp), "★썸네일 재시도가 textSafe로 돈다");
  t((cp.match(/verifyImage\(/g) ?? []).length >= 2, "★검증이 2회(1차+재시도) 이상");
}

// ★썸네일 배경 대비(2026-08-01 유저: "클릭하고 싶게" — 실물이 연보라 배경+진보라 글씨였다).
//  ★텍스트는 건드리지 않는다(유저 확정: 폰트·크기·위치는 이미 맞춘 값). 대비는 배경에서만 만든다.
{
  const fs4 = await import("node:fs");
  const bp2 = fs4.readFileSync(new URL("../lib/bannerPrompts.ts", import.meta.url), "utf-8");
  const gi = fs4.readFileSync(new URL("../lib/geminiImage.ts", import.meta.url), "utf-8");
  const wi = fs4.readFileSync(new URL("../lib/wpIllustration.ts", import.meta.url), "utf-8");
  const rd = fs4.readFileSync(new URL("../lib/thumbnailRenderer.ts", import.meta.url), "utf-8");
  const t2 = (c, label) => { if (!c) fail++; console.log(c ? "OK " : "FAIL", "| thumbBg|", label); };

  t2(/THUMB_PALETTES/.test(bp2), "썸네일 전용 진한 팔레트 존재");
  t2(/deep navy|midnight indigo/.test(bp2), "진한 톤 팔레트 값");
  t2(/deepBg: true/.test(gi), "★썸네일 경로는 deepBg로 생성");
  t2(!/deepBg/.test(wi), "본문 삽화는 deepBg 안 씀(파스텔 유지)");
  // 카피가 얹히는 자리를 숫자로 못 박았는지(2026-08-01: '중앙을 비워라'가 약해서 오브젝트가 정중앙에 왔다)
  t2(/BOTTOM 45%/.test(bp2) && /TOP 55% is EMPTY/.test(bp2), "카피 자리를 숫자로 고정(아래 45% / 위 55% 비움)");
  t2(/keep the overall image DARK/.test(bp2), "전체를 어둡게 유지하도록 지시");
  // 텍스트 규격이 배경 작업에 휩쓸려 바뀌지 않았는지(유저 확정값 보호)
  t2(/fontFamily: identity\.fontPair\.title/.test(rd), "제목 폰트 지정 그대로");
  t2(/fontWeight: 900/.test(rd), "제목 굵기 그대로");
}

console.log(fail === 0 ? "\n통과: 이미지 하드룰 전부 강제됨" : `\n실패: ${fail}건`);
process.exit(fail === 0 ? 0 : 1);