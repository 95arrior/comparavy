// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★파이프라인 최종: 본문=실사 사진 톤(텍스트 전면 금지), 대표이미지=AI 배경만(한글은 코드 합성).
//  하드 규칙은 buildBodyPrompt/buildThumbBgPrompt 두 순수 함수에 코드로 강제(단위 테스트 대상).

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

// ★하드 규칙(모든 프롬프트에 강제) — 텍스트·얼굴·손클로즈업·브랜드/UI·지폐정면 금지.
export const IMAGE_HARD_RULES = [
  "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters (Hangul), signs, labels, captions, watermarks, logos, or UI text anywhere.",
  "Any screen, sign, book, paper, or package in the scene must be completely blank.",
  "NO human faces — if a person appears, only from behind or cropped below the face, never showing facial features.",
  "NO close-up of hands.",
  "NO brand logos and NO app or phone UI screens.",
  "NO front close-up of banknotes, cash, or bills — use a bankbook, coins, a piggy bank, or a plain blank card instead.",
].join(" ");

function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// ── 본문 이미지: 실사 사진 톤 다양성 ──
// ★토스톤 팔레트 회전(개념·수치·비교용) + 실사 톤 회전(실제 씬용) — 혼합 정책(유저 결정 2026-07-05)
const TOSS_TONES = [
  "vivid blue (#3182F6) primary with soft sky-blue pastels",
  "vivid blue accent with warm coral pastel touches",
  "vivid blue accent with fresh mint pastel touches",
  "vivid blue accent with soft lavender pastel touches",
  "vivid blue accent with gentle amber pastel touches",
];
const PHOTO_TONES = [
  "warm natural window light, soft film-like tones",
  "clean minimal desaturated studio light",
  "bright morning sunlight, airy and fresh",
  "low-saturation pastel daylight",
  "soft overcast diffused light",
];
// 슬롯 설명 성격 분기 — 실제 씬(장소·물건·현장) vs 개념(비교·절차·수치). 애매하면 시드 랜덤.
const CONCRETE_RE = /전경|모습|현장|매장|가게|음식|요리|거리|풍경|장소|건물|실내|외관|제품|실물|기기|착용|모음|재료|간판|메뉴|차량|도로|공원|바다|산|숙소|객실|사람|손|책상|주방|화면을 보는/;
const ABSTRACT_RE = /비교|정리|요약|절차|단계|순서|구성|개념|금액|비용|수익|금리|계산|조건|장단점|체크리스트|일정|통계|그래프|표|자료|아이콘|상징/;
export function pickImageStyle(slotDesc: string, seed: number): "photo" | "toss" {
  const c = CONCRETE_RE.test(slotDesc), a = ABSTRACT_RE.test(slotDesc);
  if (c && !a) return "photo";
  if (a && !c) return "toss";
  return seed % 2 === 0 ? "photo" : "toss";
}
const PHOTO_COMPOS = [
  "subject centered with generous negative space",
  "subject on the left third, airy background",
  "gentle top-down flat-lay arrangement",
  "shallow depth of field, close but not macro",
  "wide calm scene with the object small in frame",
  "diagonal arrangement with soft natural shadow",
];
const PHOTO_MOODS = ["calm and tidy", "warm and inviting", "fresh and clean", "quiet and refined", "cozy everyday"];

/** 본문 이미지 프롬프트(순수 함수) — ★혼합 정책(유저 결정): 실제 씬=실사 / 개념·수치=토스톤 3D / 애매=시드 랜덤. 테스트 대상. */
export function buildBodyPrompt(slotDesc: string, articleTitle: string, seed: number): string {
  const compo = PHOTO_COMPOS[(seed >> 3) % PHOTO_COMPOS.length];
  const mood = PHOTO_MOODS[(seed >> 7) % PHOTO_MOODS.length];
  if (pickImageStyle(slotDesc, seed) === "photo") {
    const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
    return [
      `Realistic lifestyle photograph for a Korean blog post. Topic context (for understanding only — never render as text): ${articleTitle}.`,
      `Faithfully photograph this specific scene with clearly recognizable real objects: ${slotDesc}.`,
      `${tone}, ${compo}, ${mood} mood. Natural realistic photography, true-to-life textures and materials, tasteful depth of field, high-end magazine quality. Wide horizontal 16:9 composition.`,
      IMAGE_HARD_RULES,
    ].join(" ");
  }
  const tone = TOSS_TONES[seed % TOSS_TONES.length];
  return [
    `Soft matte 3D illustration in the style of a premium Korean fintech app (Toss) event card. Topic context (for understanding only — never render as text): ${articleTitle}.`,
    `Depict this concept as cute rounded clay-like 3D objects that are instantly recognizable: ${slotDesc}.`,
    `Color: ${tone}, on a clean single-color light background. ${compo}, ${mood} mood. Tactile smooth clay material, soft studio lighting, gentle shadows, no clutter. Playful but premium. Wide horizontal 16:9 composition.`,
    IMAGE_HARD_RULES,
  ].join(" ");
}

/** 대표이미지 AI 배경 프롬프트(순수 함수) — 텍스트 절대 금지 + 저대비 여백(코드가 한글 합성). 테스트 대상. */
export function buildThumbBgPrompt(bgStyleHint: string, paletteHint: string, seed: number): string {
  const mood = PHOTO_MOODS[seed % PHOTO_MOODS.length];
  return [
    `Soft matte 3D abstract objects (rounded blobs, spheres, gentle geometric forms) floating on a solid single-color background, color palette of ${paletteHint}.`,
    `Playful premium 3D render like a Toss/Danggeun event card illustration. Objects clustered in the LOWER portion — keep the TOP 35% a clean empty area (text goes there later).`,
    `${mood} mood, soft studio lighting, tactile clay-like material, no busy clutter. Square 1:1 composition.`,
    "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters, signs, labels, captions, watermarks, or logos anywhere.",
  ].join(" ");
}

async function callGemini(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { imageConfig: { aspectRatio } } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `Gemini ${res.status}`;
    const quota = res.status === 429 || /quota|billing|exhausted/i.test(msg);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) if (p.inlineData?.data) return { base64: p.inlineData.data, mime: p.inlineData.mimeType ?? "image/png" };
  throw new Error("이미지가 생성되지 않았어요.");
}

/** 본문 이미지 1장(실사, base64). userSeed로 계정 축 + 요청 난수 변주. 실패 시 throw. */
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string, _opts?: { thumbnail?: boolean }): Promise<{ base64: string; mime: string }> {
  // 장마다 변주 — 만 명이 써도, 한 명이 백 장을 만들어도 겹치지 않게.
  const seed = (fnv((userSeed ?? "") + ":") + Math.floor(Math.random() * 1e9)) >>> 0;
  return callGemini(buildBodyPrompt(slotDesc, articleTitle, seed), "16:9");
}

/** 대표이미지 AI 배경 1장(1:1, base64) — 한글은 코드(satori)가 합성. 실패는 호출측이 코드 폴백. */
export async function generateThumbBackground(bgStyleHint: string, paletteHint: string, userSeed?: string): Promise<{ base64: string; mime: string }> {
  const seed = (fnv((userSeed ?? "") + ":bg") + Math.floor(Math.random() * 1e9)) >>> 0;
  return callGemini(buildThumbBgPrompt(bgStyleHint, paletteHint, seed), "1:1");
}

export const GEMINI_IMAGE_MODEL = MODEL;
