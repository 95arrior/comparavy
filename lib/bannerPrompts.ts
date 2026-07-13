// ★키워드 비주얼 배너 프롬프트(2026-07-13 양 채널 공용 승격 — 유저 확정: 상황 묘사 폐기, 주제 키워드를 그린다).
//  실측: 상황(슬롯 설명) 기반 프롬프트는 전부 비슷한 손·소품 클로즈업으로 수렴 — 키워드 히어로 문법이 다양하고 잘 나옴.
//  스타일 4종: stage(글자 없는 무대 — 조판용) / object(오브젝트 히어로) / scene(캐릭터 장면) / typo3d(영문 약어만 — IRP·ISA).

export type BannerStyle = "stage" | "object" | "scene" | "typo3d";

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

const NO_TEXT = "ABSOLUTELY NO other text, letters, numbers or Korean characters anywhere (no labels, captions, watermarks, UI). Blank surfaces on any papers/screens. No brand logos.";

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
// ★기본 소품 금지(2026-07-13 유저 실측: 금고·동전이 전 썸네일에 반복 — 다 똑같아 보이고 중복 위험)
const PROP_BAN = "BANNED default props: safes, vaults, piggy banks, coin stacks, and coins as accents — do NOT use them unless the topic is literally about them (e.g. a savings account article may show ONE piggy element).";
const CAMERA_ANGLES = ["straight-on hero shot", "three-quarter dynamic angle", "gentle top-down view", "slightly low angle looking up"];

export function buildBannerPrompt(topic: string, style: BannerStyle, seed: number, hint?: string): string {
  const palette = BANNER_PALETTES[seed % BANNER_PALETTES.length];
  const hintLine = (hint ?? "").trim() ? `Prop inspiration for THIS slot (nouns only, optional): ${hint!.trim().slice(0, 60)}.` : "";
  const en = englishToken(topic);
  if (style === "typo3d" && en) {
    return [
      `Premium 3D typography hero image for a Korean finance blog: the word "${en}" as giant glossy 3D letters (clay/plastic render, soft studio lighting), standing on a clean pastel stage.`,
      `Surround the letters with 2-3 small TOPIC-SPECIFIC objects (derived from what this topic is about — not generic coins) — objects stay small, the word "${en}" is the hero. ${PROP_BAN}`,
      `Palette: ${palette}. Square 1:1, generous negative space, agency-grade quality (Behance level), NOT clipart.`,
      `The ONLY text allowed in the image is exactly "${en}" — nothing else. ${NO_TEXT.replace("NO other text", "NO additional text")}`,
    ].join(" ");
  }
  if (style === "stage") {
    return [
      `Clean premium 3D pastel stage backdrop for a Korean finance blog banner about "${topic}" (understand only — never render as text).`,
      `Soft rounded podium or floating card shapes at the EDGES only, 2-3 small TOPIC-SPECIFIC objects tucked in corners (derive from the topic — not generic coins/safes) — the CENTER of the frame stays EMPTY and low-detail (large Korean typography will be overlaid there later). ${PROP_BAN}`,
      `Palette: ${palette}. Square 1:1, soft studio lighting, agency-grade (Behance level), NOT clipart.`,
      NO_TEXT,
    ].join(" ");
  }
  if (style === "object") {
    return [
      `Premium graphic banner for a Korean finance blog about "${topic}" (understand only — never render as text).`,
      `ONE oversized hero object derived DIRECTLY from the topic keywords — pick the single most SPECIFIC object that instantly identifies THIS topic (bond/interest topic → a bond certificate with a rising ribbon; brokerage fees → a trading receipt and candlestick sculpture; salary deduction → a salary envelope; housing → a house silhouette). ${PROP_BAN} Camera: ${CAMERA_ANGLES[(seed >> 5) % CAMERA_ANGLES.length]}. Bold gradient background, 1-2 tiny floating accents (sparkles or small geometric shapes — NOT coins). ${hintLine}`,
      `Style: modern fintech campaign art, soft 3D or rich flat with airbrush shading, ${palette}. Square 1:1. Agency-grade, NOT clipart.`,
      NO_TEXT,
    ].join(" ");
  }
  return [
    `Flat vector illustration scene for a Korean finance blog about "${topic}" (understand only — never render as text).`,
    `A charming designed character in this setting: ${SCENE_SETTINGS[(seed >> 4) % SCENE_SETTINGS.length]} — adapted to THIS topic. ONE big symbolic object only, maximum 3 objects total. NEVER default to the desk-monitor-moneybag-chart combo. ${hintLine} ${CHARACTER_SPEC}`,
    `Style: premium editorial flat illustration (Toss/fintech campaign grade), bold color blocking, soft shadows, ${palette}. Square 1:1.`,
    NO_TEXT,
  ].join(" ");
}

/** 본문용 스타일 로테이션 — 영문 약어가 있으면 3D 타이포 포함. seed로 시작점 회전(글 안에서 서로 다른 스타일). */
export function bodyStyleRotation(topic: string): Exclude<BannerStyle, "stage">[] {
  return englishToken(topic) ? ["object", "scene", "typo3d"] : ["object", "scene"];
}

/** ★썸네일 배경 = 카피 은유 극화(2026-07-13 유저 베스트 실측: "연체금만 쌓인다" → 청구서 더미에 깔린 사람).
 *  추상 무대가 아니라 '문구의 감정 포인트'를 연극적으로 그린다. 중앙은 조판 자리로 비움. */
export function buildThumbMetaphorPrompt(topic: string, copyText: string | undefined, seed: number): string {
  const palette = BANNER_PALETTES[seed % BANNER_PALETTES.length];
  const copy = (copyText ?? "").replace(/\n/g, " ").trim();
  return [
    `Premium editorial illustration for a Korean finance blog thumbnail. Topic: "${topic}" (understand only — never render as text).`,
    copy
      ? `THE COPY THIS IMAGE ILLUSTRATES (understand only — never render as Korean text): "${copy}". Extract its ONE emotional point and stage it as a BOLD THEATRICAL VISUAL METAPHOR the reader feels instantly — e.g. unpaid bills piling up → a person buried under giant invoice papers; a deadline → a calendar page burning; starting a business → a young person proudly opening a small shop door with an OPEN sign. The metaphor must clearly belong to THIS topic — never generic finance props.`
      : "Stage ONE bold visual metaphor that instantly says what this topic is about — never generic finance props.",
    "A person MAY appear and often should (people make metaphors emotional). " +
      "CHARACTER SPEC: a DESIGNED flat-vector character — distinct hairstyle, real outfit, expressive posture, head:body about 1:3, minimal face (dot eyes) is fine, never a plain circle-head blob.",
    "COMPOSITION: subjects pushed toward top/bottom/edges — the CENTER band of the frame stays relatively calm and low-detail (large Korean typography will be overlaid dead-center later).",
    `Style: award-winning editorial illustration (fintech campaign grade) — rich color blocking, soft airbrush shading, subtle grain. Palette: ${palette}. Square 1:1.`,
    "Small ENGLISH labels on props are allowed when natural (INVOICE, TAX, OPEN — one or two words max). ABSOLUTELY NO Korean characters, no sentences, no watermarks, no logos, no UI.",
  ].join(" ");
}
