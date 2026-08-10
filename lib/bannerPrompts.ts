// ★키워드 비주얼 배너 프롬프트(2026-07-13 양 채널 공용 승격 — 유저 확정: 상황 묘사 폐기, 주제 키워드를 그린다).
//  실측: 상황(슬롯 설명) 기반 프롬프트는 전부 비슷한 손·소품 클로즈업으로 수렴 — 키워드 히어로 문법이 다양하고 잘 나옴.
//  스타일 4종: stage(글자 없는 무대 — 조판용) / object(오브젝트 히어로) / scene(캐릭터 장면) / typo3d(영문 약어만 — IRP·ISA).

export type BannerStyle = "stage" | "object" | "scene" | "typo3d" | "isometric" | "flatlay";

/** 영문 약어 토큰(3D 타이포 허용 대상) — IRP, ISA, ETF, CMA, DSR, LTV 등. 한글 타이포는 AI가 깨뜨려 금지. */
export function englishToken(text: string): string | null {
  const m = /\b([A-Z]{2,5}[0-9]{0,2})\b/.exec((text || "").toUpperCase());
  return m ? m[1]! : null;
}

export const BANNER_PALETTES = [
  "soft pink and rose gold with cream background",
  "teal and mint with warm yellow accents",
  "vivid blue and sky gradient with coral accents",
  "fresh green gradient with warm gold accents",
  "warm ivory and orange with navy accents",
  "lavender and periwinkle with silver accents",
];

// ★텍스트 규칙 = 주제 인지 함수(2026-07-13 실측 2건: 한글 '국첟' 깨짐 → 영문만 / 예시 나열(ETF·TAX)을 모델이 그대로 베껴 주택 썸네일에 ETF 문서 등장 → 예시 제거·주제 관련만)
// ★무문자 전면 강제(2026-07-29 유저 3회차 지적: "이미지에 한글 쓰지 말라니깐.. 한글 영어 아무것도 쓰지마셈").
//  구 규칙은 '자연스러우면 영어 한 단어 허용'이라는 예외를 뒀는데, 그 틈이 실측 사고 둘을 만들었다:
//  ①허용된 영어 한 단어('YEAR') ②예외를 여는 순간 모델이 한글 타이포까지 그려버림('연만셰금환금' — 깨진 한글).
//  예외를 없앤다. 글자가 필요하면 우리 조판(GmarketSans)이 얹는다 — AI에게 글자를 맡기지 않는다.
function noText(_topic: string): string {
  return "TEXT RULE (absolute, zero exceptions): render NO text of any kind anywhere in the image — no Korean (Hangul), no English, no numbers, no single words, no abbreviations, no signage, no labels, no captions, no watermarks, no logos, no gibberish pseudo-letters. Every paper, screen, sign, box, document and product surface must be completely BLANK, or blurred out of focus. If a real object would normally carry text, render it clean and empty. There is no case where a word is acceptable.";
}

// ★썸네일 배경 전용(2026-07-13 유저: 썸네일엔 영어도 쓰지 마 — 그림으로만. 문구 조판이 위에 얹히므로 배경 글자는 소음)
const NO_TEXT_STRICT = "TEXT RULE (critical): this image must contain ABSOLUTELY NO text of any kind — no words, no letters, no numbers, no labels, no signs, no logos, no watermarks, in ANY language (Korean is strictly forbidden and always breaks; English is also forbidden here). Every paper, screen, sign and surface stays completely blank. Express everything with imagery only.";

// 캐릭터 스펙(2026-07-13 유저: 민무늬 원형 인물 금지) — 헤어·복장·자세가 있는 디자인된 캐릭터
const CHARACTER_SPEC = "CHARACTER SPEC (when a person appears): NOT a plain circle-head blob — a DESIGNED flat-vector character at premium fintech campaign level: distinct hairstyle, real outfit (office shirt/cardigan/suit — colors from the palette), expressive posture and gesture, head:body about 1:3, soft airbrush shading on clothes. Minimal face (dot eyes, tiny smile) is fine, but silhouette and styling must look like a branded illustration character, never a generic stick figure or plain circle person.";

// 장면 무대 로테이션(2026-07-13 유저: 같은 글 1·3번이 동일 소재 — 고정 예시가 수렴의 원인) — 시드로 회전
const SCENE_SETTINGS = [
  "a small storefront being proudly opened (a tiny OPEN sign is fine)",
  "an award stage with a giant trophy and confetti",
  "signing an oversized contract with a big seal stamp",
  "a celebration with colorful confetti falling around the character",
  "climbing giant ascending steps or blocks toward a flag",
  "presenting in front of a huge blank board",
];
// ★기본 소품 금지(2026-07-13 금고·동전 → 2026-07-31 범주 확대).
//  실측: 금고·동전을 막았더니 모델이 '금융 스톡 일러스트' 기본 세트로 갈아탔다 —
//  기둥 있는 은행 건물·돋보기·자물쇠·체크리스트 클립보드·서류 더미가 모든 썸네일 배경에 깔려 전부 같은 그림이 됐다.
//  (유저 실측: "손이랑 돈만 있으면 되는데 주변에 서류·건물·돋보기가 거의 다 배치돼서 다 비슷해 보인다")
//  ★표기를 막으면 모델은 표기를 바꾼다 — 개별 소품이 아니라 '금융 일반 소품'이라는 범주를 막고,
//   주제어에서 도출되는 것만 남긴다(cardFinalGate의 '표기가 아니라 결과를 검사한다'와 같은 결).
const PROP_BAN = "BANNED generic finance props — do NOT include any of these unless the topic is literally about that object: safes, vaults, piggy banks, coin stacks or coins as accents, classical bank buildings with columns, magnifying glasses, padlocks or locks, clipboards or checklists with checkmarks, stacks of documents or paperwork, generic upward arrows, generic bar/line charts, calculators, shield icons, briefcases. EVERY object in the frame must be derivable from the topic phrase itself — if you cannot point to the word in the topic that produced an object, remove it.";
// ★오브젝트 예산(2026-07-31) — 본문 이미지 경로(geminiImage)엔 MAXIMUM 2 하드룰이 있었는데 썸네일 경로에만 없었다.
//  게이트가 한 경로에만 있던 패턴이 여기서도 반복됐다.
const OBJECT_BUDGET = "OBJECT BUDGET (hard limit): at most TWO meaningful objects in the entire frame, counting background elements. If the idea seems to need more, keep only the single most specific one and delete the rest. Empty space beats a filler prop — clutter is what makes every thumbnail look the same.";
const CAMERA_ANGLES = ["straight-on hero shot", "three-quarter dynamic angle", "gentle top-down view", "slightly low angle looking up"];
// ★다양성 축을 소품에서 앵글·스케일로 옮긴다(2026-07-31) — 소품을 더 넣는 건 다양성이 아니라 노이즈다.
//  앵글 4 × 스케일 3 = 12조합이 '같은 소재라도 다른 그림'을 만든다.
const SCALE_VARIANTS = [
  "EXTREME CLOSE-UP — the hero fills almost the whole frame and is cropped by the edges",
  "MID SHOT — the hero sits alone with generous empty space around it",
  "WIDE SHOT — the hero is small inside a vast empty field of the background color",
];

export function buildBannerPrompt(topic: string, style: BannerStyle, seed: number, hint?: string): string {
  const palette = BANNER_PALETTES[seed % BANNER_PALETTES.length];
  const hintLine = (hint ?? "").trim() ? `Prop inspiration for THIS slot (nouns only, optional): ${hint!.trim().slice(0, 60)}.` : "";
  const en = englishToken(topic);
  if (style === "typo3d" && en) {
    return [
      `Premium 3D typography hero image for a Korean finance blog: the word "${en}" as giant glossy 3D letters (clay/plastic render, soft studio lighting), standing on a clean pastel stage.`,
      `Surround the letters with 2-3 small TOPIC-SPECIFIC objects (derived from what this topic is about — not generic coins) — objects stay small, the word "${en}" is the hero. ${PROP_BAN}`,
      `Palette: ${palette}. Square 1:1, generous negative space, agency-grade quality (Behance level), NOT clipart.`,
      `The ONLY text allowed in the image is exactly "${en}" — nothing else. ${noText(topic)}`,
    ].join(" ");
  }
  if (style === "stage") {
    return [
      `Clean premium 3D pastel stage backdrop for a Korean finance blog banner about "${topic}" (understand only — never render as text).`,
      `Soft rounded podium or floating card shapes at the EDGES only, 2-3 small TOPIC-SPECIFIC objects tucked in corners (derive from the topic — not generic coins/safes) — the CENTER of the frame stays EMPTY and low-detail (large Korean typography will be overlaid there later). ${PROP_BAN}`,
      `Palette: ${palette}. Square 1:1, soft studio lighting, agency-grade (Behance level), NOT clipart.`,
      noText(topic),
    ].join(" ");
  }
  if (style === "isometric") {
    return [
      `Cute isometric 3D miniature diorama about "${topic}" (understand only — never render as text): a tiny floating world on a rounded platform — miniature buildings, desks, documents and paths as LANDSCAPE elements derived from this topic, soft clay/plastic render, high-angle view.`,
      `Tiny faceless mini-figures may walk around (no big characters, no faces). ${PROP_BAN} ${hintLine}`,
      `Palette: ${palette}. Square 1:1, soft studio lighting, generous negative space, agency-grade (Behance level), NOT clipart.`,
      noText(topic),
    ].join(" ");
  }
  if (style === "flatlay") {
    return [
      `Top-down knolling flat lay about "${topic}" (understand only — never render as text): 4-6 topic-specific objects neatly arranged on a soft pastel surface, perfectly organized grid feel, soft shadows, paper-craft or matte 3D render.`,
      `NO people. Objects must be derived from what THIS topic is about. ${PROP_BAN} ${hintLine}`,
      `Palette: ${palette}. Square 1:1, agency-grade (Behance level), NOT clipart.`,
      noText(topic),
    ].join(" ");
  }
  if (style === "object") {
    return [
      `Premium graphic banner for a Korean finance blog about "${topic}" (understand only — never render as text).`,
      `ONE oversized hero object derived DIRECTLY from the topic keywords — pick the single most SPECIFIC object that instantly identifies THIS topic (bond/interest topic → a bond certificate with a rising ribbon; brokerage fees → a trading receipt and candlestick sculpture; salary deduction → a salary envelope; housing → a house silhouette). ${PROP_BAN} Camera: ${CAMERA_ANGLES[(seed >> 5) % CAMERA_ANGLES.length]}. Bold gradient background, 1-2 tiny floating accents (sparkles or small geometric shapes — NOT coins). ${hintLine}`,
      `Style: modern fintech campaign art, soft 3D or rich flat with airbrush shading, ${palette}. Square 1:1. Agency-grade, NOT clipart.`,
      noText(topic),
    ].join(" ");
  }
  return [
    `Flat vector illustration scene for a Korean finance blog about "${topic}" (understand only — never render as text).`,
    `A charming designed character in this setting: ${SCENE_SETTINGS[(seed >> 4) % SCENE_SETTINGS.length]} — adapted to THIS topic. ONE big symbolic object only, maximum 3 objects total. NEVER default to the desk-monitor-moneybag-chart combo. ${hintLine} ${CHARACTER_SPEC}`,
    `Style: premium editorial flat illustration (Toss/fintech campaign grade), bold color blocking, soft shadows, ${palette}. Square 1:1.`,
    noText(topic),
  ].join(" ");
}

/** 본문용 스타일 로테이션 — 영문 약어가 있으면 3D 타이포 포함. seed로 시작점 회전(글 안에서 서로 다른 스타일). */
export function bodyStyleRotation(_topic: string): Exclude<BannerStyle, "stage">[] {
  // ★풀 확장(2026-07-13 실측: 약어 없는 주제는 풀 2종 → 슬롯 1·3이 같은 스타일로 떨어져 'LOAN 남자' 판박이) — 3슬롯까지 무조건 서로 다른 스타일
  // ★typo3d 전면 퇴출(2026-07-29 유저: 이미지에 글자 금지) — 글자 자체가 히어로인 스타일이라 무문자 규칙과 양립 불가.
  //  본문 배너 경로는 이미 걸러내고 있었지만(wpIllustration:23) 썸네일 경로(geminiImage:294)는 그대로 쓰고 있었다.
  return ["object", "scene", "isometric", "flatlay"];
}

/** ★썸네일 배경 = 카피 은유 극화(2026-07-13 유저 베스트 실측: "연체금만 쌓인다" → 청구서 더미에 깔린 사람).
 *  추상 무대가 아니라 '문구의 감정 포인트'를 연극적으로 그린다. 중앙은 조판 자리로 비움. */
// ★글자 없는 소재로만 가는 모드(2026-08-01 유저 실측: "썸네일 제작이 잘 안 되네요").
//  원인은 예시 자체였다 — '도장 찍힌 증서', '장부 위의 새싹', '청구서 더미'는 글자가 본질인 물건이다.
//  그래놓고 "종이는 비워라"라고 하면 모델이 모순을 텍스트로 해소한다(실측: 배경 글자 혼입으로 폴백).
//  재시도는 그 범주를 통째로 빼고, 글자가 존재할 수 없는 소재로만 은유를 만든다.
const TEXT_FREE_BAN =
  "FORBIDDEN OBJECT CATEGORIES (they inherently carry text — do not include them at all, not even blank): " +
  "documents, papers, invoices, bills, certificates, contracts, ledgers, notebooks, books, newspapers, calendars, " +
  "receipts, envelopes, forms, screens, phones, monitors, dashboards, charts with labels, signs, boards, packaging, labels, tickets, cards.";
const TEXT_FREE_SUBJECTS =
  "Build the metaphor ONLY from objects that cannot carry text: coins, keys, locks, safes/vaults, piggy banks, scales/balances, " +
  "sprouts and plants, water and pouring, stairs and ladders, doors and gates, bridges, umbrellas, hourglasses (no numerals), " +
  "gears, ropes and knots, building blocks, jars and containers, hands holding these objects, weather and light.";

// ★썸네일 전용 진한 팔레트(2026-08-01 유저 실측: "클릭하고 싶게" — 실물이 연보라 배경+진보라 글씨라 안 읽혔다).
//  본문 삽화는 글자를 얹지 않으니 파스텔이 맞지만, 썸네일은 대형 카피가 중앙에 올라간다.
//  ★텍스트는 건드리지 않는다(유저 확정: 폰트·크기·위치는 이미 맞춰 놓은 값) — 배경을 진하게 눌러
//   렌더러의 밝기 판정(isDark)이 흰 글씨를 고르게 만든다. 대비는 배경 쪽에서만 만든다.
//  메이트 감성(비비드 블루 그라데이션)을 축으로 두고 회전한다.
const THUMB_PALETTES = [
  "deep navy to royal blue gradient with vivid cyan rim light",
  "midnight indigo with electric blue glow and one warm amber accent",
  "deep teal to dark forest green with gold rim light",
  "dark plum to deep violet with a hot pink accent glow",
  "charcoal navy with a vivid orange accent light",
  "deep ocean blue with turquoise highlights and soft haze",
];

import { thumbHookOf, HOOK_DIRECTION } from "./thumbHook";

export function buildThumbMetaphorPrompt(topic: string, copyText: string | undefined, seed: number, opts?: { textSafe?: boolean; deepBg?: boolean }): string {
  const palette = opts?.deepBg ? THUMB_PALETTES[seed % THUMB_PALETTES.length] : BANNER_PALETTES[seed % BANNER_PALETTES.length];
  const copy = (copyText ?? "").replace(/\n/g, " ").trim();
  // ★구도 로테이션(2026-07-13 유저: 사람이 너무 많다, 키워드를 의미하는 이미지로) — 기본=키워드 오브젝트 히어로, 인물 장면은 4회 중 1회만
  const mode = seed % 4;
  const copyLine = copy
    ? `THE COPY THIS IMAGE ILLUSTRATES (understand only — never render as text): "${copy}". Extract its ONE emotional point and let it shape the mood and drama of the visual.`
    : "";
  const subject =
    mode === 3
      ? `Stage the topic as ONE bold theatrical metaphor WITH a person — e.g. mounting costs → a person straining under a huge stack of coins; a deadline → a person racing a giant hourglass. CHARACTER SPEC: a DESIGNED flat-vector character — distinct hairstyle, real outfit, expressive posture, head:body about 1:3, minimal face (dot eyes) fine, never a plain circle-head blob.`
      : mode === 2
        ? `ONE isometric miniature vignette: a SINGLE topic-derived object or place rendered as a small 3D diorama on a rounded platform. One subject only — not a world of props, no scattered buildings or paperwork around it. ${PROP_BAN}`
        : `ONE oversized HERO OBJECT derived DIRECTLY from the topic keywords — pick the single most SPECIFIC object that instantly identifies THIS topic (housing → a house with an oversized key; loan → a giant key turning in a heavy lock; savings → a sprout growing out of a coin jar). NO people.`;
  const textSafe = opts?.textSafe === true;
  // ★훅 연출이 주제보다 앞선다(2026-08-05 유저 확정: "키워드에 맞는 일러스트가 나오면 안 된다").
  //  주제는 '무엇을 그릴지'를 정하고, 훅은 '어떤 순간을 그릴지'를 정한다 — 클릭을 만드는 쪽은 후자다.
  const hook = HOOK_DIRECTION[thumbHookOf(`${copy} ${topic}`)];
  return [
    `Premium editorial illustration for a Korean finance blog thumbnail. Topic: "${topic}" (understand only — never render as text).`,
    `CORE RULE (overrides everything below): do NOT illustrate the keyword itself. Illustrate the MOMENT JUST BEFORE THE ANSWER — a resolved scene leaves nothing to wonder about and the thumb scrolls past. Leave exactly one unanswered question that only the article can close.`,
    hook,
    copyLine,
    textSafe ? `ONE oversized HERO OBJECT derived from the topic. NO people. ${TEXT_FREE_SUBJECTS}` : subject,
    textSafe ? TEXT_FREE_BAN : "",
    "The visual must clearly belong to THIS topic — never generic finance props.",
    // ★각도 고유성(2026-07-19 유저: 같은 ETF여도 추천글·설명글은 완전히 다른 그림이어야 한다)
    "ANGLE-UNIQUE RULE: the topic phrase is a specific article ANGLE, not a category. Two articles about the same product (an ETF recommendation list vs an ETF tax guide vs a beginner walkthrough) must produce visibly DIFFERENT scenes — anchor the visual in this phrase's distinctive words (the action, the situation, the outcome), never in the category noun alone.",
    PROP_BAN, // ★모드별로 붙이지 않는다 — 실측: 인물 장면(mode 3)에만 빠져 있었다
    OBJECT_BUDGET,
    `FRAMING: ${CAMERA_ANGLES[seed % CAMERA_ANGLES.length]}, ${SCALE_VARIANTS[(seed >> 2) % SCALE_VARIANTS.length]}.`,
    "COMPOSITION: subjects pushed toward the top and edges — the LOWER-LEFT area of the frame stays relatively calm and low-detail (large Korean typography will be overlaid on the lower-left later).",
    opts?.deepBg
      ? "CONTRAST (critical — this image is a thumbnail seen small in a mobile feed): keep the overall image DARK and richly saturated so white type overlaid on the lower half reads instantly. Push light and glow to the upper edges as rim light. Avoid pastel, washed-out, or high-key looks entirely."
      : ""
    ,
    opts?.deepBg
      // ★구도 강제(2026-08-01 실측): '히어로 오브젝트'와 '비워라'가 충돌해 모델이 오브젝트를 정중앙에 크게 놓았고,
      //  카피가 그대로 겹쳤다. 자리를 숫자로 못 박는다. ★상하 반전(2026-08-11 유저: 문구=하단 좌측+그라데이션,
      //  이미지가 가려져 클릭률 저조) — 히어로가 위, 헤드라인 자리가 아래로 바뀌었다.
      ? "LAYOUT (hard requirement): the hero object sits in the TOP 55% of the square, clearly visible. The BOTTOM 45% stays CALM and dark — low detail, no bright object, no highlight (a dark gradient and a left-aligned Korean headline will be overlaid on the lower-left later). Nothing important may sit in the bottom half."
      : "",
    `Style: award-winning editorial illustration (fintech campaign grade) — rich color blocking, soft airbrush shading, subtle grain. Palette: ${palette}. Square 1:1.`,
    NO_TEXT_STRICT,
  ].filter(Boolean).join(" ");
}
