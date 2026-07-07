// Gemini 이미지 생성(REST) — 서버 전용. GEMINI_API_KEY 없으면 ready=false.
// ★파이프라인 최종: 본문=실사 사진 톤(텍스트 전면 금지), 대표이미지=AI 배경만(한글은 코드 합성).
//  하드 규칙은 buildBodyPrompt/buildThumbBgPrompt 두 순수 함수에 코드로 강제(단위 테스트 대상).

const MODEL = "gemini-2.5-flash-image";

export function imageReady(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY); // 어느 프로바이더든 키 하나면 가동
}

// ★하드 규칙(모든 프롬프트에 강제) — 텍스트·얼굴·손클로즈업·브랜드/UI·지폐정면 금지.
export const IMAGE_HARD_RULES = [
  "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters (Hangul), signs, labels, captions, watermarks, logos, or UI text anywhere.",
  "NEVER reproduce a real branded product's identifiable design (specific car models, phones, devices): depict a GENERIC unbranded version of that object category instead — no brand logos, no signature grilles/shapes that identify a specific model. (Design-right safety — 실존 제품 디자인 재현 금지)",
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
  return seed % 10 < 7 ? "photo" : "toss"; // ★애매하면 실사 70%(실측: 3D 비중 과다 판정)
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
      `Scene to capture: ${slotDesc}.`,
      // ★빈 화면 함정(실측: '신청 화면·서류 체크리스트' 슬롯 → 빈 노트북+백지 클로즈업 = 정보성 제로) —
      //  텍스트 금지 규칙과 충돌하는 화면·문서류는 주피사체로 쓰지 않는다. 대신 그 '상황'을 주제 실물로.
      "CRITICAL: screens, documents, forms and papers must NEVER be the focal point of the frame (they are required to be blank, so a close-up of them looks empty and useless). If the scene mentions a screen/form/checklist, reinterpret it: show the real-life SITUATION around that task instead, keeping any screen/paper small, angled away, or out of focus in the background.",
      `Prefer a candid documentary moment of a real person DOING the activity (hands close-up, back view, or over-the-shoulder — face never visible), like an editorial photo taken by the blog author. Include at least 2 physical objects that are UNIQUELY specific to the topic above (e.g., housing topic → door keys, moving boxes, apartment window view; car topic → car interior, charging cable). NEVER generic clichés: NO piggy banks, NO coin stacks, NO generic calculators, NO lightbulbs — unless the topic is literally about them.`,
      `${tone}, ${compo}, ${mood} mood. Natural realistic photography, true-to-life textures and materials, tasteful depth of field, high-end magazine quality. Wide horizontal 16:9 composition.`,
      IMAGE_HARD_RULES,
    ].join(" ");
  }
  const tone = TOSS_TONES[seed % TOSS_TONES.length];
  return [
    `Soft matte 3D illustration in the style of a premium Korean fintech app (Toss) event card. Topic context (for understanding only — never render as text): ${articleTitle}.`,
    `Depict EXACTLY this: ${slotDesc}. Choose 2-4 distinct objects that are explicitly mentioned in, or uniquely specific to, that description — ${["show the tools/items used for it", "show the place or setting where it happens", "show the end result or benefit of it", "show the items being compared side by side"][seed % 4]}.`,
    "NEVER use generic clichés: NO piggy banks, NO plain coin stacks, NO generic calculators, NO lightbulbs — unless that exact object is in the description.",
    `Color: ${tone}, on a clean single-color light background. ${compo}, ${mood} mood. Tactile smooth clay material, soft studio lighting, gentle shadows, no clutter. Playful but premium. Wide horizontal 16:9 composition.`,
    IMAGE_HARD_RULES,
  ].join(" ");
}

/** 대표이미지 AI 배경 프롬프트(순수 함수) — ★주제 인식(실측 비교 판정: 추상 blob은 짜침, 주제 오브젝트가 정답).
 *  topic이 있으면 그 주제를 나타내는 구체 오브젝트(차·동전·달력 등), 없으면 기존 추상. 텍스트 절대 금지 + 상단 여백. */
export function buildThumbBgPrompt(bgStyleHint: string, paletteHint: string, seed: number, topic?: string): string {
  const mood = PHOTO_MOODS[seed % PHOTO_MOODS.length];
  const subject = topic && topic.trim()
    ? `Cute rounded clay-like 3D objects that clearly represent this topic (understand only — never render as text): "${topic.trim()}". Pick 2-4 real objects uniquely specific to this exact topic — NEVER generic clichés (NO piggy banks, NO plain coin stacks, NO generic calculators) unless the topic is literally about them.`
    : `Soft matte 3D abstract objects (rounded blobs, spheres, gentle geometric forms).`;
  return [
    `${subject} Floating on a solid single-color background, color palette of ${paletteHint}.`,
    `Playful premium 3D render like a Toss/Danggeun event card illustration. Objects arranged in the LOWER two-thirds — keep the TOP 35% a clean empty area (text goes there later).`,
    `${mood} mood, soft studio lighting, tactile clay-like material, no busy clutter. Square 1:1 composition.`,
    "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters, signs, labels, captions, watermarks, or logos anywhere.",
  ].join(" ");
}
/** 실사 배경(썸네일) — 주제 씬 사진. center=true면 중앙 저디테일(정중앙 텍스트용), 아니면 상단 여백형. */
export function buildThumbPhotoBgPrompt(topic: string, seed: number, center = false): string {
  const tone = PHOTO_TONES[seed % PHOTO_TONES.length];
  return [
    `Realistic lifestyle photograph representing this topic (understand only — never render as text): "${topic.trim()}".`,
    center
      ? `Subjects arranged toward the edges/corners; the CENTER of the frame must stay calm and low-detail (soft bokeh, plain surface, gentle gradient of the scene) — large Korean text will be overlaid dead-center later. Slightly dark or muted overall so white/graphic text pops.`
      : `Main subject small and placed in the LOWER two-thirds; the TOP 35% must be a calm, low-detail area (sky, wall, soft bokeh) for text overlay later.`,
    `${tone}, muted and calm, shallow depth of field, premium magazine quality. Square 1:1 composition.`,
    "ABSOLUTELY NO text of any kind: no letters, numbers, Korean characters, signs, labels, captions, watermarks, or logos anywhere.",
  ].join(" ");
}

// ★프로바이더 스위치(유저 결정: GPT 품질 우위) — OPENAI_API_KEY 있으면 gpt-image-1, 없으면 Gemini 폴백.
//  원가: gpt-image-1 medium 1024²≈$0.04(~60원) — IMAGE_COST 6cr(300~400원) 마진 유지. 실패 시 상호 폴백.
async function callOpenAIImage(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("NOT_READY");
  const size = aspectRatio === "16:9" ? "1536x1024" : "1024x1024";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: prompt.slice(0, 4000), size, quality: "medium", n: 1 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message ?? `OpenAI ${res.status}`;
    const quota = res.status === 429 || /quota|billing|rate/i.test(msg);
    throw new Error(quota ? "QUOTA" : msg);
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (b64) return { base64: b64, mime: "image/png" };
  throw new Error("이미지가 생성되지 않았어요.");
}

async function callImage(prompt: string, aspectRatio: "16:9" | "1:1"): Promise<{ base64: string; mime: string; provider: string }> {
  const prefer = process.env.IMAGE_PROVIDER === "gemini" ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "gemini";
  if (prefer === "openai") {
    try { return { ...(await callOpenAIImage(prompt, aspectRatio)), provider: "gpt-image-1" }; }
    catch (e) {
      console.error("[image] openai 실패 → gemini 폴백:", String(e).slice(0, 300)); // 조용한 폴백 금지 — 원인 로그
      if (process.env.GEMINI_API_KEY && !/QUOTA/.test(String(e))) return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini(폴백)" };
      throw e;
    }
  }
  return { ...(await callGemini(prompt, aspectRatio)), provider: "gemini" };
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
export async function generateBlogImage(slotDesc: string, articleTitle: string, userSeed?: string, _opts?: { thumbnail?: boolean }): Promise<{ base64: string; mime: string; provider?: string }> {
  // 장마다 변주 — 만 명이 써도, 한 명이 백 장을 만들어도 겹치지 않게.
  const seed = (fnv((userSeed ?? "") + ":") + Math.floor(Math.random() * 1e9)) >>> 0;
  return callImage(buildBodyPrompt(slotDesc, articleTitle, seed), "16:9");
}

/** 대표이미지 AI 배경 1장(1:1, base64) — 한글은 코드(satori)가 합성. 실패는 호출측이 코드 폴백. */
export async function generateThumbBackground(bgStyleHint: string, paletteHint: string, userSeed?: string, topic?: string, opts?: { forceStyle?: "photo" | "toss"; centerText?: boolean }): Promise<{ base64: string; mime: string }> {
  const seed = (fnv((userSeed ?? "") + ":bg") + Math.floor(Math.random() * 1e9)) >>> 0;
  // ★스타일: 강제 지정(썸네일 메이커=실사 기본) > 주제 자동(구체 씬=실사)
  const style = opts?.forceStyle ?? (topic ? pickImageStyle(topic, seed) : "toss");
  const prompt = style === "photo" && topic ? buildThumbPhotoBgPrompt(topic, seed, opts?.centerText === true) : buildThumbBgPrompt(bgStyleHint, paletteHint, seed, topic);
  return callImage(prompt, "1:1");
}

export const GEMINI_IMAGE_MODEL = MODEL;
